import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateCost, MemoryUsageStore, OpenAiContentProvider } from "./index";
afterEach(() => vi.unstubAllGlobals());
describe("estimateCost", () => {
  it("keeps nano below mini", () => expect(estimateCost("gpt-4.1-nano", 1000, 1000)).toBeLessThan(estimateCost("gpt-4.1-mini", 1000, 1000)));
});

describe("OpenAI SDK response compatibility", () => {
  const input = { workspaceId: "sdk-fixture", brandName: "Orbit", voice: "Clear", audience: "Creators", topic: "Launch", platforms: ["threads" as const] };
  const variant = { platform: "threads", copy: "Create with Orbit.", hashtags: ["#Orbit"], callToAction: "Start creating" };
  function transport(content: unknown) {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "resp_fixture", object: "response", status: "completed", model: "gpt-4.1-mini",
      output: [{ id: "msg_fixture", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(content), annotations: [] }] }],
      usage: { input_tokens: 42, output_tokens: 20, total_tokens: 62 },
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
  }
  it("sends the structured response request, validates SDK output, and reuses the workspace cache", async () => {
    const fetcher = transport({ variants: [variant] });
    const provider = new OpenAiContentProvider(new MemoryUsageStore(), { apiKey: "sdk_fixture_key" });
    const result = await provider.generateVariants(input);
    expect(result.variants).toEqual([variant]);
    expect(result.usage).toMatchObject({ inputTokens: 42, outputTokens: 20, cached: false });
    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, name: "social_variants" });
    expect(body.max_output_tokens).toBe(1200);
    expect((await provider.generateVariants(input)).usage.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("rejects invalid provider content without caching it", async () => {
    transport({ variants: [{ ...variant, platform: "unsupported" }] });
    const store = new MemoryUsageStore(), save = vi.spyOn(store, "save");
    await expect(new OpenAiContentProvider(store, { apiKey: "sdk_fixture_key" }).generateVariants(input)).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
});
