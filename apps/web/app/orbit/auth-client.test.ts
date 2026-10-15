import {afterEach,describe,expect,it,vi} from "vitest";
import {passwordAuth,publicAuthConfig} from "./auth-client";
import {api,setApiSession} from "./session-api";
const publicKey=`e30.${btoa(JSON.stringify({role:"anon"}))}.signature`;
afterEach(()=>{vi.unstubAllGlobals();setApiSession(null);});
describe("customer authentication boundaries",()=>{
 it("rejects secret and service-role keys in public configuration",()=>{
  expect(publicAuthConfig("https://project.supabase.co","sb_secret_test")).toBeNull();
  expect(publicAuthConfig("https://project.supabase.co",`e30.${btoa(JSON.stringify({role:"service_role"}))}.signature`)).toBeNull();
  expect(publicAuthConfig("https://project.supabase.co",publicKey)).toEqual({url:"https://project.supabase.co",key:publicKey});
 });
 it("handles email confirmation without inventing a session",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({user:{id:"pending"}})));
  expect(await passwordAuth("signup","test@example.com","password",{url:"https://project.supabase.co",key:publicKey})).toBeNull();
 });
 it("never repeats a provider error containing credentials",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({message:"secret must never escape"},{status:400})));
  await expect(passwordAuth("signin","test@example.com","password",{url:"https://project.supabase.co",key:publicKey})).rejects.toThrow("Could not sign in");
 });
 it("sends password credentials only to the configured auth origin",async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({access_token:"verified",expires_in:3600}));vi.stubGlobal("fetch",fetcher);
  expect(await passwordAuth("signin","test@example.com","password",{url:"https://project.supabase.co",key:publicKey})).toEqual({access_token:"verified",expires_in:3600});
  expect(fetcher.mock.calls[0][0]).toBe("https://project.supabase.co/auth/v1/token?grant_type=password");
  expect(fetcher.mock.calls[0][1].redirect).toBe("error");
 });
 it("requires verified session state before workspace requests",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
  await expect(api("/content")).rejects.toThrow("Sign in");expect(fetcher).not.toHaveBeenCalled();
 });
 it("scopes requests to selected workspace and clears on sign-out",async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json([]));vi.stubGlobal("fetch",fetcher);setApiSession({token:"verified",workspaceId:"workspace-a"});await api("/content");
  const headers=new Headers(fetcher.mock.calls[0][1].headers);
  expect(headers.get("Authorization")).toBe("Bearer verified");
  expect(headers.get("x-workspace-id")).toBe("workspace-a");
  setApiSession(null);await expect(api("/content")).rejects.toThrow("Sign in");
 });
});
