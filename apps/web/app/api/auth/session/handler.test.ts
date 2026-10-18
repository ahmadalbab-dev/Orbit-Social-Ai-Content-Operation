import {describe,it,expect,vi} from "vitest";
import {handleSession} from "./handler";
const config={url:"https://identity.orbit.test",key:"sb_publishable_fixture"};
function request(body:unknown={action:"restore"},options:{method?:string;origin?:string|null;cookie?:string;url?:string;contentType?:string}={}){
 const url=options.url??"https://orbit.test/api/auth/session";
 const headers=new Headers();if(options.origin!==null)headers.set("Origin",options.origin??new URL(url).origin);
 headers.set("Content-Type",options.contentType??"application/json");if(options.cookie)headers.set("Cookie",options.cookie);
 return new Request(url,{method:options.method??"POST",headers,...(options.method==="DELETE"?{}:{body:JSON.stringify(body)})});
}
const tokenResponse=()=>Response.json({access_token:"access-next-fixture",refresh_token:"refresh-next-fixture",expires_in:3600});
describe("same-origin persisted browser session",()=>{
 it("exchanges an established refresh token only with configured identity service and stores rotation HttpOnly",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(tokenResponse());
  const response=await handleSession(request({action:"establish",refreshToken:"refresh-initial-fixture"}),config,fetcher);
  expect(response.status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
  const [url,init]=fetcher.mock.calls[0];expect(url).toBe("https://identity.orbit.test/auth/v1/token?grant_type=refresh_token");
  expect(JSON.parse(init!.body as string)).toEqual({refresh_token:"refresh-initial-fixture"});expect(init).toMatchObject({method:"POST",redirect:"error",cache:"no-store"});
  expect(response.headers.get("Set-Cookie")).toBe("orbit-refresh=refresh-next-fixture; Path=/api/auth/session; HttpOnly; SameSite=Strict; Max-Age=2592000; Secure");
  expect(await response.json()).toEqual({access_token:"access-next-fixture",expires_in:3600,refreshable:true});
  expect(response.headers.get("Cache-Control")).toContain("no-store");expect(response.headers.get("Vary")).toContain("Cookie");
 });
 it("restores from a cookie and rotates it without returning refresh credentials",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(tokenResponse());
  const response=await handleSession(request({action:"restore"},{cookie:"unrelated=value; orbit-refresh=refresh-cookie-fixture"}),config,fetcher);
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({refresh_token:"refresh-cookie-fixture"});
  const body=await response.text();expect(body).not.toContain("refresh-next-fixture");expect(body).not.toContain("refresh-cookie-fixture");expect(response.headers.get("Set-Cookie")).toContain("refresh-next-fixture");
 });
 it("retains HttpOnly and SameSite restrictions on local HTTP without requiring Secure",async()=>{
  const response=await handleSession(request({action:"establish",refreshToken:"refresh-fixture"},{url:"http://localhost:3000/api/auth/session"}),config,vi.fn<typeof fetch>().mockResolvedValue(tokenResponse()));
  const cookie=response.headers.get("Set-Cookie")!;expect(cookie).toContain("HttpOnly; SameSite=Strict");expect(cookie).not.toContain("; Secure");
 });
 it.each([undefined,"https://attacker.test","null"])("rejects absent or cross-origin session requests (%s) without calling identity service",async(origin)=>{
  const fetcher=vi.fn<typeof fetch>();const response=await handleSession(request({action:"establish",refreshToken:"fixture"},{origin:origin??null}),config,fetcher);
  expect(response.status).toBe(403);expect(fetcher).not.toHaveBeenCalled();expect(response.headers.has("Set-Cookie")).toBe(false);
 });
 it("rejects cross-origin signout and clears only the same-origin saved cookie",async()=>{
  const fetcher=vi.fn<typeof fetch>();const denied=await handleSession(request(undefined,{method:"DELETE",origin:"https://attacker.test"}),config,fetcher);expect(denied.status).toBe(403);expect(denied.headers.has("Set-Cookie")).toBe(false);
  const response=await handleSession(request(undefined,{method:"DELETE"}),config,fetcher);expect(response.status).toBe(200);expect(await response.json()).toEqual({signedOut:true});expect(response.headers.get("Set-Cookie")).toContain("orbit-refresh=; Path=/api/auth/session; HttpOnly; SameSite=Strict; Max-Age=0; Secure");expect(fetcher).not.toHaveBeenCalled();
 });
 it.each([400,401,403])("clears a rejected or revoked refresh cookie after identity status %s",async status=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({message:"private-provider-text"},{status}));
  const response=await handleSession(request({action:"restore"},{cookie:"orbit-refresh=revoked-fixture"}),config,fetcher);
  expect(response.status).toBe(401);expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");expect(await response.text()).not.toContain("private-provider-text");
 });
 it.each([429,500,503])("preserves the saved cookie after transient identity status %s",async status=>{
  const response=await handleSession(request({action:"restore"},{cookie:"orbit-refresh=valid-fixture"}),config,vi.fn<typeof fetch>().mockResolvedValue(Response.json({message:"private"},{status})));
  expect(response.status).toBe(503);expect(response.headers.has("Set-Cookie")).toBe(false);expect(await response.text()).not.toContain("private");
 });
 it("preserves the saved cookie on a network outage and malformed provider success",async()=>{
  for(const fetcher of [vi.fn<typeof fetch>().mockRejectedValue(Error("sensitive upstream details")),vi.fn<typeof fetch>().mockResolvedValue(Response.json({access_token:"access",expires_in:3600}))]){
   const response=await handleSession(request({action:"restore"},{cookie:"orbit-refresh=valid-fixture"}),config,fetcher);expect(response.status).toBe(503);expect(response.headers.has("Set-Cookie")).toBe(false);expect(await response.text()).not.toContain("sensitive");
  }
 });
 it("rejects missing or malformed input before sending credentials",async()=>{
  const fetcher=vi.fn<typeof fetch>();
  for(const incoming of [request({action:"restore"}),request({action:"establish",refreshToken:"line\nbreak"}),request({action:"restore"},{cookie:"orbit-refresh=%invalid"}),request({action:"establish",refreshToken:"x".repeat(5000)}),request({action:"other"})]){
   const response=await handleSession(incoming,config,fetcher);expect(response.status).toBe(401);
  }
  expect(fetcher).not.toHaveBeenCalled();
 });
});
