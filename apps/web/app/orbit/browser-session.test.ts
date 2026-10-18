import {afterEach,describe,expect,it,vi} from "vitest";
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
const success=()=>Response.json({access_token:"synthetic-access",expires_in:3600,refreshable:true});
describe("browser session coordination",()=>{
 it("serializes refresh and signout under the same cross-tab Web Lock",async()=>{
  let finish!:(value:Response)=>void;
  const fetcher=vi.fn<typeof fetch>().mockImplementationOnce(()=>new Promise(done=>{finish=done;})).mockResolvedValueOnce(Response.json({signedOut:true}));
  const lock=vi.fn(async(_name:string,run:()=>Promise<unknown>)=>await run());
  vi.stubGlobal("navigator",{locks:{request:lock}});vi.stubGlobal("fetch",fetcher);
  const {browserSession,clearBrowserSession}=await import("./browser-session");
  const restore=browserSession(),signout=clearBrowserSession();
  await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][1]).toMatchObject({method:"POST",credentials:"same-origin",cache:"no-store",body:JSON.stringify({action:"restore"})});
  finish(success());expect(await restore).toEqual({access_token:"synthetic-access",expires_in:3600,refreshable:true});await signout;
  expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[1][1]).toMatchObject({method:"DELETE",credentials:"same-origin"});
  expect(lock.mock.calls.map(call=>call[0])).toEqual(["orbit-auth-session","orbit-auth-session"]);
 });
 it("returns null for an expired cookie but preserves a transient error for retry",async()=>{
  vi.stubGlobal("navigator",{});vi.stubGlobal("fetch",vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({},{status:401})).mockResolvedValueOnce(Response.json({},{status:503})).mockResolvedValueOnce(success()));
  const {browserSession}=await import("./browser-session");expect(await browserSession()).toBeNull();await expect(browserSession()).rejects.toThrow("Cannot restore");expect(await browserSession()).toMatchObject({refreshable:true});
 });
 it("does not expose a refresh token returned unexpectedly by the endpoint",async()=>{
  vi.stubGlobal("navigator",{});const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({access_token:"synthetic-access",refresh_token:"must-not-return",expires_in:3600,refreshable:true}));vi.stubGlobal("fetch",fetcher);
  const {browserSession}=await import("./browser-session");expect(await browserSession("synthetic-establish-refresh")).toEqual({access_token:"synthetic-access",expires_in:3600,refreshable:true});
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({action:"establish",refreshToken:"synthetic-establish-refresh"});
 });
});
