import {describe, it, expect, vi} from 'vitest';
import {GeminiContentProvider, MemoryUsageStore} from './index';
import {EditorPlanner} from './editor-planner';
import {GeminiVideoPlanner} from './huggingface-video-plan';
import {DEFAULT_GEMINI_TEXT_MODEL} from './gemini-text';
const image = {kind:'image', instruction:'Warm colours', current:{brightness:100}};
const variants = [{platform:'facebook', copy:'Hello', hashtags:[], callToAction:''}];
const input = {workspaceId:'workspace', brandName:'Orbit', voice:'Clear', audience:'Creators', topic:'A product', platforms:['facebook'] as ['facebook']};
function reply(value: unknown, finishReason = 'STOP') {
 return Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}],usageMetadata:{promptTokenCount:20,candidatesTokenCount:30,thoughtsTokenCount:5}});
}
describe('Gemini native transport and editor boundaries',()=>{
 it('generates and caches Studio drafts, with native usage and server-only key',async()=>{
  const fetcher=vi.fn().mockResolvedValue(reply({variants}));
  const provider=new GeminiContentProvider(new MemoryUsageStore(),{apiKey:'gemini_fixture',fetch:fetcher});
  const result=await provider.generateVariants(input);
  expect(result.variants).toEqual(variants);
  expect(result.usage).toMatchObject({model:DEFAULT_GEMINI_TEXT_MODEL,inputTokens:20,outputTokens:35,cached:false});
  expect((await provider.generateVariants(input)).usage.cached).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
  const [url,options]=fetcher.mock.calls[0];
  expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_TEXT_MODEL}:generateContent`);
  expect(options).toMatchObject({redirect:'error',credentials:'omit',headers:{'x-goog-api-key':'gemini_fixture'}});
  expect(url).not.toContain('gemini_fixture');
  expect(JSON.parse(options.body)).toMatchObject({generationConfig:{responseMimeType:'application/json',maxOutputTokens:3000},contents:[{role:'user'}]});
 });
 it.each(['image','video'])('prepares %s changes using the existing editable contract',async kind=>{
  const plan={summary:'Warmer',changes:{brightness:kind==='image'?110:1.1}};
  const fetcher=vi.fn().mockResolvedValue(reply(plan));
  const request=kind==='image'?image:{kind,instruction:'Warm colours',current:{sourceDuration:10,start:0,duration:5}};
  expect(await new EditorPlanner('fixture','gemini',undefined,fetcher).plan(request)).toEqual(plan);
  expect(fetcher.mock.calls[0][1].body).not.toContain('inlineData');
 });
 it('sends only an explicitly provided reduced preview inline, never remote URLs or the Groq vision model',async()=>{
  const plan={summary:'Warmer',changes:{brightness:110}},fetcher=vi.fn().mockResolvedValue(reply(plan));
  await new EditorPlanner('fixture','gemini',undefined,fetcher,'unused-groq-model').plan({...image,previewDataUrl:'data:image/jpeg;base64,/9j/2Q=='});
  expect(JSON.parse(fetcher.mock.calls[0][1].body).contents[0].parts[1]).toEqual({inlineData:{mimeType:'image/jpeg',data:'/9j/2Q=='}});
  expect(fetcher.mock.calls[0][0]).toContain(DEFAULT_GEMINI_TEXT_MODEL);
  fetcher.mockClear();
  await expect(new EditorPlanner('fixture','gemini',undefined,fetcher).plan({...image,previewDataUrl:'https://example.test/private.jpg'})).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('prepares a brief-based video plan with validated timing',async()=>{
  const plan={title:'Product',captions:[],scenes:[{text:'Show product',start:0,end:5}]};
  const fetcher=vi.fn().mockResolvedValue(reply(plan));
  expect(await new GeminiVideoPlanner('fixture',undefined,fetcher).plan({brief:'Show product',duration:5})).toEqual(plan);
  fetcher.mockResolvedValue(reply({...plan,scenes:[{text:'Too long',start:0,end:6}]}));
  await expect(new GeminiVideoPlanner('fixture',undefined,fetcher).plan({brief:'Show product',duration:5})).rejects.toMatchObject({code:'invalid_response'});
 });
 it.each([429,403,404,500])('does not retry or switch provider on HTTP %s',async status=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('secret upstream details',{status}));
  await expect(new GeminiContentProvider(new MemoryUsageStore(),{apiKey:'fixture',fetch:fetcher}).generateVariants(input)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledOnce();
 });
 it.each(['MAX_TOKENS','SAFETY','RECITATION'])('rejects unfinished or blocked %s output before applying',async reason=>{
  const fetcher=vi.fn().mockResolvedValue(reply({summary:'Partial',changes:{brightness:110}},reason));
  await expect(new EditorPlanner('fixture','gemini',undefined,fetcher).plan(image)).rejects.toMatchObject({code:'invalid_response'});
 });
 it.each([{}, {candidates:[]}, {candidates:[{finishReason:'STOP',content:{parts:[{text:'private reasoning',thought:true}]}}]}])('rejects empty/blocked response %j',async value=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json(value));
  await expect(new EditorPlanner('fixture','gemini',undefined,fetcher).plan(image)).rejects.toMatchObject({code:'invalid_response'});
 });
 it('rejects oversized responses and invented editing capabilities',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('x'.repeat(120001)));
  await expect(new EditorPlanner('fixture','gemini',undefined,fetcher).plan(image)).rejects.toMatchObject({code:'invalid_response'});
  fetcher.mockResolvedValue(reply({summary:'Cutout',changes:{greenScreen:true}}));
  await expect(new EditorPlanner('fixture','gemini',undefined,fetcher).plan(image)).rejects.toMatchObject({code:'invalid_response'});
 });
 it.each(['gemini-3.1-flash-image','veo-3.1-generate-preview','lyria-3.5','https://example.test','gemini-latest'])('rejects non-reviewed text model %s before dispatch',model=>{
  expect(()=>new EditorPlanner('fixture','gemini',model)).toThrow();
  expect(()=>new GeminiContentProvider(new MemoryUsageStore(),{apiKey:'fixture',model})).toThrow();
 });
});
