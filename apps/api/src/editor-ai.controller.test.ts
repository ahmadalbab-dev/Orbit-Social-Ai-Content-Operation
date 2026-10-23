import {afterEach,describe,it,expect,vi} from 'vitest';
import {EditorAiController} from './editor-ai.controller';
import type {ImageAiService} from './image-ai.service';
const request={identity:{sub:'s',workspaceId:'w',userId:'u',role:'OWNER'}} as Parameters<EditorAiController['plan']>[0];
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('editor AI membership-scoped quota',()=>{
 it('rejects invalid settings before quota reservation',async()=>{
  const reserveAttempt=vi.fn();await expect(new EditorAiController({reserveAttempt} as unknown as ImageAiService).plan(request,{kind:'image',instruction:'x',current:{url:'https://example.com'}})).rejects.toThrow();expect(reserveAttempt).not.toHaveBeenCalled();
 });
 it('enforces quota before dispatch',async()=>{
  vi.stubEnv('AI_TEXT_PROVIDER','groq');vi.stubEnv('GROQ_API_KEY','fixture');const reserveAttempt=vi.fn().mockRejectedValue(new Error('quota reached')),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(new EditorAiController({reserveAttempt} as unknown as ImageAiService).plan(request,{kind:'image',instruction:'Make a poster',current:{}})).rejects.toThrow('quota reached');expect(reserveAttempt).toHaveBeenCalledWith(request.identity,true);expect(fetcher).not.toHaveBeenCalled();
 });
});

it('rejects Gateway preview sharing without server opt-in before quota or dispatch',async()=>{
 vi.stubEnv('AI_TEXT_PROVIDER','gateway');vi.stubEnv('AI_GATEWAY_API_KEY','fixture');vi.stubEnv('AI_GATEWAY_ALLOW_PREVIEW_SHARING','false');
 const reserveAttempt=vi.fn(),f=vi.fn();vi.stubGlobal('fetch',f);
 await expect(new EditorAiController({reserveAttempt} as unknown as ImageAiService).plan(request,{kind:'image',instruction:'x',current:{},previewDataUrl:'data:image/png;base64,aAAA'})).rejects.toThrow('not configured');
 expect(reserveAttempt).not.toHaveBeenCalled();expect(f).not.toHaveBeenCalled();
});
