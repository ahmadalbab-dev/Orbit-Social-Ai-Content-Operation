import {describe,it,expect,vi} from 'vitest';
import {GatewayContentProvider,GatewayVideoPlanner,GatewayImageEditor,MemoryUsageStore,EditorPlanner,DEFAULT_GATEWAY_MODEL} from './index';
import {GATEWAY_CHAT_ENDPOINT} from './gateway';
const input={workspaceId:'w',brandName:'Orbit',voice:'Clear',audience:'Creators',topic:'Bottle',platforms:['facebook'] as ['facebook']};
const variants=[{platform:'facebook',copy:'Hello',hashtags:[],callToAction:''}];
const reply=(v:unknown,reason='stop')=>Response.json({choices:[{finish_reason:reason,message:{content:JSON.stringify(v)}}],usage:{prompt_tokens:12,completion_tokens:20}});
describe('Gateway routing and output boundaries',()=>{
 it('routes Studio through the fixed Gateway, preserving usage and cache',async()=>{
  const f=vi.fn().mockResolvedValue(reply({variants})),p=new GatewayContentProvider(new MemoryUsageStore(),{apiKey:'fixture',fetch:f});
  expect((await p.generateVariants(input)).usage).toMatchObject({model:DEFAULT_GATEWAY_MODEL,inputTokens:12,outputTokens:20,cached:false});
  expect((await p.generateVariants(input)).usage.cached).toBe(true);expect(f).toHaveBeenCalledOnce();
  const[url,init]=f.mock.calls[0];expect(url).toBe(GATEWAY_CHAT_ENDPOINT);
  expect(init).toMatchObject({redirect:'error',credentials:'omit',headers:{Authorization:'Bearer fixture'}});
  expect(JSON.parse(init.body)).toMatchObject({model:DEFAULT_GATEWAY_MODEL,response_format:{type:'json_schema'},providerOptions:{gateway:{only:['google']}}});
 });
 it.each(['image','video'])('uses Gateway for %s editable changes and opt-in single-frame vision',async kind=>{
  const plan={summary:'Brighter',changes:{brightness:kind==='image'?110:1.1}},f=vi.fn().mockResolvedValue(reply(plan));
  const current=kind==='image'?{brightness:100}:{sourceDuration:5};
  expect(await new EditorPlanner('fixture','gateway',undefined,f).plan({kind,instruction:'Brighter',current,previewDataUrl:'data:image/png;base64,aAAA'})).toEqual(plan);
  expect(f.mock.calls[0][0]).toBe(GATEWAY_CHAT_ENDPOINT);
  expect(JSON.parse(f.mock.calls[0][1].body).messages[1].content[1].image_url.url).toBe('data:image/png;base64,aAAA');
 });
 it('validates planned clip timing before returning it',async()=>{
  const f=vi.fn().mockResolvedValue(reply({title:'Bottle',captions:[],scenes:[{text:'Show bottle',start:0,end:6}]}));
  await expect(new GatewayVideoPlanner('fixture',undefined,f).plan({brief:'Bottle',duration:5})).rejects.toMatchObject({code:'invalid_response'});
 });
 it.each([401,402,403,404,429,500])('does not retry or fall back on HTTP %s',async status=>{
  const f=vi.fn().mockResolvedValue(new Response('private upstream details',{status}));
  await expect(new GatewayContentProvider(new MemoryUsageStore(),{apiKey:'fixture',fetch:f}).generateVariants(input)).rejects.not.toThrow('private upstream details');
  expect(f).toHaveBeenCalledOnce();
 });
 it('rejects unreviewed models before any call',()=>{
  expect(()=>new GatewayContentProvider(new MemoryUsageStore(),{apiKey:'fixture',model:'openai/unknown'})).toThrow();
 });
 it('rejects invented editor fields and oversized responses',async()=>{
  const f=vi.fn().mockResolvedValue(reply({summary:'Done',changes:{url:'https://private.test'}}));
  await expect(new EditorPlanner('fixture','gateway',undefined,f).plan({kind:'image',instruction:'x',current:{}})).rejects.toMatchObject({code:'invalid_response'});
  f.mockResolvedValue(new Response('x'.repeat(24001)));
  await expect(new GatewayVideoPlanner('fixture',undefined,f).plan({brief:'x',duration:5})).rejects.toMatchObject({code:'invalid_response'});
 });
 it('accepts a single inline image with matching magic bytes',async()=>{
  const data='iVBORw0KGgo=',url=`data:image/png;base64,${data}`;
  const f=vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'stop',message:{images:[{image_url:{url}}]}}]}));
  const result=await new GatewayImageEditor('fixture',f).edit({imageDataUrl:url,prompt:'Blue background'});
  expect(result.contentType).toBe('image/png');expect(result.bytes.length).toBe(8);
  expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({modalities:['image'],providerOptions:{gateway:{only:['google']}}});
 });
 it.each(['https://private.test/image.png','data:image/jpeg;base64,iVBORw0KGgo='])('rejects non-inline or mismatched image output %s',async url=>{
  const f=vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'stop',message:{images:[{image_url:{url}}]}}]}));
  await expect(new GatewayImageEditor('fixture',f).edit({imageDataUrl:'data:image/png;base64,iVBORw0KGgo=',prompt:'Blue'})).rejects.toMatchObject({code:'invalid_response'});
 });
});
