import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorAiController } from "./editor-ai.controller";
import { WorkflowService } from "./workflow.service";
import { VideoAiService } from "./video-ai.service";
import { ImageAiService } from "./image-ai.service";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
const identity={sub:"subject",userId:"user",workspaceId:"workspace",role:"OWNER"};
const variants=[{platform:"facebook",copy:"Test caption",hashtags:[],callToAction:"Your idea?"}];
function setup(count=1){
  vi.stubEnv("AI_TEXT_PROVIDER","gateway");vi.stubEnv("AI_GATEWAY_API_KEY","gateway_fixture");vi.stubEnv("AI_IMAGE_PROVIDER","gateway");vi.stubEnv("GEMINI_API_KEY","gemini_fixture");vi.stubEnv("GEMINI_ALLOW_UNPAID_DATA_USE","true");
  vi.stubEnv("HF_TOKEN","");
  const aiQuota={upsert:vi.fn(),updateMany:vi.fn().mockResolvedValue({count})};
  const contentItem={create:vi.fn().mockImplementation(async({data})=>({...data,id:"draft",revision:1,status:"DRAFT",updatedAt:new Date()}))};
  const db={aiQuota,contentItem,brand:{findFirst:vi.fn().mockResolvedValue({id:"brand",name:"Orbit",voice:"Clear",audience:"Creators",guidelines:{}})},workspace:{findUniqueOrThrow:vi.fn().mockResolvedValue({monthlyAiBudgetUsd:10})},aiUsage:{findUnique:vi.fn().mockResolvedValue(null),aggregate:vi.fn().mockResolvedValue({_sum:{estimatedCostUsd:0}}),upsert:vi.fn()}} as unknown as DatabaseService;
  const billing={requirePaidAccess:vi.fn()} as unknown as BillingService;
  const image=new ImageAiService(db,billing);
  return {db,billing,aiQuota,contentItem,image};
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Gateway end-to-end service wiring',()=>{
 it('uses Gateway for Studio, editor changes, video plans and image pixels with shared quota',async()=>{
  const ctx=setup();const png='data:image/png;base64,iVBORw0KGgo=';
  const plan={summary:'Brighter',changes:{brightness:110}},video={title:'Bottle',captions:[],scenes:[{text:'Show bottle',start:0,end:5}]};
  const reply=(value:unknown)=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
  const f=vi.fn().mockResolvedValueOnce(reply({variants})).mockResolvedValueOnce(reply(plan)).mockResolvedValueOnce(reply(video)).mockResolvedValueOnce(Response.json({choices:[{finish_reason:'stop',message:{images:[{image_url:{url:png}}]}}]}));vi.stubGlobal('fetch',f);
  expect((await new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:'brand',topic:'Bottle',platforms:['facebook']})).variants).toEqual(variants);
  expect(await new EditorAiController(ctx.image).plan({identity} as never,{kind:'image',instruction:'Brighter',current:{brightness:100}})).toEqual(plan);
  expect(await new VideoAiService(ctx.image).plan(identity,{brief:'Bottle',duration:5})).toEqual(video);
  expect((await ctx.image.edit(identity,{imageDataUrl:png,prompt:'Blue background'})).contentType).toBe('image/png');
  expect(ctx.aiQuota.updateMany).toHaveBeenCalledTimes(4);
  for(const[url,init]of f.mock.calls){expect(url).toBe('https://ai-gateway.vercel.sh/v1/chat/completions');expect(init.headers.Authorization).toBe('Bearer gateway_fixture');}
 });
 it('blocks all four Gateway flows on exhausted workspace quota before dispatch',async()=>{
  const ctx=setup(0),f=vi.fn();vi.stubGlobal('fetch',f);
  await expect(new WorkflowService(ctx.db,ctx.billing).generate(identity,{brandId:'brand',topic:'Bottle',platforms:['facebook']})).rejects.toThrow('quota reached');
  await expect(new EditorAiController(ctx.image).plan({identity} as never,{kind:'image',instruction:'x',current:{}})).rejects.toThrow('quota reached');
  await expect(new VideoAiService(ctx.image).plan(identity,{brief:'x',duration:5})).rejects.toThrow('quota reached');
  await expect(ctx.image.edit(identity,{imageDataUrl:'data:image/png;base64,iVBORw0KGgo=',prompt:'Blue'})).rejects.toThrow('quota reached');
  expect(f).not.toHaveBeenCalled();expect(ctx.contentItem.create).not.toHaveBeenCalled();
 });
});
