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
