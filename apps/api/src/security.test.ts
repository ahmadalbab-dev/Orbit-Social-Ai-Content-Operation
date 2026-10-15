import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { randomBytes } from "node:crypto";
import { Reflector } from "@nestjs/core";
import { TenantAuthGuard, TokenVault } from "./security";
import type { DatabaseService } from "./database.service";
import type { ExecutionContext } from "@nestjs/common";
const secret="test-only-signing-key-32-bytes-minimum";
function setup(membership:unknown=null){
 const db={user:{findUnique:vi.fn(async()=>({id:"user-a"}))},membership:{findFirst:vi.fn(async()=>membership)}};
 const guard=new TenantAuthGuard(db as unknown as DatabaseService,new Reflector());
 const request:any={headers:{"x-workspace-id":"workspace-b"}};
 const context={switchToHttp:()=>({getRequest:()=>request}),getHandler:()=>function(){},getClass:()=>class{}} as unknown as ExecutionContext;
 return {guard,request,context,db};
}
afterEach(()=>vi.unstubAllEnvs());
describe("tenant authentication",()=>{
 it("does not silently enable development access",async()=>{
  vi.stubEnv("NODE_ENV","development");vi.stubEnv("DEV_AUTH_ENABLED","");
  const {guard,context}=setup();await expect(guard.canActivate(context)).rejects.toThrow("Verified identity");
 });
 it("never enables development identity in production",async()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("DEV_AUTH_ENABLED","true");
  const {guard,context}=setup();await expect(guard.canActivate(context)).rejects.toThrow("Verified identity");
 });
 it("rejects a valid JWT when workspace membership is absent",async()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("AUTH_JWT_SECRET",secret);vi.stubEnv("AUTH_JWT_ISSUER","https://identity.test");vi.stubEnv("AUTH_JWT_AUDIENCE","authenticated");
  const {guard,context,request,db}=setup();request.headers.authorization=`Bearer ${await new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject("subject-a").setIssuer("https://identity.test").setAudience("authenticated").setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(secret))}`;
  await expect(guard.canActivate(context)).rejects.toThrow("Workspace access denied");
  expect(db.membership.findFirst).toHaveBeenCalledWith({where:{userId:"user-a",workspaceId:"workspace-b"}});
 });
 it("rejects wrong JWT audience before querying memberships",async()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("AUTH_JWT_SECRET",secret);vi.stubEnv("AUTH_JWT_ISSUER","https://identity.test");vi.stubEnv("AUTH_JWT_AUDIENCE","authenticated");
  const {guard,context,request,db}=setup({role:"OWNER"});request.headers.authorization=`Bearer ${await new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject("subject-a").setIssuer("https://identity.test").setAudience("wrong-app").setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(secret))}`;
  await expect(guard.canActivate(context)).rejects.toThrow("Invalid or expired");expect(db.membership.findFirst).not.toHaveBeenCalled();
 });
});
describe("tenant token vault",()=>{
 it("requires the same workspace and account context to decrypt",()=>{
  const vault=new TokenVault(randomBytes(32).toString("base64"));const token=vault.encrypt("private-token","workspace-a:account-a");
  expect(vault.decrypt(token,"workspace-a:account-a")).toBe("private-token");
  expect(()=>vault.decrypt(token,"workspace-b:account-a")).toThrow();
 });
});
