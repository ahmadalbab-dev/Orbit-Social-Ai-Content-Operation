import { describe, expect, it, vi } from "vitest";
import {
  drawEditedFrame,
  fitVideo,
  recorderMime,
  validateVideoEdit,
  type LocalVideoEdit,
} from "./local-video-export";
const edit: LocalVideoEdit = {
  start: 2,
  duration: 5,
  width: 720,
  height: 1280,
  speed: 1.5,
  volume: 0.8,
  rotation: 90,
  flip: true,
  captions: [{ text: "Caption", start: 1, end: 3 }],
  news: { title: "Kuala Lumpur", date: "17 Oktober 2026" },
};
describe("local video editing", () => {
  it("prefers supported MP4, falling back to browser WebM without mislabelling it", () => {
    expect(recorderMime((m) => m === "video/mp4")).toBe("video/mp4");
    expect(recorderMime((m) => m === "video/webm")).toBe("video/webm");
    expect(recorderMime(() => false)).toBeUndefined();
  });
  it("fits the rotated source inside the output frame", () => {
    const fitted = fitVideo(1920, 1080, 720, 1280, 90);
    expect(fitted).toEqual({ width: 1280, height: 720 });
    expect(fitVideo(1920, 1080, 1080, 1080, 0)).toEqual({
      width: 1080,
      height: 607.5,
    });
  });
  it("accepts valid trims and rejects invalid dimensions, speed, volume and caption timings", () => {
    expect(() => validateVideoEdit(edit)).not.toThrow();
    for (const patch of [
      { start: -1 },
      { duration: 121 },
      { speed: 0 },
      { volume: 2 },
      { width: Infinity },
      { height: 0 },
      { rotation: 17 },
      { captions: [{ text: "bad", start: 0, end: 6 }] },
    ])
      expect(() => validateVideoEdit({ ...edit, ...patch })).toThrow(
        "valid trim",
      );
  });
  it("draws rotation and flip before overlays and includes only active captions", () => {
    const ctx = {
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: (t: string) => ({ width: t.length * 10 }),
    };
    const video = { videoWidth: 1920, videoHeight: 1080 };
    drawEditedFrame(
      ctx as unknown as CanvasRenderingContext2D,
      video as HTMLVideoElement,
      edit,
      2,
    );
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
    expect(ctx.translate.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.scale.mock.invocationCallOrder[0],
    );
    expect(ctx.scale.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.rotate.mock.invocationCallOrder[0],
    );
    expect(ctx.rotate.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.drawImage.mock.invocationCallOrder[0],
    );
    expect(ctx.fillText.mock.calls.map((c) => c[0])).toEqual([
      "17 Oktober 2026",
      "Kuala Lumpur",
      "Caption",
    ]);
    ctx.fillText.mockClear();
    drawEditedFrame(
      ctx as unknown as CanvasRenderingContext2D,
      video as HTMLVideoElement,
      edit,
      4,
    );
    expect(ctx.fillText.mock.calls.map((c) => c[0])).not.toContain("Caption");
  });
  it("renders only active image layers with their geometry and opacity above the footage", () => {
    const ctx = {
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: (t: string) => ({ width: t.length * 10 }),
    };
    const image = { naturalWidth: 400, naturalHeight: 200 } as HTMLImageElement;
    const state = {
      ...edit,
      brightness: 1.2,
      overlays: [
        {
          id: "logo",
          src: "blob:logo",
          x: 0.1,
          y: 0.2,
          width: 0.3,
          opacity: 0.4,
          start: 1,
          end: 3,
        },
      ],
    };
    const images = new Map([["logo", image]]);
    drawEditedFrame(
      ctx as unknown as CanvasRenderingContext2D,
      { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement,
      state,
      2,
      images,
    );
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, image, 72, 256, 216, 108);
    expect(ctx).toHaveProperty("globalAlpha", 0.4);
    ctx.drawImage.mockClear();
    drawEditedFrame(
      ctx as unknown as CanvasRenderingContext2D,
      { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement,
      state,
      3,
      images,
    );
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
  it("rejects remote image sources, unbounded layers and invalid colour settings", () => {
    const overlay = {
      id: "logo",
      src: "blob:logo",
      x: 0,
      y: 0,
      width: 0.3,
      opacity: 1,
      start: 0,
      end: 5,
    };
    for (const patch of [
      { overlays: [{ ...overlay, src: "https://untrusted/image.png" }] },
      { overlays: [{ ...overlay, end: 6 }] },
      { overlays: Array(7).fill(overlay) },
      { brightness: 2 },
      { saturation: NaN },
    ]) {
      expect(() => validateVideoEdit({ ...edit, ...patch })).toThrow();
    }
  });
});
