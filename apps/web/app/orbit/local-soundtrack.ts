import { validateRecordedMovie } from "./recorded-movie";
/** Local media only. Music timings are seconds in the finished output. */
export interface LocalSoundtrack {
  src: string;
  name: string;
  duration: number;
  offset: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}
export function validateSoundtrack(track: LocalSoundtrack) {
  if (
    !track.src.startsWith("blob:") ||
    ![
      track.duration,
      track.offset,
      track.volume,
      track.fadeIn,
      track.fadeOut,
    ].every(Number.isFinite) ||
    track.duration <= 0 ||
    track.duration > 600 ||
    track.offset < 0 ||
    track.offset >= track.duration ||
    track.volume < 0 ||
    track.volume > 1 ||
    track.fadeIn < 0 ||
    track.fadeIn > 10 ||
    track.fadeOut < 0 ||
    track.fadeOut > 10
  )
    throw new Error("Choose valid local music, trim offset, volume and fades.");
}
export function soundtrackGain(
  track: LocalSoundtrack,
  elapsed: number,
  outputDuration: number,
) {
  const end = Math.min(outputDuration, track.duration - track.offset);
  if (elapsed < 0 || elapsed >= end) return 0;
  return (
    track.volume *
    Math.min(
      1,
      track.fadeIn > 0 ? elapsed / track.fadeIn : 1,
      track.fadeOut > 0 ? (end - elapsed) / track.fadeOut : 1,
    )
  );
}
export async function prepareSoundtrack(
  context: AudioContext,
  track: LocalSoundtrack,
  signal: AbortSignal,
) {
  validateSoundtrack(track);
  const response = await fetch(track.src, { signal });
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  if (bytes.byteLength > 20 * 1024 * 1024)
    throw new Error("Choose music smaller than 20 MB.");
  const buffer = await context.decodeAudioData(bytes);
  signal.throwIfAborted();
  if (
    buffer.duration > 600 ||
    buffer.length * buffer.numberOfChannels > 30_000_000
  )
    throw new Error(
      "Choose music up to 10 minutes and 30 million decoded samples.",
    );
  if (track.offset >= buffer.duration)
    throw new Error("Music offset extends beyond this track.");
  return buffer;
}
export function startSoundtrack(
  context: AudioContext,
  buffer: AudioBuffer,
  track: LocalSoundtrack,
  destination: AudioNode,
  duration: number,
) {
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(destination);
  const length = Math.min(duration, buffer.duration - track.offset),
    now = context.currentTime;
  // A sampled envelope handles overlapping fade-in/fade-out without discontinuities.
  const values = new Float32Array(128);
  for (let i = 0; i < values.length; i++)
    values[i] = soundtrackGain(
      { ...track, duration: buffer.duration },
      (length * i) / (values.length - 1),
      duration,
    );
  gain.gain.setValueCurveAtTime(values, now, Math.max(0.001, length));
  source.start(now, track.offset, length);
  return () => {
    try {
      source.stop();
    } catch {}
    source.disconnect();
    gain.disconnect();
  };
}
export async function exportCanvasMovie(
  canvas: HTMLCanvasElement,
  seconds: number,
  track: LocalSoundtrack | null,
  signal: AbortSignal,
  progress: (value: number) => void,
  drawFrame?: (elapsed: number) => void,
): Promise<Blob> {
  if (!Number.isFinite(seconds) || seconds < 0.5 || seconds > 120)
    throw new Error("Choose a movie length between 0.5 and 120 seconds.");
  if (
    typeof MediaRecorder === "undefined" ||
    typeof canvas.captureStream !== "function"
  )
    throw new Error(
      "Video export requires a current Chrome or Safari browser.",
    );
  const mime = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find(
    (t) => MediaRecorder.isTypeSupported(t),
  );
  if (!mime) throw new Error("Video encoding is unavailable.");
  if (track && typeof AudioContext === "undefined")
    throw new Error("Audio export is unavailable in this browser.");
  const stream = canvas.captureStream(30);
  let context: AudioContext | null = null;
  let recorder: MediaRecorder | undefined,
    frame = 0,
    stopMusic = () => {};
  try {
    context = track ? new AudioContext() : null;
    if (context) {
      await context.resume();
      if (context.state !== "running")
        throw new Error("Audio was blocked. Tap export again.");
    }
    const buffer =
      context && track ? await prepareSoundtrack(context, track, signal) : null;
    const destination = context?.createMediaStreamDestination();
    destination?.stream.getTracks().forEach((t) => stream.addTrack(t));
    signal.throwIfAborted();
    drawFrame?.(0);
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let bytes = 0,
        complete = false,
        error: Error | undefined;
      const stop = () => {
        if (recorder?.state === "recording") recorder.stop();
      };
      const abort = () => {
        error = new Error("Export cancelled.");
        stop();
      };
      const hidden = () => {
        if (document.visibilityState === "hidden") {
          error = new Error("Keep Orbit open while exporting the movie.");
          stop();
        }
      };
      const timeout = setTimeout(
        () => {
          error = new Error("Movie export timed out.");
          stop();
        },
        (seconds + 15) * 1000,
      );
      const cleanup = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", hidden);
      };
      signal.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", hidden);
      recorder!.ondataavailable = (e) => {
        bytes += e.data.size;
        if (bytes > 64 * 1024 * 1024) {
          error = new Error("Movie export exceeded 64 MB.");
          stop();
        } else if (e.data.size) chunks.push(e.data);
      };
      recorder!.onerror = () => {
        cleanup();
        reject(new Error("Movie encoding failed."));
      };
      recorder!.onstop = () => {
        cleanup();
        if (error || !complete || !bytes)
          reject(error ?? new Error("Movie export incomplete."));
        else {
          resolve(new Blob(chunks, { type: recorder!.mimeType }));
        }
      };
      recorder!.start(500);
      if (context && buffer && track && destination)
        stopMusic = startSoundtrack(
          context,
          buffer,
          track,
          destination,
          seconds,
        );
      const began = performance.now();
      const draw = () => {
        const elapsed = (performance.now() - began) / 1000;
        drawFrame?.(Math.min(elapsed, seconds));
        progress(Math.min(99, (elapsed / seconds) * 100));
        if (elapsed >= seconds) {
          complete = true;
          stop();
        } else frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      if (signal.aborted) abort();
    });
    await validateRecordedMovie(blob, seconds, signal);
    progress(100);
    return blob;
  } finally {
    cancelAnimationFrame(frame);
    stopMusic();
    if (recorder?.state === "recording") recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    await context?.close().catch(() => {});
  }
}
