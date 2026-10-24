import { afterEach, describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { AppController } from "./app.controller";
import { textAiStatus } from "./text-ai.config";
import { TenantAuthGuard } from "./security";
import type { DatabaseService } from "./database.service";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("AI readiness metadata", () => {
  const gemini = { AI_TEXT_PROVIDER: "gemini", GEMINI_API_KEY: "private-key-fixture" };

  it("discloses Gemini unpaid-data policy before acknowledgement without reporting readiness", () => {
    expect(textAiStatus(gemini)).toEqual({
      configured: false, provider: "gemini", verified: false, model: null,
      privacy: { unpaidDataUse: true, unpaidDataUseAcknowledged: false, previewSharingAllowed: false },
    });
  });

  it("reports a validated Gemini model while preserving separate preview-sharing consent", () => {
    const env = { ...gemini, GEMINI_ALLOW_UNPAID_DATA_USE: "true" };
    expect(textAiStatus(env)).toMatchObject({
      configured: true, verified: false, model: "gemini-3.5-flash-lite",
      privacy: { unpaidDataUse: true, unpaidDataUseAcknowledged: true, previewSharingAllowed: false },
    });
    expect(textAiStatus({ ...env, GEMINI_ALLOW_PREVIEW_SHARING: "true" }).privacy.previewSharingAllowed).toBe(true);
    expect(textAiStatus({ ...env, GEMINI_API_KEY: "", GEMINI_ALLOW_PREVIEW_SHARING: "true" }).privacy.previewSharingAllowed).toBe(false);
  });

  it("never returns credentials, invalid model values or calls providers while checking setup", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const invalidModel = "https://invalid.test/private-model-fixture";
    const result = textAiStatus({ ...gemini, GEMINI_ALLOW_UNPAID_DATA_USE: "true", GEMINI_TEXT_MODEL: invalidModel });
    expect(result).toMatchObject({ configured: false, model: null });
    expect(JSON.stringify(result)).not.toContain(gemini.GEMINI_API_KEY);
    expect(JSON.stringify(result)).not.toContain(invalidModel);
    vi.stubEnv("AI_TEXT_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", gemini.GEMINI_API_KEY);
    vi.stubEnv("GEMINI_ALLOW_UNPAID_DATA_USE", "true");
    const controller = new AppController({} as never, {} as never, {} as never, {} as never);
    expect(controller.aiStatus()).toMatchObject({ configured: true, verified: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not apply Gemini's data policy or sharing flag to a different provider", () => {
    expect(textAiStatus({ AI_TEXT_PROVIDER: "huggingface", HF_TOKEN: "private-hf", GEMINI_ALLOW_UNPAID_DATA_USE: "true", GEMINI_ALLOW_PREVIEW_SHARING: "true" })).toMatchObject({
      configured: true, provider: "huggingface",
      privacy: { unpaidDataUse: false, unpaidDataUseAcknowledged: false, previewSharingAllowed: false },
    });
    const gateway = { AI_TEXT_PROVIDER: "gateway", AI_GATEWAY_API_KEY: "private-gateway", GEMINI_ALLOW_PREVIEW_SHARING: "true" };
    expect(textAiStatus(gateway).privacy.previewSharingAllowed).toBe(false);
    expect(textAiStatus({ ...gateway, AI_GATEWAY_ALLOW_PREVIEW_SHARING: "true" }).privacy.previewSharingAllowed).toBe(true);
  });

  it("keeps the actual status route behind verified identity and workspace membership", async () => {
    const reflector = new Reflector();
    const request = { headers: { "x-workspace-id": "workspace-other" } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => AppController.prototype.aiStatus,
      getClass: () => AppController,
    } as unknown as ExecutionContext;
    const db = { user: { findUnique: vi.fn().mockResolvedValue({ id: "user" }) }, membership: { findFirst: vi.fn().mockResolvedValue(null) } };
    const guard = new TenantAuthGuard(db as unknown as DatabaseService, reflector);
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DEV_AUTH_ENABLED", "false");
    await expect(guard.canActivate(context)).rejects.toThrow("Verified identity is required");
    expect(db.user.findUnique).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("DEV_AUTH_ENABLED", "true");
    await expect(guard.canActivate(context)).rejects.toThrow("Workspace access denied");
    expect(db.membership.findFirst).toHaveBeenCalledWith({ where: { userId: "user", workspaceId: "workspace-other" } });
  });
});
