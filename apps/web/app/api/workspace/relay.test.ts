import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relayWorkspace } from "./relay";
const origin="https://web.orbit.test";
function request(path="workspaces", options:RequestInit={}) { return new Request(`${origin}/api/workspace/${path}`,{...options,headers:{Authorization:"Bearer private-test-token","x-workspace-id":"workspace-a",Cookie:"private-cookie=never-forward",...(options.headers??{})}}); }
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_API_URL","https://api.orbit.test");vi.stubEnv("NODE_ENV","production");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("same-origin workspace relay",()=>{
 it("forwards only identity headers to the fixed upstream, never cookies",async()=>{
  const fetcher=vi.fn(async()=>Response.json([]));
  const response=await relayWorkspace(request(),["workspaces"],fetcher);
  expect(response.status).toBe(200);expect(fetcher).toHaveBeenCalledOnce();
  const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe("https://api.orbit.test/v1/workspaces");const headers=new Headers(options.headers);
  expect(headers.get("authorization")).toBe("Bearer private-test-token");expect(headers.get("cookie")).toBeNull();expect(options.redirect).toBe("manual");
 });
 it.each([["..","workspaces"],["https:","attacker.test"],["billing","webhook"],["content?token=private"]])("blocks paths outside known API operations %s",async(...segments)=>{
  const fetcher=vi.fn();expect((await relayWorkspace(request(),segments,fetcher)).status).toBe(404);expect(fetcher).not.toHaveBeenCalled();
 });
 it("does not contact upstream without a bearer token",async()=>{
  const fetcher=vi.fn();const req=new Request(`${origin}/api/workspace/workspaces`);
  expect((await relayWorkspace(req,["workspaces"],fetcher)).status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
 });
 it("preserves upstream authentication rejection",async()=>{
  const response=await relayWorkspace(request(),["workspaces"],vi.fn(async()=>Response.json({message:"Invalid identity"},{status:401})));
  expect(response.status).toBe(401);expect((await response.json()).message).toBe("Invalid identity");
 });
 it("rejects redirects without sending credentials to a second origin",async()=>{
  const fetcher=vi.fn(async()=>new Response(null,{status:302,headers:{Location:"https://attacker.test"}}));
  expect((await relayWorkspace(request(),["workspaces"],fetcher)).status).toBe(502);expect(fetcher).toHaveBeenCalledOnce();
 });
 it("maps network failures without leaking raw diagnostics",async()=>{
  const response=await relayWorkspace(request(),["workspaces"],vi.fn(async()=>{throw new Error("private upstream header") }));
  expect(response.status).toBe(502);expect(await response.text()).not.toContain("private upstream");
 });
 it("bounds uploads before making a provider request",async()=>{
  const fetcher=vi.fn();const req=request("media/assets",{method:"POST",headers:{"Content-Length":"5000000"}});
  expect((await relayWorkspace(req,["media","assets"],fetcher)).status).toBe(413);expect(fetcher).not.toHaveBeenCalled();
 });
 it("rejects server relay loops",async()=>{
  vi.stubEnv("NEXT_PUBLIC_API_URL",origin);const fetcher=vi.fn();expect((await relayWorkspace(request(),["workspaces"],fetcher)).status).toBe(503);expect(fetcher).not.toHaveBeenCalled();
 });
});

it('relays only the approved AI media operations and preserves binary image output', async () => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.orbit.test'); vi.stubEnv('NODE_ENV', 'production');
  const bytes = new Uint8Array([137,80,78,71,13,10,26,10]);
  const fetcher = vi.fn(async () => new Response(bytes, { headers: { 'Content-Type': 'image/png' } }));
  const response = await relayWorkspace(request('media/image-edit', { method: 'POST', body: '{}' }), ['media', 'image-edit'], fetcher);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(fetcher).toHaveBeenCalledWith('https://api.orbit.test/v1/media/image-edit', expect.any(Object));
  const planned = await relayWorkspace(request('media/video-plan', { method: 'POST', body: '{}' }), ['media', 'video-plan'], vi.fn(async () => Response.json({ title: 'Fixture', captions: [], scenes: [] })));
  expect(planned.status).toBe(200);
});
