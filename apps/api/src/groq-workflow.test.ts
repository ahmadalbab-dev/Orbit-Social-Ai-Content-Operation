import { afterEach, describe, expect, it, vi } from "vitest";
import { GROQ_CHAT_ENDPOINT, HF_IMAGE_ENDPOINT } from "@sma/ai";
import { WorkflowService } from "./workflow.service";
import { VideoAiService } from "./video-ai.service";
import { ImageAiService } from "./image-ai.service";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
const identity={sub:"subject",userId:"user",workspaceId:"workspace",role:"OWNER"};
const variants=[{platform:"facebook",copy:"Test caption",hashtags:[],callToAction:"Your idea?"}];
function setup(count=1){
  vi.stubEnv("AI_TEXT_PROVIDER","groq");vi.stubEnv("GROQ_API_KEY","gsk_fixture");
  vi.stubEnv("HF_TOKEN","");
  const aiQuota={upsert:vi.fn(),updateMany:vi.fn().mockResolvedValue({count})};
  const contentItem={create:vi.fn().mockImplementation(async({data})=>({...data,id:"draft",revision:1,status:"DRAFT",updatedAt:new Date()}))};
  const db={aiQuota,contentItem,brand:{findFirst:vi.fn().mockResolvedValue({id:"brand",name:"Orbit",voice:"Clear",audience:"Creators",guidelines:{}})},workspace:{findUniqueOrThrow:vi.fn().mockResolvedValue({monthlyAiBudgetUsd:10})},aiUsage:{findUnique:vi.fn().mockResolvedValue(null),aggregate:vi.fn().mockResolvedValue({_sum:{estimatedCostUsd:0}}),upsert:vi.fn()}} as unknown as DatabaseService;
  const billing={requirePaidAccess:vi.fn()} as unknown as BillingService;
  const image=new ImageAiService(db,billing);
  return {db,billing,aiQuota,contentItem,image};
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("Groq server selection with shared workspace controls",()=>{
  it("keeps HF image editing on its own key and endpoint while Groq is selected",async()=>{
    const ctx=setup();vi.stubEnv("HF_TOKEN","hf_retained_for_images");vi.stubEnv("AI_IMAGE_PROVIDER","huggingface");
    const png=Buffer.from([137,80,78,71,13,10,26,10,0]);
    const fetcher=vi.fn()
      .mockResolvedValueOnce(Response.json({request_id:"fixture-id",status:"COMPLETED"}))
      .mockResolvedValueOnce(Response.json({images:[{url:"https://fal.media/fixture.png"}]}))
      .mockResolvedValueOnce(new Response(png,{headers:{"Content-Type":"image/png"}}));
    vi.stubGlobal("fetch",fetcher);
    expect(ctx.image.status()).toMatchObject({configured:true,provider:"fal-ai",verified:false});
    const result=await ctx.image.edit(identity,{imageDataUrl:`data:image/png;base64,${png.toString("base64")}`,prompt:"Make the background blue"});
    expect(result.contentType).toBe("image/png");
    expect(fetcher.mock.calls[0][0]).toBe(`${HF_IMAGE_ENDPOINT}?_subdomain=queue`);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer hf_retained_for_images");
    expect(fetcher.mock.calls[2][1].headers).toBeUndefined();
    expect(fetcher.mock.calls.some(call=>call[0]===GROQ_CHAT_ENDPOINT)).toBe(false);
    expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();
  });
  it("fails closed before reserving quota when the selected Groq key is missing",async()=>{
    const ctx=setup();vi.stubEnv("GROQ_API_KEY","");vi.stubEnv("HF_TOKEN","hf_retained_for_images");
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]})).rejects.toThrow("not configured");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });
  it("saves a real provider-shaped draft through Groq even when HF remains configured",async()=>{
    const ctx=setup();vi.stubEnv("HF_TOKEN","hf_retained_for_images");
    const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({variants})}}]}));vi.stubGlobal("fetch",fetcher);
    const result=await new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]});
    expect(result).toMatchObject({id:"draft",topic:"Test",variants});
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(GROQ_CHAT_ENDPOINT,expect.objectContaining({headers:expect.objectContaining({Authorization:"Bearer gsk_fixture"})}));
    expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();expect(ctx.contentItem.create).toHaveBeenCalledOnce();
  });
  it("enforces the existing quota before calling Groq",async()=>{
    const ctx=setup(0),fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]})).rejects.toThrow("quota reached");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });
  it("plans a video without an HF token while still reserving a shared attempt",async()=>{
    const ctx=setup();const plan={title:"Test",captions:[],scenes:[{text:"A product",start:0,end:5}]};
    const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:JSON.stringify(plan)}}]}));vi.stubGlobal("fetch",fetcher);
    expect(await new VideoAiService(ctx.image).plan(identity,{brief:"Introduce a product",duration:5})).toEqual(plan);
    expect(fetcher.mock.calls[0][0]).toBe(GROQ_CHAT_ENDPOINT);expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();
  });
  it("does not mistake a Groq key for image generation credentials",async()=>{
    const ctx=setup(),fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const imageDataUrl=`data:image/png;base64,${Buffer.from([137,80,78,71,13,10,26,10]).toString("base64")}`;
    await expect(ctx.image.edit(identity,{imageDataUrl,prompt:"Make the background blue"})).rejects.toThrow("not configured");
    expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  });
});
