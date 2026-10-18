import { describe, expect, it, vi } from "vitest";
import { applyImageTemplate, freshComposition, imageCarouselZip, renderImageComposition } from "./image-composition";
function fixture() {
  const context = { clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillText: vi.fn(), measureText: (text: string) => ({ width: text.length * 18 }), globalAlpha: 1 };
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  const image = { naturalWidth: 4000, naturalHeight: 3000 } as HTMLImageElement;
  return { context, canvas, image };
}
describe("image composition export renderer", () => {
  it("renders ordered overlays into the export, using their size, position and opacity", () => {
    const { context, canvas, image } = fixture();
    const logo = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
    const state = freshComposition(image); state.ratio = "1:1";
    state.overlays = [{ id: "one", name: "logo", image: logo, x: 75, y: 25, width: 20, opacity: 40 }, { id: "two", name: "front", image: logo, x: 50, y: 50, width: 50, opacity: 100 }];
    const opacityAtDraw: number[] = [];
    context.drawImage.mockImplementation(() => { opacityAtDraw.push(context.globalAlpha); });
    renderImageComposition(canvas, state);
    expect(opacityAtDraw).toEqual([1, .4, 1]);
    expect(canvas.width).toBe(2048); expect(canvas.height).toBe(2048);
    expect(context.drawImage.mock.calls[1]).toEqual([logo, 1331.2, 409.6, 409.6, 204.8]);
    expect(context.drawImage.mock.calls[2]).toEqual([logo, 512, 768, 1024, 512]);
    // The untemplated source is never painted onto an opaque background.
    expect(context.fillRect).not.toHaveBeenCalled();
  });
  it("applies a template as real editable drawing state, including caption and photo frame", () => {
    const { context, canvas, image } = fixture();
    const original = freshComposition(image), designed = applyImageTemplate(original, "poster");
    renderImageComposition(canvas, designed);
    expect(original.template).toBe("original"); expect(designed.ratio).toBe("4:5");
    expect(context.clip).toHaveBeenCalledOnce(); expect(context.fillRect).toHaveBeenCalled();
    expect(context.fillText.mock.calls.map(call => call[0]).join(" ")).toBe("A FRESH PERSPECTIVE");
    expect(context.drawImage).toHaveBeenCalledOnce();
  });
  it("exports a text template even without an uploaded image", () => {
    const { context, canvas } = fixture(); renderImageComposition(canvas, applyImageTemplate(freshComposition(), "quote"));
    expect(canvas.width).toBe(1080); expect(context.drawImage).not.toHaveBeenCalled(); expect(context.fillText).toHaveBeenCalled();
  });
});
describe("base photo composition", () => {
  it("moves and scales the base frame independently, preserving overlays and exported dimensions", () => {
    const { context, canvas, image } = fixture(), state = freshComposition(image);
    state.baseScale = .5; state.baseX = 25; state.baseY = 50;
    state.overlays = [{ id: "second", name: "second", image, x: 75, y: 50, width: 50, opacity: 100 }];
    renderImageComposition(canvas, state);
    expect(canvas.width).toBe(2048); expect(canvas.height).toBe(1536);
    expect(context.scale).toHaveBeenCalledWith(.5, .5);
    expect(context.translate).toHaveBeenCalledWith(-512, 0);
    expect(context.clip).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls.at(-1)).toEqual([image, 1024, 384, 1024, 768]);
  });
});
describe("ordered carousel ZIP", () => {
  it("writes real local entries, CRC and central-directory offsets for every slide", () => {
    const bytes = imageCarouselZip([{ name: "slide-01.png", bytes: new TextEncoder().encode("123456789") }, { name: "slide-02.png", bytes: new Uint8Array([4, 5]) }]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(14, true)).toBe(0xcbf43926); // Standard CRC-32 test vector.
    const end = bytes.length - 22, directory = view.getUint32(end + 16, true);
    expect(view.getUint32(end, true)).toBe(0x06054b50); expect(view.getUint16(end + 10, true)).toBe(2);
    expect(view.getUint32(directory, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(directory + 28, true), second = directory + 46 + nameLength;
    const secondOffset = view.getUint32(second + 42, true);
    expect(view.getUint32(secondOffset, true)).toBe(0x04034b50);
    expect(new TextDecoder().decode(bytes.slice(secondOffset + 30, secondOffset + 30 + view.getUint16(secondOffset + 26, true)))).toBe("slide-02.png");
  });
});

describe("layouts of uploaded photos", () => {
  it("gives all actual uploaded images equal width without replacing text or image identity", async () => {
    const { applyImageLayout } = await import("./image-composition");
    const { image } = fixture(), second = { naturalWidth: 200, naturalHeight: 200 } as HTMLImageElement;
    const state = { ...freshComposition(image), caption: "My product headline", overlays: [{ id: "detail", name: "detail", image: second, x: 50, y: 50, width: 40, opacity: 50 }] };
    const next = applyImageLayout(state, "equal-split");
    expect(next.image).toBe(image); expect(next.overlays[0].image).toBe(second); expect(next.caption).toBe(state.caption);
    expect(next.baseScale).toBe(.46); expect(next.baseX).toBe(25); expect(next.overlays[0]).toMatchObject({ x: 75, y: 50, width: 46, opacity: 100 });
  });
  it("renders the base and inset photos with the stacked geometry into the actual export", async () => {
    const { applyImageLayout } = await import("./image-composition");
    const { context, canvas, image } = fixture(), state = freshComposition(image);
    state.overlays = [{ id: "detail", name: "detail", image, x: 50, y: 50, width: 40, opacity: 100 }];
    const next = applyImageLayout(state, "photo-stack"); renderImageComposition(canvas, next);
    expect(context.scale).toHaveBeenCalledWith(.78, .78); expect(next.overlays[0]).toMatchObject({ x: 68, y: 61, width: 50 });
    expect(context.drawImage).toHaveBeenCalledTimes(2); expect(context.drawImage.mock.calls.at(-1)?.[0]).toBe(image);
  });
  it("does not fake a second photo when media is missing", async () => {
    const { applyImageLayout } = await import("./image-composition");
    expect(() => applyImageLayout(freshComposition(), "product-card")).toThrow("base image");
    expect(() => applyImageLayout(freshComposition(fixture().image), "equal-split")).toThrow("at least two");
  });
});
