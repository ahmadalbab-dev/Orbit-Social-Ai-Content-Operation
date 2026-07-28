import { describe, expect, it } from "vitest";
import { estimateCost } from "./index";
describe("estimateCost", () => {
  it("keeps nano below mini", () => expect(estimateCost("gpt-4.1-nano", 1000, 1000)).toBeLessThan(estimateCost("gpt-4.1-mini", 1000, 1000)));
});
