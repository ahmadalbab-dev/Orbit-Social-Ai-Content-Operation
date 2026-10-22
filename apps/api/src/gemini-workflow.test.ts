import { afterEach, describe, expect, it, vi } from "vitest";
import { HF_IMAGE_ENDPOINT } from "@sma/ai";
import { EditorAiController } from "./editor-ai.controller";
import { WorkflowService } from "./workflow.service";
import { VideoAiService } from "./video-ai.service";
import { ImageAiService } from "./image-ai.service";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
const GEMINI_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const identity={sub:"subject",userId:"user",workspaceId:"workspace",role:"OWNER"};
const variants=[{platform:"facebook",copy:"Test caption",hashtags:[],callToAction:"Your idea?"}];
function setup(count=1){
  vi.stubEnv("AI_TEXT_PROVIDER","gemini");vi.stubEnv("GEMINI_API_KEY","gemini_fixture");vi.stubEnv("GEMINI_ALLOW_UNPAID_DATA_USE","true");
  vi.stubEnv("HF_TOKEN","");
  const aiQuota={upsert:vi.fn(),updateMany:vi.fn().mockResolvedValue({count})};
  const contentItem={create:vi.fn().mockImplementation(async({data})=>({...data,id:"draft",revision:1,status:"DRAFT",updatedAt:new Date()}))};
  const db={aiQuota,contentItem,brand:{findFirst:vi.fn().mockResolvedValue({id:"brand",name:"Orbit",voice:"Clear",audience:"Creators",guidelines:{}})},workspace:{findUniqueOrThrow:vi.fn().mockResolvedValue({monthlyAiBudgetUsd:10})},aiUsage:{findUnique:vi.fn().mockResolvedValue(null),aggregate:vi.fn().mockResolvedValue({_sum:{estimatedCostUsd:0}}),upsert:vi.fn()}} as unknown as DatabaseService;
  const billing={requirePaidAccess:vi.fn()} as unknown as BillingService;
  const image=new ImageAiService(db,billing);
  return {db,billing,aiQuota,contentItem,image};
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("Gemini server selection with shared workspace controls",()=>{
  it("blocks all three Gemini routes before quota or network when data use is not acknowledged",async()=>{
    const ctx=setup();vi.stubEnv("GEMINI_ALLOW_UNPAID_DATA_USE","false");
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]})).rejects.toThrow("not configured");
    await expect(new VideoAiService(ctx.image).plan(identity,{brief:"Test",duration:5})).rejects.toThrow("not configured");
    await expect(new EditorAiController(ctx.image).plan({identity} as never,{kind:"image",instruction:"Warm",current:{brightness:100}})).rejects.toThrow("not configured");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();
  });
  it("keeps Gemini preview sharing disabled until both administrator and editor opt in",async()=>{
    const ctx=setup();vi.stubEnv("GEMINI_ALLOW_PREVIEW_SHARING","false");
    const plan={summary:"Warm",changes:{brightness:110}};
    const fetcher=vi.fn().mockImplementation((..._args: Parameters<typeof fetch>)=>Promise.resolve(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(plan)}]}}]})));
    vi.stubGlobal("fetch",fetcher);
    const controller=new EditorAiController(ctx.image),body={kind:"image",instruction:"Warm",current:{brightness:100}};
    const withPreview={...body,previewDataUrl:"data:image/jpeg;base64,/9j/2Q=="};
    await expect(controller.plan({identity} as never,withPreview)).rejects.toThrow("not configured");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();
    expect(await controller.plan({identity} as never,body)).toEqual(plan);
    expect(fetcher.mock.calls[0][1].body).not.toContain("inlineData");
    vi.stubEnv("GEMINI_ALLOW_PREVIEW_SHARING","true");
    expect(await controller.plan({identity} as never,withPreview)).toEqual(plan);
    expect(fetcher.mock.calls[1][1].body).toContain("inlineData");
  });
  it("keeps HF image editing on its own key and endpoint while Gemini is selected",async()=>{
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
    expect(fetcher.mock.calls.some(call=>call[0]===GEMINI_ENDPOINT)).toBe(false);
    expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();
  });
  it("fails closed before reserving quota when the selected Gemini key is missing",async()=>{
    const ctx=setup();vi.stubEnv("GEMINI_API_KEY","");vi.stubEnv("HF_TOKEN","hf_retained_for_images");
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]})).rejects.toThrow("not configured");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });
  it("saves a real provider-shaped draft through Gemini even when HF remains configured",async()=>{
    const ctx=setup();vi.stubEnv("HF_TOKEN","hf_retained_for_images");
    const fetcher=vi.fn().mockResolvedValue(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({variants})}]}}]}));vi.stubGlobal("fetch",fetcher);
    const result=await new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]});
    expect(result).toMatchObject({id:"draft",topic:"Test",variants});
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(GEMINI_ENDPOINT,expect.objectContaining({headers:expect.objectContaining({"x-goog-api-key":"gemini_fixture"})}));
    expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();expect(ctx.contentItem.create).toHaveBeenCalledOnce();
  });
  it("enforces the existing quota before calling Gemini",async()=>{
    const ctx=setup(0),fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:"brand",topic:"Test",platforms:["facebook"]})).rejects.toThrow("quota reached");
    expect(fetcher).not.toHaveBeenCalled();expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });
  it("plans a video without an HF token while still reserving a shared attempt",async()=>{
    const ctx=setup();const plan={title:"Test",captions:[],scenes:[{text:"A product",start:0,end:5}]};
    const fetcher=vi.fn().mockResolvedValue(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(plan)}]}}]}));vi.stubGlobal("fetch",fetcher);
    expect(await new VideoAiService(ctx.image).plan(identity,{brief:"Introduce a product",duration:5})).toEqual(plan);
    expect(fetcher.mock.calls[0][0]).toBe(GEMINI_ENDPOINT);expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();
  });
  it("does not mistake a Gemini key for image generation credentials",async()=>{
    const ctx=setup(),fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const imageDataUrl=`data:image/png;base64,${Buffer.from([137,80,78,71,13,10,26,10]).toString("base64")}`;
    await expect(ctx.image.edit(identity,{imageDataUrl,prompt:"Make the background blue"})).rejects.toThrow("not configured");
    expect(ctx.aiQuota.upsert).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  });
});
