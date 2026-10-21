import { describe, expect, it } from "vitest";
import { validVideoPlan, type VideoEditPlan } from "./video-edit-plan";
const plan: VideoEditPlan = {
  title: "Kuala Lumpur",
  captions: [{ text: "Sunrise", start: 0, end: 2 }],
  scenes: [
    { text: "A wide shot of the skyline. ".repeat(9), start: 0, end: 2 },
  ],
};
describe("AI video plans before applying edits", () => {
  it("allows scene suggestions longer than captions", () =>
    expect(validVideoPlan(plan, 5)).toBe(true));
  it("rejects caption times outside the selected trim and oversized captions", () => {
    expect(
      validVideoPlan(
        { ...plan, captions: [{ text: "Outside", start: 0, end: 6 }] },
        5,
      ),
    ).toBe(false);
    expect(
      validVideoPlan(
        { ...plan, captions: [{ text: "x".repeat(121), start: 0, end: 1 }] },
        5,
      ),
    ).toBe(false);
  });
  it("rejects empty plans and invalid timelines", () => {
    expect(validVideoPlan(null as unknown as VideoEditPlan, 5)).toBe(false);
    expect(
      validVideoPlan(
        { ...plan, scenes: [{ text: "Scene", start: 2, end: 1 }] },
        5,
      ),
    ).toBe(false);
    expect(validVideoPlan({ ...plan, title: "" }, 5)).toBe(false);
  });
});
