import {describe,it,expect,vi} from 'vitest';
import {EditorPlanner,parseEditorPlan,validateEditorInput} from './editor-planner';
const image={kind:'image',instruction:'Make a warm poster',current:{brightness:100}};
describe('conversational editor boundary',()=>{
 it('routes coherent editable changes through Groq without media upload',async()=>{
  const plan={summary:'Warm poster',changes:{template:'poster',caption:'Everyday',background:'#eee1cc',textColor:'#302222'}};
  const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:JSON.stringify(plan)}}]}));
  expect(await new EditorPlanner('fixture','groq',undefined,fetcher).plan(image)).toEqual(plan);
  expect(fetcher.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({include_reasoning:false,max_completion_tokens:2500});
  expect(fetcher.mock.calls[0][1].body).not.toContain('data:image');
 });
 it('accepts existing manual brightness outside AI output range',()=>{expect(validateEditorInput({...image,current:{brightness:0,contrast:200}}).current).toEqual({brightness:0,contrast:200});});
 it.each([{script:'alert(1)'},{caption:'a'.repeat(201)},{brightness:500},{template:'unknown'},{imageUrl:'https://example.com'}])('rejects unsafe or unsupported changes %j',changes=>{
  expect(()=>parseEditorPlan(JSON.stringify({summary:'Edit',changes}),validateEditorInput(image))).toThrow();
 });
 it('rejects inherited property names',()=>{expect(()=>parseEditorPlan('{"summary":"Edit","changes":{"constructor":"unsafe"}}',validateEditorInput(image))).toThrow();});
 it('rejects overflowing trim and caption timings',()=>{
  const input=validateEditorInput({kind:'video',instruction:'Trim',current:{sourceDuration:20,start:5,duration:10}});
  for(const changes of [{start:15,duration:10},{captions:[{text:'Late',start:0,end:11}]}])expect(()=>parseEditorPlan(JSON.stringify({summary:'Edit',changes}),input)).toThrow();
 });
 it('moves only existing uploaded layers',()=>{
  const input=validateEditorInput({...image,current:{layers:[{index:0,x:50,y:50,width:40,opacity:100}]}});
  const plan=parseEditorPlan(JSON.stringify({summary:'Logo at top right',changes:{layers:[{index:0,x:85,y:15,width:20}]}}),input);
  expect(plan.changes).toMatchObject({layers:[{index:0,x:85,y:15}]});
  expect(()=>parseEditorPlan(JSON.stringify({summary:'No invented layer',changes:{layers:[{index:1,x:85}]}}),input)).toThrow();
  expect(()=>validateEditorInput({...image,current:{layers:[{index:0,src:'https://example.com'}]}})).toThrow();
 });
 it('rejects invalid partial video layer timing',()=>{
  const input=validateEditorInput({kind:'video',instruction:'Move logo',current:{sourceDuration:20,duration:10,layers:[{index:0,x:0,y:0,width:0.3,opacity:1,start:2,end:8}]}});
  expect(()=>parseEditorPlan(JSON.stringify({summary:'Invalid timing',changes:{layers:[{index:0,start:9}]}}),input)).toThrow();
 });
 it('returns an unsupported request honestly without changes',()=>{
  expect(parseEditorPlan(JSON.stringify({summary:'Pixel generation needs the image service',changes:{}}),validateEditorInput(image)).changes).toEqual({});
 });
 it('does not retry or switch provider after quota denial',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('ignored',{status:429}));
  await expect(new EditorPlanner('fixture','groq',undefined,fetcher).plan(image)).rejects.toThrow();expect(fetcher).toHaveBeenCalledOnce();
 });
 it('rejects oversized instructions and injected current URLs before dispatch',async()=>{
  const fetcher=vi.fn();
  for(const value of [{...image,instruction:'x'.repeat(3001)},{...image,current:{url:'https://example.com'}}])await expect(new EditorPlanner('fixture','groq',undefined,fetcher).plan(value)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
 });
});

describe('visual composition context',()=>{
 it('distinguishes a base photo and its first overlay without inventing assets',()=>{
  const input=validateEditorInput({kind:'image',instruction:'Make the second image equal size and to the left',current:{hasBaseImage:true,baseScale:1,baseX:50,baseY:50,baseAspectRatio:1,canvasAspectRatio:1,layers:[{index:0,x:50,y:50,width:40,opacity:100}]}});
  expect(parseEditorPlan(JSON.stringify({summary:'Equal split',changes:{baseScale:0.5,baseX:75,baseY:50,layers:[{index:0,x:25,y:50,width:50}]}}),input).changes).toMatchObject({baseScale:0.5,baseX:75});
  expect(()=>parseEditorPlan(JSON.stringify({summary:'No context in edits',changes:{hasBaseImage:true}}),input)).toThrow();
 });
 it('uses Groq vision only for an explicitly supplied bounded inline preview',async()=>{
  const plan={summary:'Move the product',changes:{baseX:60}};
  const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:JSON.stringify(plan)}}]}));
  const input={...image,previewDataUrl:'data:image/jpeg;base64,/9j/2Q=='};
  expect(await new EditorPlanner('fixture','groq',undefined,fetcher).plan(input)).toEqual(plan);
  const body=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe('qwen/qwen3.8-27b');expect(body.reasoning_effort).toBe('none');
  expect(body.messages[1].content[1]).toEqual({type:'image_url',image_url:{url:input.previewDataUrl}});
  expect(body.messages[1].content[0].text).not.toContain('data:image');
 });
 it('rejects remote or oversized previews before dispatch; never sends vision to HF',async()=>{
  const fetcher=vi.fn();
  for(const previewDataUrl of ['https://private.test/file','data:image/svg+xml;base64,PHN2Zz4=',`data:image/jpeg;base64,${'a'.repeat(700001)}`])await expect(new EditorPlanner('fixture','groq',undefined,fetcher).plan({...image,previewDataUrl})).rejects.toThrow();
  await expect(new EditorPlanner('fixture','huggingface',undefined,fetcher).plan({...image,previewDataUrl:'data:image/jpeg;base64,/9j/2Q=='})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
});


describe('uploaded image background boundary',()=>{
 const input=validateEditorInput({kind:'image',instruction:'Use second image as background',current:{hasBaseImage:true,layers:[{index:0,x:50,y:50,width:40,opacity:100}]}});
 it('accepts only an uploaded background image and clearing its role',()=>{
  for(const backgroundLayerIndex of [0,null])expect(parseEditorPlan(JSON.stringify({summary:'Use uploaded photo behind the base',changes:{backgroundLayerIndex}}),input).changes).toEqual({backgroundLayerIndex});
  for(const backgroundLayerIndex of [1,-1,0.5,'0','https://example.com'])expect(()=>parseEditorPlan(JSON.stringify({summary:'Invalid background',changes:{backgroundLayerIndex}}),input)).toThrow();
 });
 it('keeps image-only actions out of video plans',()=>{expect(()=>parseEditorPlan(JSON.stringify({summary:'Invalid role',changes:{backgroundLayerIndex:0}}),validateEditorInput({kind:'video',instruction:'Background',current:{sourceDuration:10}}))).toThrow();});
});
