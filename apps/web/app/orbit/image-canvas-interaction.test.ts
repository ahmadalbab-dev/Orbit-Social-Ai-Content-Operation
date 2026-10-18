import { describe, expect, it } from "vitest";
import { boundedZoom, canvasPercent, draggedImageLayer, gestureDistance, hitImageLayer, imageLayerBounds } from "./image-canvas-interaction";
import { applyImageStylePreset, applyImageTemplate, freshComposition, type Overlay } from "./image-composition";
const image = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
const layer: Overlay = { id: "logo", name: "logo", image, x: 50, y: 50, width: 40, opacity: 100 };
describe("image canvas interaction", () => {
  it("maps pointer coordinates through transformed canvas bounds so dragging respects preview zoom", () => {
    const start = canvasPercent({ x: 150, y: 200 }, { left: 50, top: 100, width: 200, height: 200 });
    const end = canvasPercent({ x: 190, y: 220 }, { left: 50, top: 100, width: 200, height: 200 });
    expect(draggedImageLayer({ x: 50, y: 50 }, start, end)).toEqual({ x: 70, y: 60 });
    expect(draggedImageLayer({ x: 50, y: 50 }, start, { x: 300, y: -200 })).toEqual({ x: 100, y: 0 });
  });
  it("hits topmost visible layer using actual image aspect ratio", () => {
    expect(imageLayerBounds(layer, 1)).toEqual({ left: 30, top: 40, width: 40, height: 20 });
    expect(hitImageLayer([layer, { ...layer, id: "front" }], { x: 50, y: 50 }, 1)?.id).toBe("front");
    expect(hitImageLayer([layer, { ...layer, id: "hidden", opacity: 0 }], { x: 50, y: 50 }, 1)?.id).toBe("logo");
    expect(hitImageLayer([layer], { x: 50, y: 20 }, 1)).toBeUndefined();
  });
  it("bounds pinch or wheel zoom without altering composition coordinates", () => {
    expect(gestureDistance([{ x: 0, y: 0 }, { x: 30, y: 40 }])).toBe(50);
    expect(boundedZoom(.5)).toBe(1); expect(boundedZoom(10)).toBe(4);
  });
  it("template and style choices preserve the user's existing caption", () => {
    const state = { ...freshComposition(), caption: "My exact Bahasa Melayu headline" };
    expect(applyImageTemplate(state, "poster").caption).toBe(state.caption);
    const styled = applyImageStylePreset(state, "night-launch");
    expect(styled.caption).toBe(state.caption); expect(styled.ratio).toBe("9:16"); expect(styled.background).toBe("#17212d");
  });
});
