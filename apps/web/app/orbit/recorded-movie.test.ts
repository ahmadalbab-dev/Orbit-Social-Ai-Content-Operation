import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRecordedMovie } from "./recorded-movie";

function fixture(width = 1080, height = 1080, duration = 2.97) {
  const video = Object.assign(new EventTarget(), {
    videoWidth: width, videoHeight: height, duration,
    pause: vi.fn(), load: vi.fn(), removeAttribute: vi.fn(),
  });
  vi.stubGlobal("document", { createElement: vi.fn(() => video) });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recording");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  return { video, revoke };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("recorded movie acceptance", () => {
  it.each([[0, 0, .129188], [1080, 1080, .129188]])("rejects the observed empty-video or truncated export (%s, %s, %s)", async (width, height, duration) => {
    const { video, revoke } = fixture(width, height, duration);
    const result = validateRecordedMovie(new Blob(["recorded bytes"]), 3, new AbortController().signal);
    video.dispatchEvent(new Event("loadeddata"));
    await expect(result).rejects.toThrow("could not be decoded");
    expect(revoke).toHaveBeenCalledWith("blob:recording");
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
  });
  it.each([2.97, 2.671233, Infinity])("accepts a decodable video with duration %s", async duration => {
    const { video } = fixture(1080, 1080, duration);
    const result = validateRecordedMovie(new Blob(["recorded bytes"]), 3, new AbortController().signal);
    video.dispatchEvent(new Event("loadeddata"));
    await expect(result).resolves.toBeUndefined();
  });
  it("cleans up when the user cancels verification", async () => {
    const { revoke } = fixture(), controller = new AbortController();
    const result = validateRecordedMovie(new Blob(["recorded bytes"]), 3, controller.signal);
    controller.abort();
    await expect(result).rejects.toThrow("Export cancelled");
    expect(revoke).toHaveBeenCalledOnce();
  });
  it("bounds verification when no video data becomes available", async () => {
    vi.useFakeTimers();
    const { revoke } = fixture();
    const result = validateRecordedMovie(new Blob(["recorded bytes"]), 3, new AbortController().signal);
    const assertion = expect(result).rejects.toThrow("too long to verify");
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(revoke).toHaveBeenCalledOnce();
  });
});
