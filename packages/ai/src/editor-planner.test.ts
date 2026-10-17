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
 it('rejects overflowing trim and caption timings',()=>{
  const input=validateEditorInput({kind:'video',instruction:'Trim',current:{sourceDuration:20,start:5,duration:10}});
  for(const changes of [{start:15,duration:10},{captions:[{text:'Late',start:0,end:11}]}])expect(()=>parseEditorPlan(JSON.stringify({summary:'Edit',changes}),input)).toThrow();
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
