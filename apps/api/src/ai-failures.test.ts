import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBudgetExceededError, AiProviderError, HuggingFaceContentProvider, HuggingFaceVideoPlanner } from "@sma/ai";
import { WorkflowService } from "./workflow.service";
import { VideoAiService } from "./video-ai.service";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
import type { ImageAiService } from "./image-ai.service";

const identity = { sub: "subject", userId: "user", workspaceId: "workspace", role: "OWNER" };
const input = { brandId: "brand", topic: "A product introduction", platforms: ["facebook"] };
function studio() {
  const aiQuota = { upsert: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
  const contentItem = { create: vi.fn() };
  const db = {
    brand: { findFirst: vi.fn().mockResolvedValue({ id: "brand", name: "Orbit", voice: "Clear", audience: "Creators", guidelines: {} }) },
    workspace: { findUniqueOrThrow: vi.fn().mockResolvedValue({ monthlyAiBudgetUsd: 10 }) },
    aiQuota, contentItem,
  } as unknown as DatabaseService;
  const billing = { requirePaidAccess: vi.fn() } as unknown as BillingService;
  return { service: new WorkflowService(db, billing), aiQuota, contentItem };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("actionable AI failures after dispatch", () => {
  it.each(["timeout", "rate_limited", "invalid_response", "unconfigured"] as const)("preserves safe %s guidance in Studio without losing metering", async code => {
    vi.stubEnv("HF_TOKEN", "fixture");
    const failure = new AiProviderError(code);
    failure.message = "raw upstream text containing private credentials";
    vi.spyOn(HuggingFaceContentProvider.prototype, "generateVariants").mockRejectedValue(failure);
    const ctx = studio();
    const error = await ctx.service.generate(identity, input).catch(error => error);
    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toMatchObject({ code: `AI_${code.toUpperCase()}`, message: new AiProviderError(code).message });
    expect(JSON.stringify(error.getResponse())).not.toContain("private credentials");
    expect(ctx.aiQuota.updateMany).toHaveBeenCalledOnce();
    expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });

  it("reports an exhausted budget instead of asking for endless retries", async () => {
    vi.stubEnv("HF_TOKEN", "fixture");
    vi.spyOn(HuggingFaceContentProvider.prototype, "generateVariants").mockRejectedValue(new AiBudgetExceededError("private budget details"));
    const ctx = studio();
    const error = await ctx.service.generate(identity, input).catch(error => error);
    expect(error.getStatus()).toBe(403);
    expect(error.message).toBe("Workspace AI budget reached. Contact your workspace administrator.");
    expect(ctx.contentItem.create).not.toHaveBeenCalled();
  });

  it("keeps unexpected Studio failures private", async () => {
    vi.stubEnv("HF_TOKEN", "fixture");
    vi.spyOn(HuggingFaceContentProvider.prototype, "generateVariants").mockRejectedValue(Error("secret database or provider details"));
    const error = await studio().service.generate(identity, input).catch(error => error);
    expect(error.getStatus()).toBe(503);
    expect(error.message).toBe("AI generation did not complete; retry later");
  });

  it("shows a useful timeout for video planning and keeps the shared attempt charged", async () => {
    vi.stubEnv("HF_TOKEN", "fixture");
    const reserveAttempt = vi.fn();
    const service = new VideoAiService({ reserveAttempt } as unknown as ImageAiService);
    vi.spyOn(HuggingFaceVideoPlanner.prototype, "plan").mockRejectedValue(new AiProviderError("timeout"));
    const error = await service.plan(identity, { brief: "Introduce a product", duration: 10 }).catch(error => error);
    expect(error.getResponse()).toMatchObject({ code: "AI_TIMEOUT", message: "AI took too long. Try again later." });
    expect(reserveAttempt).toHaveBeenCalledExactlyOnceWith(identity);
  });
});
