import { describe, expect, it, vi } from "vitest";
import { estimateCost, MemoryUsageStore, OpenAiContentProvider } from "./index";
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create }; } }));
describe("estimateCost", () => {
  it("keeps nano below mini", () => expect(estimateCost("gpt-4.1-nano", 1000, 1000)).toBeLessThan(estimateCost("gpt-4.1-mini", 1000, 1000)));
});
describe("MemoryUsageStore", () => {
  it("counts workspace spend across requests without charging cache hits", async () => {
    const store = new MemoryUsageStore();
    const usage = { requestHash: "one", model: "test", inputTokens: 1, outputTokens: 1, estimatedCostUsd: 0.25, cached: false };
    await store.save("one", [], usage);
    await store.save("one", [], { ...usage, requestHash: "two", estimatedCostUsd: 0.5 });
    await store.save("two", [], usage);
    await store.save("one", [], { ...usage, cached: true });
    expect(await store.monthlyCost("one")).toBe(0.75);
    expect(await store.monthlyCost("two")).toBe(0.25);
  });
});

describe("bounded demo cache", () => {
  it("accounts for paid malformed output before rejecting it and blocks another paid request", async () => {
    create.mockReset().mockResolvedValue({ output_text: "invalid JSON", usage: { input_tokens: 1000000, output_tokens: 0 } });
    const store = new MemoryUsageStore();
    const provider = new OpenAiContentProvider(store, { apiKey: "mock-only", monthlyBudgetUsd: 0.1 });
    const input = { workspaceId: "w", brandName: "A", voice: "B", audience: "C", topic: "KL", platforms: ["facebook" as const] };
    await expect(provider.generateVariants(input)).rejects.toThrow();
    expect(await store.monthlyCost("w")).toBe(0.4);
    await expect(provider.generateVariants(input)).rejects.toThrow("budget reached");
    expect(create).toHaveBeenCalledTimes(1);
  });
  it("expires cached content without resetting current-month spend", async () => {
    const store = new MemoryUsageStore();
    const usage = { requestHash: "expiry", model: "test", inputTokens: 1, outputTokens: 1, estimatedCostUsd: 0.25, cached: false };
    await store.save("w", [], usage);
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 86400001);
    expect(await store.find("w", "expiry")).toBeNull();
    expect(await store.monthlyCost("w")).toBe(0.25);
    clock.mockRestore();
  });
  it("evicts oldest cached content at capacity but retains spend", async () => {
    const store = new MemoryUsageStore();
    for(let i=0;i<201;i++) await store.save("w", [], { requestHash:String(i),model:"test",inputTokens:1,outputTokens:1,estimatedCostUsd:1,cached:false });
    expect(await store.find("w", "0")).toBeNull();
    expect(await store.find("w", "200")).toEqual([]);
    expect(await store.monthlyCost("w")).toBe(201);
  });
});
