import { drawLightning, scheduleThunder, validateLightning, type LightningEffect } from "./local-video-effects";
import { validateRecordedMovie } from "./recorded-movie";
import { keyedVideoFrame, releaseVideoChromaKey, validateVideoChromaKey, type VideoChromaKey } from "./video-chroma-key";
import { stitchedDuration, stitchIntroEdit, validateVideoStitch, type VideoStitchIntro } from "./video-stitch";
import {
  prepareSoundtrack,
  startSoundtrack,
  validateSoundtrack,
  type LocalSoundtrack,
} from "./local-soundtrack";
/** Device-only export. No uploads, provider calls or fabricated render jobs. */
export interface VideoImageOverlay {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  start: number;
  end: number;
}
export interface LocalVideoEdit {
  start: number;
  duration: number;
  width: number;
  height: number;
  speed: number;
  volume: number;
  rotation: number;
  flip: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  overlays?: VideoImageOverlay[];
  soundtrack?: LocalSoundtrack | null;
  lightning?: LightningEffect | null;
  chromaKey?: VideoChromaKey | null;
  intro?: VideoStitchIntro | null;
  titleCard?: {
    text: string;
    kicker: string;
    accent: string;
    background: string;
    position: "top" | "bottom";
  };
  news?: { title: string; date: string };
  captions: { text: string; start: number; end: number }[];
}
export function recorderMime(
  supported: (mime: string) => boolean,
): string | undefined {
  return [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find(supported);
}
export function validateVideoEdit(edit: LocalVideoEdit) {
  if (edit.intro) validateVideoStitch(edit.intro, edit);
  if (edit.chromaKey) {
    validateVideoChromaKey(edit.chromaKey);
    if (edit.chromaKey.backgroundLayerId && !edit.overlays?.some(layer => layer.id === edit.chromaKey!.backgroundLayerId)) throw Error("Choose an existing image layer for the green-screen background.");
  }
  if (edit.soundtrack) validateSoundtrack(edit.soundtrack);
  if (edit.lightning) validateLightning(edit.lightning, edit.duration / edit.speed);
  if (
    ![
      edit.start,
      edit.duration,
      edit.speed,
      edit.volume,
      edit.width,
      edit.height,
      edit.rotation,
    ].every(Number.isFinite) ||
    edit.start < 0 ||
    edit.duration <= 0 ||
    edit.duration > 120 ||
    edit.speed < 0.5 ||
    edit.speed > 2 ||
    edit.volume < 0 ||
    edit.volume > 1 ||
    !Number.isInteger(edit.width) ||
    !Number.isInteger(edit.height) ||
    edit.width < 1 ||
    edit.height < 1 ||
    edit.width > 2048 ||
    edit.height > 2048 ||
    edit.rotation % 90 !== 0 ||
    (edit.brightness !== undefined &&
      (!Number.isFinite(edit.brightness) ||
        edit.brightness < 0.5 ||
        edit.brightness > 1.5)) ||
    (edit.contrast !== undefined &&
      (!Number.isFinite(edit.contrast) ||
        edit.contrast < 0.5 ||
        edit.contrast > 1.5)) ||
    (edit.saturation !== undefined &&
      (!Number.isFinite(edit.saturation) ||
        edit.saturation < 0 ||
        edit.saturation > 2)) ||
    (edit.overlays?.length ?? 0) > 6 ||
    edit.overlays?.some(
      (o) =>
        !o.src.startsWith("blob:") ||
        ![o.x, o.y, o.width, o.opacity, o.start, o.end].every(
          Number.isFinite,
        ) ||
        o.x < 0 ||
        o.x > 1 ||
        o.y < 0 ||
        o.y > 1 ||
        o.width < 0.05 ||
        o.width > 1 ||
        o.opacity < 0 ||
        o.opacity > 1 ||
        o.start < 0 ||
        o.end <= o.start ||
        o.end > edit.duration,
    ) ||
    edit.captions.length > 20 ||
    edit.captions.some(
      (c) =>
        !c.text.trim() ||
        c.text.length > 120 ||
        !Number.isFinite(c.start) ||
        !Number.isFinite(c.end) ||
        c.start < 0 ||
        c.end <= c.start ||
        c.end > edit.duration,
    )
  )
    throw new Error("Choose a valid trim range and export settings.");
}
export function fitVideo(
  iw: number,
  ih: number,
  width: number,
  height: number,
  rotation: number,
) {
  const turned = rotation % 180 !== 0;
  const scale = Math.min(
    width / (turned ? ih : iw),
    height / (turned ? iw : ih),
  );
  return { width: iw * scale, height: ih * scale };
}
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
): string[] {
  const result: string[] = [];
  let line = "";
  for (const character of text) {
    if (line && ctx.measureText(line + character).width > max) {
      result.push(line.trim());
      line = "";
    }
    line += character;
  }
  if (line.trim()) result.push(line.trim());
  return result;
}
export function drawEditedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  edit: LocalVideoEdit,
  elapsed: number,
  images: ReadonlyMap<string, HTMLImageElement> = new Map(),
) {
  const { width: w, height: h } = edit;
  ctx.fillStyle = edit.chromaKey?.background ?? "#000";
  ctx.fillRect(0, 0, w, h);
  const background = edit.chromaKey?.backgroundLayerId ? edit.overlays?.find(layer => layer.id === edit.chromaKey!.backgroundLayerId) : undefined;
  const backgroundImage = background && elapsed >= background.start && elapsed < background.end ? images.get(background.id) : undefined;
  if (backgroundImage) {
    const scale = Math.max(w / backgroundImage.naturalWidth, h / backgroundImage.naturalHeight);
    const bw = backgroundImage.naturalWidth * scale, bh = backgroundImage.naturalHeight * scale;
    ctx.save(); ctx.globalAlpha = background!.opacity;
    ctx.drawImage(backgroundImage, (w - bw) / 2, (h - bh) / 2, bw, bh); ctx.restore();
  }
  const source = edit.chromaKey ? keyedVideoFrame(ctx, video, edit.chromaKey) : video;
  if (!edit.chromaKey) releaseVideoChromaKey(ctx);
  const fitted = fitVideo(
    video.videoWidth,
    video.videoHeight,
    w,
    h,
    edit.rotation,
  );
  ctx.save();
  ctx.filter = `brightness(${edit.brightness ?? 1}) contrast(${edit.contrast ?? 1}) saturate(${edit.saturation ?? 1})`;
  ctx.translate(w / 2, h / 2);
  ctx.scale(edit.flip ? -1 : 1, 1);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.drawImage(
    source,
    -fitted.width / 2,
    -fitted.height / 2,
    fitted.width,
    fitted.height,
  );
  ctx.restore();
  ctx.filter = "none";
  for (const overlay of edit.overlays ?? []) {
    if (overlay.id === background?.id) continue;
    const image = images.get(overlay.id);
    if (!image || elapsed < overlay.start || elapsed >= overlay.end) continue;
    const width = overlay.width * w;
    ctx.save();
    ctx.globalAlpha = overlay.opacity;
    ctx.drawImage(
      image,
      overlay.x * w,
      overlay.y * h,
      width,
      (width * image.naturalHeight) / image.naturalWidth,
    );
    ctx.restore();
  }
  if (edit.lightning) drawLightning(ctx, edit.lightning, elapsed / edit.speed, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (edit.news) {
    ctx.fillStyle = "rgba(255,0,0,.42)";
    ctx.fillRect(0, h * 0.7, w, h * 0.24);
    ctx.fillStyle = "#fff";
    ctx.font = "24px Arial";
    ctx.fillText(edit.news.date, 36, h * 0.72, w - 72);
    ctx.font = `bold ${w < 800 ? 32 : 36}px Arial`;
    const titleLines = lines(ctx, edit.news.title, w - 72).slice(0, 4);
    titleLines.forEach((line, i) => ctx.fillText(line, 36, h * 0.77 + i * 42));
  }
  if (edit.titleCard?.text) {
    const card = edit.titleCard,
      x = w * 0.05,
      y = card.position === "top" ? h * 0.06 : h * 0.76,
      cardWidth = w * 0.9;
    ctx.fillStyle = card.background;
    ctx.fillRect(x, y, cardWidth, h * 0.17);
    ctx.fillStyle = card.accent;
    ctx.fillRect(x, y, w * 0.012, h * 0.17);
    ctx.font = `bold ${Math.round(w * 0.022)}px Arial`;
    ctx.fillText(
      card.kicker,
      x + w * 0.035,
      y + h * 0.018,
      cardWidth - w * 0.07,
    );
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(w * 0.038)}px Arial`;
    lines(ctx, card.text, cardWidth - w * 0.07)
      .slice(0, 3)
      .forEach((line, i) =>
        ctx.fillText(line, x + w * 0.035, y + h * 0.055 + i * w * 0.047),
      );
  }
  const caption = edit.captions.find(
    (c) => elapsed >= c.start && elapsed < c.end,
  );
  if (caption) {
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    const captionLines = lines(ctx, caption.text, w * 0.88).slice(0, 4);
    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(
      w * 0.04,
      h * 0.5 - 10,
      w * 0.92,
      captionLines.length * 36 + 20,
    );
    ctx.fillStyle = "#fff";
    captionLines.forEach((line, i) =>
      ctx.fillText(line, w / 2, h * 0.5 + i * 36),
    );
  }
}
export async function exportLocalVideo(
  source: string,
  edit: LocalVideoEdit,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<Blob> {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  )
    throw new Error(
      "Local video export is unavailable in this browser. Try a current Safari or Chrome browser.",
    );
  const mime = recorderMime((type) => MediaRecorder.isTypeSupported(type));
  if (!mime)
    throw new Error(
      "This browser cannot encode MP4 or WebM. Try another browser.",
    );
  validateVideoEdit(edit);
  signal.throwIfAborted();
  if (
    (edit.volume > 0 || (edit.intro?.volume ?? 0) > 0 || edit.soundtrack || (edit.lightning?.thunderVolume ?? 0) > 0) &&
    typeof AudioContext === "undefined"
  )
    throw new Error(
      "Audio export is unavailable. Mute the clip or use a current Safari or Chrome browser.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = edit.width;
  canvas.height = edit.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.src = source;
  video.playbackRate = edit.speed;
  const introEdit = edit.intro ? stitchIntroEdit(edit, edit.intro) : null;
  const reference = edit.intro ? document.createElement('video') : null;
  if (reference) { reference.playsInline = true; reference.preload = 'auto'; reference.src = edit.intro!.src; }
  const outputDuration = stitchedDuration(edit, edit.intro);
  // Create/resume audio during the export button gesture. Audio is routed to the recording, not speakers.
  const audio =
    (edit.volume > 0 || (edit.intro?.volume ?? 0) > 0 || edit.soundtrack || (edit.lightning?.thunderVolume ?? 0) > 0) && typeof AudioContext !== "undefined"
      ? new AudioContext()
      : null;
  const audioReady = audio?.resume();
  const stream = canvas.captureStream(30);
  let frame = 0;
  let recorder: MediaRecorder | undefined;
  let cleanupRecording = () => {};
  let musicBuffer: AudioBuffer | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let stopMusic = () => {};
  let stopThunder = () => {};
  const deadline = setTimeout(
    () => {
      if (recorder?.state === "recording") recorder.stop();
    },
    (outputDuration + 20) * 1000,
  );
  try {
    await audioReady;
    const images = new Map<string, HTMLImageElement>();
    await Promise.all(
      (edit.overlays ?? []).map(async (overlay) => {
        const image = new Image();
        image.src = overlay.src;
        await image.decode();
        signal.throwIfAborted();
        images.set(overlay.id, image);
      }),
    );
    if (audio) {
      if (audio.state !== "running")
        throw new Error(
          "Audio export was blocked. Tap Export again, or mute the clip.",
        );
      const input = audio.createMediaElementSource(video),
        gain = audio.createGain(),
        output = audio.createMediaStreamDestination();
      destination = output;
      gain.gain.value = edit.volume;
      input.connect(gain);
      gain.connect(output);
      if (reference) {
        const referenceInput = audio.createMediaElementSource(reference), referenceGain = audio.createGain();
        referenceGain.gain.value = edit.intro!.volume; referenceInput.connect(referenceGain); referenceGain.connect(output);
      }
      output.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      if (edit.soundtrack)
        musicBuffer = await prepareSoundtrack(audio, edit.soundtrack, signal);
    } else { video.muted = true; if (reference) reference.muted = true; }
    const wait = (target: HTMLVideoElement, event: string) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            finish(new Error("Video took too long to load. Try an MP4 file.")),
          15000,
        );
        const done = () => finish();
        const failed = () =>
          finish(
            new Error("This video could not be decoded. Try an MP4 file."),
          );
        const cancelled = () => finish(new Error("Export cancelled."));
        function finish(error?: Error) {
          clearTimeout(timer);
          target.removeEventListener(event, done);
          target.removeEventListener("error", failed);
          signal.removeEventListener("abort", cancelled);
          error ? reject(error) : resolve();
        }
        target.addEventListener(event, done, { once: true });
        target.addEventListener("error", failed, { once: true });
        signal.addEventListener("abort", cancelled, { once: true });
        if (signal.aborted) cancelled();
      });
    if (video.readyState < 2) await wait(video,"loadeddata");
    if (edit.start + edit.duration > video.duration + 0.05)
      throw new Error("Trim range extends beyond the source video.");
    if (edit.start > 0) {
      const seek = wait(video,"seeked");
      video.currentTime = edit.start;
      await seek;
    }
    if (reference && introEdit) {
      if (reference.readyState < 2) await wait(reference,'loadeddata');
      if (!Number.isFinite(reference.duration) || introEdit.start + introEdit.duration > reference.duration + .05) throw Error('The reference trim extends beyond this video.');
      if (introEdit.start > 0) { const seek=wait(reference,'seeked');reference.currentTime=introEdit.start;await seek; }
    }
    signal.throwIfAborted();
    drawEditedFrame(ctx, reference ?? video, introEdit ?? edit, 0, images);
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    const result = new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let bytes = 0;
      let complete = false;
      let error: Error | undefined;
      let referencePhase = !!reference, switching = false;
      const stop = () => {
        if (recorder?.state === "recording") recorder.stop();
      };
      const abort = () => {
        error = new Error("Export cancelled.");
        stop();
      };
      const hidden = () => {
        if (document.visibilityState === "hidden") {
          error = new Error(
            "Export paused because this tab was hidden. Keep Orbit open and export again.",
          );
          stop();
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", hidden);
      cleanupRecording = () => {
        signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", hidden);
      };
      recorder!.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes > 64 * 1024 * 1024) {
          error = new Error("Export exceeded 64 MB. Choose a shorter clip.");
          stop();
        } else if (event.data.size) chunks.push(event.data);
      };
      recorder!.onerror = () => {
        error = new Error(
          "This browser could not encode the video. Try a shorter clip.",
        );
        stop();
        reject(error);
      };
      recorder!.onstop = () => {
        signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", hidden);
        video.pause();
        reference?.pause();
        if (error || !complete || !bytes)
          reject(
            error ??
              new Error(
                "Export did not complete. Keep this tab open and try again.",
              ),
          );
        else resolve(new Blob(chunks, { type: recorder!.mimeType }));
      };
      const draw = () => {
        if (switching) { frame=requestAnimationFrame(draw);return; }
        const currentVideo=referencePhase?reference!:video,currentEdit=referencePhase?introEdit!:edit;
        const elapsed = Math.max(0, currentVideo.currentTime - currentEdit.start);
        try { drawEditedFrame(ctx, currentVideo, currentEdit, elapsed, images); }
        catch { error = new Error("Video effects were interrupted. Keep this tab open and try exporting again."); stop(); return; }
        const finishedSeconds=referencePhase?elapsed:(edit.intro?.duration??0)+elapsed/edit.speed;
        progress(Math.min(99, (finishedSeconds / outputDuration) * 100));
        if (elapsed >= currentEdit.duration - 0.025 || currentVideo.ended) {
          if (referencePhase) {
            reference!.pause();referencePhase=false;switching=true;
            void playResponse().then(()=>{switching=false;}).catch(()=>{error=Error('Response playback was blocked. Tap Export again.');stop();});
            frame=requestAnimationFrame(draw);
          } else { complete = true; stop(); }
        } else frame = requestAnimationFrame(draw);
      };
      const playResponse = async () => {
        await video.play();
        if (signal.aborted || recorder?.state !== 'recording') { video.pause();return; }
        if (audio && edit.lightning && destination) stopThunder = scheduleThunder(audio, edit.lightning, destination, 0, edit.duration / edit.speed);
        if (audio && musicBuffer && edit.soundtrack && destination) stopMusic = startSoundtrack(audio,musicBuffer,edit.soundtrack,destination,edit.duration/edit.speed);
      };
      recorder!.start(500);
      frame = requestAnimationFrame(draw);
      void (reference ? reference.play() : playResponse())
        .catch(() => {
          error = new Error("Playback was blocked. Tap Export again.");
          stop();
        });
    });
    const blob = await result;
    await validateRecordedMovie(blob, outputDuration, signal);
    progress(100);
    return blob;
  } finally {
    releaseVideoChromaKey(ctx);
    cleanupRecording();
    stopMusic();
    stopThunder();
    clearTimeout(deadline);
    cancelAnimationFrame(frame);
    if (recorder?.state === "recording") recorder.stop();
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (reference) { reference.pause();reference.removeAttribute('src');reference.load(); }
    stream.getTracks().forEach((track) => track.stop());
    await audio?.close().catch(() => {});
  }
}
