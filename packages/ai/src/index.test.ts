import { describe, expect, it } from "vitest";
import { estimateCost, MemoryUsageStore } from "./index";
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
