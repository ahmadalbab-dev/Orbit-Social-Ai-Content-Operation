import { describe, it, expect, vi } from "vitest";
import {
  soundtrackGain,
  validateSoundtrack,
  startSoundtrack,
  type LocalSoundtrack,
} from "./local-soundtrack";
const track: LocalSoundtrack = {
  src: "blob:music",
  name: "Music",
  duration: 20,
  offset: 2,
  volume: 0.8,
  fadeIn: 2,
  fadeOut: 2,
};
describe("local soundtrack", () => {
  it("uses output seconds and fades at the clipped music endpoint", () => {
    expect(soundtrackGain(track, 0, 10)).toBe(0);
    expect(soundtrackGain(track, 1, 10)).toBe(0.4);
    expect(soundtrackGain(track, 4, 10)).toBe(0.8);
    expect(soundtrackGain(track, 9, 10)).toBe(0.4);
    expect(soundtrackGain(track, 10, 10)).toBe(0);
    expect(soundtrackGain(track, 17, 30)).toBe(0.4);
  });
  it("rejects remote audio and nonfinite or out of bounds settings", () => {
    expect(() => validateSoundtrack(track)).not.toThrow();
    for (const patch of [
      { src: "https://example.com/a.mp3" },
      { offset: 20 },
      { volume: NaN },
      { fadeIn: -1 },
      { fadeOut: 11 },
      { duration: 601 },
    ])
      expect(() => validateSoundtrack({ ...track, ...patch })).toThrow();
  });
  it("schedules offset, duration, fade envelope and explicit cleanup on the mixed destination", () => {
    const source = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      buffer: null,
    };
    const gain = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { setValueCurveAtTime: vi.fn() },
    };
    const context = {
      currentTime: 12,
      createBufferSource: () => source,
      createGain: () => gain,
    };
    const destination = {} as AudioNode;
    const stop = startSoundtrack(
      context as unknown as AudioContext,
      { duration: 20 } as AudioBuffer,
      track,
      destination,
      10,
    );
    expect(source.start).toHaveBeenCalledWith(12, 2, 10);
    expect(gain.connect).toHaveBeenCalledWith(destination);
    const envelope = gain.gain.setValueCurveAtTime.mock.calls[0][0];
    expect(envelope[0]).toBe(0);
    expect(envelope.at(-1)).toBe(0);
    expect(envelope[64]).toBeCloseTo(0.8);
    stop();
    expect(source.stop).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
  });
});
