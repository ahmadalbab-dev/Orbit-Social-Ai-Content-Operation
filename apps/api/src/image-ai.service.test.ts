import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageAiService } from "./image-ai.service";
import { AiProviderError, GeminiImageEditor, HuggingFaceImageEditor } from "@sma/ai";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
const identity = {
  workspaceId: "ws",
  userId: "user",
  sub: "subject",
  role: "OWNER",
};
const input = {
  imageDataUrl: `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`,
  prompt: "Edit blue",
};
function setup(count = 1) {
  const upsert = vi.fn().mockResolvedValue({});
  const updateMany = vi.fn().mockResolvedValue({ count });
  const requirePaidAccess = vi.fn().mockResolvedValue(undefined);
  return {
    upsert,
    updateMany,
    requirePaidAccess,
    service: new ImageAiService(
      { aiQuota: { upsert, updateMany } } as unknown as DatabaseService,
      { requirePaidAccess } as unknown as BillingService,
    ),
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("Image AI metering", () => {
  it("returns truthful configuration without claiming provider verification", () => {
    vi.stubEnv("HF_TOKEN", "");
    expect(setup().service.status()).toMatchObject({
      configured: false,
      verified: false,
    });
  });
  it("rejects malformed input before billing or quota", async () => {
    const ctx = setup();
    await expect(ctx.service.edit(identity, {})).rejects.toThrow();
    expect(ctx.upsert).not.toHaveBeenCalled();
    expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
  });
  it("checks billing before reserving and atomically bounds quota", async () => {
    vi.stubEnv("HF_TOKEN", "hf_test");
    const ctx = setup(0);
    const provider = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
    await expect(ctx.service.edit(identity, input)).rejects.toThrow(
      "quota reached",
    );
    expect(ctx.requirePaidAccess).toHaveBeenCalledWith("ws");
    expect(ctx.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws",
          used: { lt: 100 },
        }),
        data: { used: { increment: 1 } },
      }),
    );
    expect(provider).not.toHaveBeenCalled();
  });
  it("rejects read-only users before provider invocation", async () => {
    await expect(
      setup().service.edit({ ...identity, role: "VIEWER" }, input),
    ).rejects.toThrow("Role");
  });
  it("keeps dispatched failed attempts metered and masks errors", async () => {
    vi.stubEnv("HF_TOKEN", "hf_test");
    const ctx = setup();
    vi.spyOn(HuggingFaceImageEditor.prototype, "edit").mockRejectedValue(
      Error("secret raw payload"),
    );
    await expect(ctx.service.edit(identity, input)).rejects.toThrow(
      "AI image editing did not complete",
    );
    expect(ctx.updateMany).toHaveBeenCalledTimes(1);
  });
  it.each([
    "insert music",
    "insertmusic",
    "tambah lagu latar",
    "masukkan audio",
  ])(
    "routes unsupported sound instruction before quota: %s",
    async (prompt) => {
      vi.stubEnv("HF_TOKEN", "hf_test");
      const ctx = setup();
      const provider = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
      await expect(
        ctx.service.edit(identity, { ...input, prompt }),
      ).rejects.toThrow("Music cannot be embedded");
      expect(provider).not.toHaveBeenCalled();
      expect(ctx.updateMany).not.toHaveBeenCalled();
      expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
    },
  );
  it.each(["access_denied", "credits_unavailable", "rate_limited"] as const)(
    "preserves safe provider classification %s",
    async (code) => {
      vi.stubEnv("HF_TOKEN", "hf_test");
      const ctx = setup();
      vi.spyOn(HuggingFaceImageEditor.prototype, "edit").mockRejectedValue(
        new AiProviderError(code),
      );
      try {
        await ctx.service.edit(identity, input);
        throw Error("should reject");
      } catch (error) {
        const response = (
          error as { getResponse: () => unknown }
        ).getResponse();
        expect(response).toMatchObject({ code: `AI_${code.toUpperCase()}` });
      }
      expect(ctx.updateMany).toHaveBeenCalledTimes(1);
    },
  );
});

describe('explicit Gemini image selection', () => {
  it('reports selected provider/model without returning keys or implying a live verification', async () => {
    vi.stubEnv('AI_IMAGE_PROVIDER', 'gemini'); vi.stubEnv('GEMINI_API_KEY', 'gemini_fixture'); vi.stubEnv('HF_TOKEN', 'hf_retained');
    const status = setup().service.status(); expect(status).toMatchObject({ configured: true, provider: 'gemini', model: 'gemini-nano-banana-2.1', verified: false }); expect(JSON.stringify(status)).not.toContain('gemini_fixture'); expect(JSON.stringify(status)).not.toContain('hf_retained');
  });
  it('uses Gemini only after billing and quota, retaining the independent HF key without fallback', async () => {
    vi.stubEnv('AI_IMAGE_PROVIDER', 'gemini'); vi.stubEnv('GEMINI_API_KEY', 'gemini_fixture'); vi.stubEnv('HF_TOKEN', 'hf_retained');
    const ctx = setup(), output = { bytes: new Uint8Array([1]), contentType: 'image/png' };
    const gemini = vi.spyOn(GeminiImageEditor.prototype, 'edit').mockResolvedValue(output), hf = vi.spyOn(HuggingFaceImageEditor.prototype, 'edit');
    expect(await ctx.service.edit(identity, input)).toBe(output); expect(ctx.requirePaidAccess).toHaveBeenCalledOnce(); expect(ctx.updateMany).toHaveBeenCalledOnce(); expect(gemini).toHaveBeenCalledWith(input); expect(hf).not.toHaveBeenCalled();
  });
  it('keeps a failed Gemini attempt metered without trying the retained HF credentials', async () => {
    vi.stubEnv('AI_IMAGE_PROVIDER', 'gemini'); vi.stubEnv('GEMINI_API_KEY', 'gemini_fixture'); vi.stubEnv('HF_TOKEN', 'hf_retained');
    const ctx = setup(); vi.spyOn(GeminiImageEditor.prototype, 'edit').mockRejectedValue(new AiProviderError('credits_unavailable')); const hf = vi.spyOn(HuggingFaceImageEditor.prototype, 'edit');
    await expect(ctx.service.edit(identity, input)).rejects.toThrow('credits are unavailable'); expect(ctx.updateMany).toHaveBeenCalledOnce(); expect(hf).not.toHaveBeenCalled();
  });
  it('fails closed before quota when explicit Gemini configuration is absent or invalid', async () => {
    vi.stubEnv('HF_TOKEN', 'hf_retained'); vi.stubEnv('AI_IMAGE_PROVIDER', 'gemini'); vi.stubEnv('GEMINI_API_KEY', '');
    const ctx = setup(); await expect(ctx.service.edit(identity, input)).rejects.toThrow('not configured'); expect(ctx.updateMany).not.toHaveBeenCalled(); expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
    vi.stubEnv('GEMINI_API_KEY', 'invalid\nkey'); expect(ctx.service.status().configured).toBe(false);
    vi.stubEnv('AI_IMAGE_PROVIDER', 'other'); expect(ctx.service.status()).toMatchObject({ configured: false, provider: null, model: null });
  });
  it('preserves HF as default even when a Gemini key exists', () => {
    vi.stubEnv('AI_IMAGE_PROVIDER', 'huggingface'); vi.stubEnv('HF_TOKEN', 'hf_retained'); vi.stubEnv('GEMINI_API_KEY', 'gemini_fixture');
    expect(setup().service.status()).toMatchObject({ provider: 'fal-ai', configured: true, verified: false });
  });
});
