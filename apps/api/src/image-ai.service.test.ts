import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageAiService } from "./image-ai.service";
import {
  AiProviderError,
  CloudflareImageEditor,
  GeminiImageEditor,
  HuggingFaceImageEditor,
} from "@sma/ai";
import type { DatabaseService } from "./database.service";
import type { BillingService } from "./billing.service";
const identity = {
  workspaceId: "ws",
  userId: "user",
  sub: "subject",
  role: "OWNER",
};
const input = {
  imageDataUrl: `data:image/png;base64,${Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=", "base64").toString("base64")}`,
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

describe("Cloudflare text-to-image generation", () => {
  const prompt = {prompt: "A ceramic cup on a blue table"};
  function configure() {
    vi.stubEnv("AI_IMAGE_PROVIDER", "cloudflare");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "cloudflare_fixture");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "a".repeat(32));
  }
  it("advertises generation only for configured, explicitly selected Cloudflare", () => {
    configure();
    expect(setup().service.status().canGenerate).toBe(true);
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    expect(setup().service.status().canGenerate).toBe(false);
    vi.stubEnv("AI_IMAGE_PROVIDER", "gemini"); vi.stubEnv("GEMINI_API_KEY", "retained-key");
    expect(setup().service.status()).toMatchObject({configured: true, canGenerate: false});
  });
  it("checks role and strict input before billing, quota and generation", async () => {
    configure();
    const ctx = setup(), cf = vi.spyOn(CloudflareImageEditor.prototype, "generate");
    await expect(ctx.service.generate({...identity, role: "VIEWER"}, prompt)).rejects.toThrow("Role");
    for (const value of [{}, {prompt: " "}, {prompt: "x".repeat(1501)}, {...prompt, url: "https://private.test/image"}, {...prompt, imageDataUrl: input.imageDataUrl}])
      await expect(ctx.service.generate(identity, value)).rejects.toThrow("only a prompt");
    expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
    expect(ctx.upsert).not.toHaveBeenCalled(); expect(ctx.updateMany).not.toHaveBeenCalled();
    expect(cf).not.toHaveBeenCalled();
  });
  it("reserves one shared attempt before dispatching a trimmed prompt without an image", async () => {
    configure();
    const ctx = setup(), output = {bytes: new Uint8Array([1]), contentType: "image/png"};
    const cf = vi.spyOn(CloudflareImageEditor.prototype, "generate").mockResolvedValue(output);
    const edit = vi.spyOn(CloudflareImageEditor.prototype, "edit");
    expect(await ctx.service.generate(identity, {prompt: `  ${prompt.prompt}  `})).toBe(output);
    expect(ctx.requirePaidAccess).toHaveBeenCalledExactlyOnceWith("ws");
    expect(ctx.updateMany).toHaveBeenCalledOnce();
    expect(ctx.updateMany).toHaveBeenCalledWith(expect.objectContaining({where: expect.objectContaining({workspaceId: "ws", used: {lt: 100}}), data: {used: {increment: 1}}}));
    expect(ctx.updateMany.mock.invocationCallOrder[0]).toBeLessThan(cf.mock.invocationCallOrder[0]);
    expect(cf).toHaveBeenCalledExactlyOnceWith(prompt);
    expect(edit).not.toHaveBeenCalled();
  });
  it("rejects unavailable configuration and other selected providers without reserving quota or falling back", async () => {
    configure();
    const ctx = setup(), cf = vi.spyOn(CloudflareImageEditor.prototype, "generate");
    const hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit"), gemini = vi.spyOn(GeminiImageEditor.prototype, "edit");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    await expect(ctx.service.generate(identity, prompt)).rejects.toThrow("not configured");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "retained-token"); vi.stubEnv("AI_IMAGE_PROVIDER", "gemini"); vi.stubEnv("GEMINI_API_KEY", "retained-key");
    await expect(ctx.service.generate(identity, prompt)).rejects.toThrow("not configured");
    expect(ctx.requirePaidAccess).not.toHaveBeenCalled(); expect(ctx.updateMany).not.toHaveBeenCalled();
    expect(cf).not.toHaveBeenCalled(); expect(hf).not.toHaveBeenCalled(); expect(gemini).not.toHaveBeenCalled();
  });
  it("does not dispatch after billing denial or exhausted quota", async () => {
    configure();
    const cf = vi.spyOn(CloudflareImageEditor.prototype, "generate");
    const quota = setup(0);
    await expect(quota.service.generate(identity, prompt)).rejects.toThrow("quota reached");
    const billing = setup(); billing.requirePaidAccess.mockRejectedValue(Error("billing denied"));
    await expect(billing.service.generate(identity, prompt)).rejects.toThrow("billing denied");
    expect(billing.updateMany).not.toHaveBeenCalled(); expect(cf).not.toHaveBeenCalled();
  });
  it("keeps a failed dispatch metered once and preserves safe errors without fallback", async () => {
    configure();
    const ctx = setup(), cf = vi.spyOn(CloudflareImageEditor.prototype, "generate").mockRejectedValue(new AiProviderError("rate_limited"));
    const hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit"), gemini = vi.spyOn(GeminiImageEditor.prototype, "edit");
    await expect(ctx.service.generate(identity, prompt)).rejects.toMatchObject({response: expect.objectContaining({code: "AI_RATE_LIMITED"})});
    expect(ctx.updateMany).toHaveBeenCalledOnce(); expect(cf).toHaveBeenCalledOnce();
    expect(hf).not.toHaveBeenCalled(); expect(gemini).not.toHaveBeenCalled();
  });
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

describe("explicit Gemini image selection", () => {
  it("reports selected provider/model without returning keys or implying a live verification", async () => {
    vi.stubEnv("AI_IMAGE_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "gemini_fixture");
    vi.stubEnv("HF_TOKEN", "hf_retained");
    const status = setup().service.status();
    expect(status).toMatchObject({
      configured: true,
      provider: "gemini",
      model: "gemini-nano-banana-2.1",
      verified: false,
    });
    expect(JSON.stringify(status)).not.toContain("gemini_fixture");
    expect(JSON.stringify(status)).not.toContain("hf_retained");
  });
  it("uses Gemini only after billing and quota, retaining the independent HF key without fallback", async () => {
    vi.stubEnv("AI_IMAGE_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "gemini_fixture");
    vi.stubEnv("HF_TOKEN", "hf_retained");
    const ctx = setup(),
      output = { bytes: new Uint8Array([1]), contentType: "image/png" };
    const gemini = vi
        .spyOn(GeminiImageEditor.prototype, "edit")
        .mockResolvedValue(output),
      hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
    expect(await ctx.service.edit(identity, input)).toBe(output);
    expect(ctx.requirePaidAccess).toHaveBeenCalledOnce();
    expect(ctx.updateMany).toHaveBeenCalledOnce();
    expect(gemini).toHaveBeenCalledWith(input);
    expect(hf).not.toHaveBeenCalled();
  });
  it("keeps a failed Gemini attempt metered without trying the retained HF credentials", async () => {
    vi.stubEnv("AI_IMAGE_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "gemini_fixture");
    vi.stubEnv("HF_TOKEN", "hf_retained");
    const ctx = setup();
    vi.spyOn(GeminiImageEditor.prototype, "edit").mockRejectedValue(
      new AiProviderError("credits_unavailable"),
    );
    const hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
    await expect(ctx.service.edit(identity, input)).rejects.toThrow(
      "credits are unavailable",
    );
    expect(ctx.updateMany).toHaveBeenCalledOnce();
    expect(hf).not.toHaveBeenCalled();
  });
  it("fails closed before quota when explicit Gemini configuration is absent or invalid", async () => {
    vi.stubEnv("HF_TOKEN", "hf_retained");
    vi.stubEnv("AI_IMAGE_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    const ctx = setup();
    await expect(ctx.service.edit(identity, input)).rejects.toThrow(
      "not configured",
    );
    expect(ctx.updateMany).not.toHaveBeenCalled();
    expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
    vi.stubEnv("GEMINI_API_KEY", "invalid\nkey");
    expect(ctx.service.status().configured).toBe(false);
    vi.stubEnv("AI_IMAGE_PROVIDER", "other");
    expect(ctx.service.status()).toMatchObject({
      configured: false,
      provider: null,
      model: null,
    });
  });
  it("preserves HF as default even when a Gemini key exists", () => {
    vi.stubEnv("AI_IMAGE_PROVIDER", "huggingface");
    vi.stubEnv("HF_TOKEN", "hf_retained");
    vi.stubEnv("GEMINI_API_KEY", "gemini_fixture");
    expect(setup().service.status()).toMatchObject({
      provider: "fal-ai",
      configured: true,
      verified: false,
    });
  });
});

describe("explicit Cloudflare image selection", () => {
  const account = "0123456789abcdef0123456789abcdef";
  function configure() {
    vi.stubEnv("AI_IMAGE_PROVIDER", "cloudflare");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "cloudflare_fixture");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", account);
    vi.stubEnv("HF_TOKEN", "hf_retained");
    vi.stubEnv("GEMINI_API_KEY", "gemini_retained");
  }
  it("reports configuration without exposing credential or account identifiers", () => {
    configure();
    const status = setup().service.status();
    expect(status).toMatchObject({
      configured: true,
      provider: "cloudflare",
      model: "@cf/black-forest-labs/flux-2-klein-4b",
      verified: false,
    });
    for (const value of [
      account,
      "cloudflare_fixture",
      "hf_retained",
      "gemini_retained",
    ])
      expect(JSON.stringify(status)).not.toContain(value);
  });
  it("dispatches only to Cloudflare after existing billing and atomic quota checks", async () => {
    configure();
    const ctx = setup();
    const output = { bytes: new Uint8Array([1]), contentType: "image/png" };
    const cf = vi
      .spyOn(CloudflareImageEditor.prototype, "edit")
      .mockResolvedValue(output);
    const hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
    const gemini = vi.spyOn(GeminiImageEditor.prototype, "edit");
    expect(await ctx.service.edit(identity, input)).toBe(output);
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
    expect(ctx.requirePaidAccess.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.updateMany.mock.invocationCallOrder[0],
    );
    expect(ctx.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      cf.mock.invocationCallOrder[0],
    );
    expect(cf).toHaveBeenCalledWith(input);
    expect(hf).not.toHaveBeenCalled();
    expect(gemini).not.toHaveBeenCalled();
  });
  it.each(["access_denied", "credits_unavailable", "rate_limited"] as const)(
    "retains safe %s classification and metering without a provider fallback",
    async (code) => {
      configure();
      const ctx = setup();
      vi.spyOn(CloudflareImageEditor.prototype, "edit").mockRejectedValue(
        new AiProviderError(code),
      );
      const hf = vi.spyOn(HuggingFaceImageEditor.prototype, "edit");
      const gemini = vi.spyOn(GeminiImageEditor.prototype, "edit");
      await expect(ctx.service.edit(identity, input)).rejects.toMatchObject({
        response: expect.objectContaining({ code: `AI_${code.toUpperCase()}` }),
      });
      expect(ctx.updateMany).toHaveBeenCalledOnce();
      expect(hf).not.toHaveBeenCalled();
      expect(gemini).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["", account],
    ["token\nvalue", account],
    ["token value", account],
    ["token\tvalue", account],
    ["tokené", account],
    ["x".repeat(1025), account],
    ["token", ""],
    ["token", "bad-account"],
    ["token", `${account}/requests`],
    ["token", ` ${account}`],
    ["token", `${account}\n`],
  ])(
    "rejects missing or invalid Cloudflare credentials before billing or quota",
    async (token, accountId) => {
      configure();
      vi.stubEnv("CLOUDFLARE_API_TOKEN", token);
      vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", accountId);
      const ctx = setup();
      const cf = vi.spyOn(CloudflareImageEditor.prototype, "edit");
      expect(ctx.service.status()).toMatchObject({
        provider: "cloudflare",
        configured: false,
        verified: false,
      });
      await expect(ctx.service.edit(identity, input)).rejects.toThrow(
        "not configured",
      );
      expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
      expect(ctx.upsert).not.toHaveBeenCalled();
      expect(ctx.updateMany).not.toHaveBeenCalled();
      expect(cf).not.toHaveBeenCalled();
    },
  );
  it.each([
    [512, 1],
    [1, 512],
    [0, 1],
  ])(
    "rejects Cloudflare dimensions %s x %s before billing or quota",
    async (width, height) => {
      configure();
      const ctx = setup();
      const cf = vi.spyOn(CloudflareImageEditor.prototype, "edit");
      const bytes = Buffer.from(input.imageDataUrl.split(",")[1], "base64");
      bytes.writeUInt32BE(width, 16);
      bytes.writeUInt32BE(height, 20);
      await expect(
        ctx.service.edit(identity, {
          ...input,
          imageDataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
        }),
      ).rejects.toThrow("smaller than 512");
      expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
      expect(ctx.upsert).not.toHaveBeenCalled();
      expect(ctx.updateMany).not.toHaveBeenCalled();
      expect(cf).not.toHaveBeenCalled();
    },
  );

  it("does not dispatch after workspace quota is exhausted", async () => {
    configure();
    const ctx = setup(0);
    const cf = vi.spyOn(CloudflareImageEditor.prototype, "edit");
    await expect(ctx.service.edit(identity, input)).rejects.toThrow(
      "quota reached",
    );
    expect(cf).not.toHaveBeenCalled();
  });
  it("does not dispatch for a read-only workspace member", async () => {
    configure();
    const ctx = setup();
    const cf = vi.spyOn(CloudflareImageEditor.prototype, "edit");
    await expect(
      ctx.service.edit({ ...identity, role: "VIEWER" }, input),
    ).rejects.toThrow("Role");
    expect(ctx.requirePaidAccess).not.toHaveBeenCalled();
    expect(cf).not.toHaveBeenCalled();
  });
  it("does not auto-select Cloudflare merely because its credentials exist", () => {
    configure();
    delete process.env.AI_IMAGE_PROVIDER;
    expect(setup().service.status()).toMatchObject({
      provider: "fal-ai",
      configured: true,
      verified: false,
    });
  });
});
