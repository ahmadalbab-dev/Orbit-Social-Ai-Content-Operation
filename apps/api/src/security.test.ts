import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import type { ExecutionContext } from "@nestjs/common";
import { TenantAuthGuard } from "./security";
function context(name: string, headers: Record<string,string> = {}, method = "POST") {
  const request = { headers, method };
  return { request, context: { getHandler: () => ({ name }), switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
}
async function token(role: string, workspaces: string[], issuer = "https://project.supabase.co/auth/v1", audience = "authenticated") { return new SignJWT({ app_metadata: { workspace_ids: workspaces, workspace_role: role } }).setProtectedHeader({ alg: "HS256" }).setSubject("user").setIssuer(issuer).setAudience(audience).setExpirationTime("5m").sign(new TextEncoder().encode("test-secret")); }
describe("tenant authorization", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("allows public health and rejects absent auth by default", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SUPABASE_JWT_SECRET", "");
    const guard = new TenantAuthGuard();
    expect(await guard.canActivate(context("health").context)).toBe(true);
    await expect(guard.canActivate(context("generate", { "x-workspace-id": "w" }).context)).rejects.toThrow();
  });
  it("cannot enable local demo in production", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("AUTH_MODE", "local-demo"); vi.stubEnv("SUPABASE_JWT_SECRET", "");
    await expect(new TenantAuthGuard().canActivate(context("generate", { "x-workspace-id": "w" }).context)).rejects.toThrow();
  });
  it("checks signed workspace access and approval role", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret"); vi.stubEnv("SUPABASE_JWT_ISSUER", "https://project.supabase.co/auth/v1"); vi.stubEnv("SUPABASE_JWT_AUDIENCE", "authenticated");
    const guard = new TenantAuthGuard();
    const editor = await token("editor", ["w"]);
    await expect(guard.canActivate(context("generate", { "x-workspace-id": "other", authorization: `Bearer ${editor}` }).context)).rejects.toThrow("Workspace access");
    await expect(guard.canActivate(context("approve", { "x-workspace-id": "w", authorization: `Bearer ${editor}` }).context)).rejects.toThrow("Approval role");
    expect(await guard.canActivate(context("generate", { "x-workspace-id": "w", authorization: `Bearer ${editor}` }).context)).toBe(true);
    const approver = await token("approver", ["w"]);
    expect(await guard.canActivate(context("approve", { "x-workspace-id": "w", authorization: `Bearer ${approver}` }).context)).toBe(true);
    await expect(guard.canActivate(context("review", { "x-workspace-id": "w", authorization: `Bearer ${approver}` }).context)).rejects.toThrow("Editing role");
  });
  it("fails closed when issuer or audience configuration is missing", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret");
    const signed = await token("owner", ["w"]);
    const ctx = context("generate", { "x-workspace-id": "w", authorization: `Bearer ${signed}` });
    vi.stubEnv("SUPABASE_JWT_ISSUER", ""); vi.stubEnv("SUPABASE_JWT_AUDIENCE", "authenticated");
    await expect(new TenantAuthGuard().canActivate(ctx.context)).rejects.toThrow("verification configuration");
    vi.stubEnv("SUPABASE_JWT_ISSUER", "https://project.supabase.co/auth/v1"); vi.stubEnv("SUPABASE_JWT_AUDIENCE", "");
    await expect(new TenantAuthGuard().canActivate(ctx.context)).rejects.toThrow("verification configuration");
  });
  it("rejects tokens signed for a different issuer or audience", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret");
    vi.stubEnv("SUPABASE_JWT_ISSUER", "https://project.supabase.co/auth/v1"); vi.stubEnv("SUPABASE_JWT_AUDIENCE", "authenticated");
    for (const signed of [await token("owner", ["w"], "https://other.supabase.co/auth/v1"), await token("owner", ["w"], "https://project.supabase.co/auth/v1", "other-app")]) {
      await expect(new TenantAuthGuard().canActivate(context("generate", { "x-workspace-id": "w", authorization: `Bearer ${signed}` }).context)).rejects.toThrow("Invalid token");
    }
  });

  it("bounds workspace headers even in local demo", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("AUTH_MODE", "local-demo");
    for (const workspace of ["", "a".repeat(101), "../other", "with spaces"]) {
      await expect(new TenantAuthGuard().canActivate(context("generate", { "x-workspace-id": workspace }).context)).rejects.toThrow("Valid workspace");
    }
  });

});
