/** Device-only export. No uploads, provider calls or fabricated render jobs. */
export interface LocalVideoEdit {
  start: number;
  duration: number;
  width: number;
  height: number;
  speed: number;
  volume: number;
  rotation: number;
  flip: boolean;
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
) {
  const { width: w, height: h } = edit;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const fitted = fitVideo(
    video.videoWidth,
    video.videoHeight,
    w,
    h,
    edit.rotation,
  );
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(edit.flip ? -1 : 1, 1);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.drawImage(
    video,
    -fitted.width / 2,
    -fitted.height / 2,
    fitted.width,
    fitted.height,
  );
  ctx.restore();
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
  if (edit.volume > 0 && typeof AudioContext === "undefined")
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
  // Create/resume audio during the export button gesture. Audio is routed to the recording, not speakers.
  const audio =
    edit.volume > 0 && typeof AudioContext !== "undefined"
      ? new AudioContext()
      : null;
  const stream = canvas.captureStream(30);
  let frame = 0;
  let recorder: MediaRecorder | undefined;
  let cleanupRecording = () => {};
  const deadline = setTimeout(
    () => {
      if (recorder?.state === "recording") recorder.stop();
    },
    (edit.duration / edit.speed + 20) * 1000,
  );
  try {
    if (audio) {
      await audio.resume();
      if (audio.state !== "running")
        throw new Error(
          "Audio export was blocked. Tap Export again, or mute the clip.",
        );
      const input = audio.createMediaElementSource(video),
        gain = audio.createGain(),
        destination = audio.createMediaStreamDestination();
      gain.gain.value = edit.volume;
      input.connect(gain);
      gain.connect(destination);
      destination.stream
        .getAudioTracks()
        .forEach((track) => stream.addTrack(track));
    } else video.muted = true;
    const wait = (event: string) =>
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
          video.removeEventListener(event, done);
          video.removeEventListener("error", failed);
          signal.removeEventListener("abort", cancelled);
          error ? reject(error) : resolve();
        }
        video.addEventListener(event, done, { once: true });
        video.addEventListener("error", failed, { once: true });
        signal.addEventListener("abort", cancelled, { once: true });
        if (signal.aborted) cancelled();
      });
    if (video.readyState < 2) await wait("loadeddata");
    if (edit.start + edit.duration > video.duration + 0.05)
      throw new Error("Trim range extends beyond the source video.");
    if (edit.start > 0) {
      const seek = wait("seeked");
      video.currentTime = edit.start;
      await seek;
    }
    signal.throwIfAborted();
    drawEditedFrame(ctx, video, edit, 0);
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    const result = new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let bytes = 0;
      let complete = false;
      let error: Error | undefined;
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
        const elapsed = Math.max(0, video.currentTime - edit.start);
        drawEditedFrame(ctx, video, edit, elapsed);
        progress(Math.min(99, (elapsed / edit.duration) * 100));
        if (elapsed >= edit.duration - 0.025 || video.ended) {
          complete = true;
          stop();
        } else frame = requestAnimationFrame(draw);
      };
      recorder!.start(500);
      frame = requestAnimationFrame(draw);
      void video.play().catch(() => {
        error = new Error("Playback was blocked. Tap Export again.");
        stop();
      });
    });
    const blob = await result;
    progress(100);
    return blob;
  } finally {
    cleanupRecording();
    clearTimeout(deadline);
    cancelAnimationFrame(frame);
    if (recorder?.state === "recording") recorder.stop();
    video.pause();
    video.removeAttribute("src");
    video.load();
    stream.getTracks().forEach((track) => track.stop());
    await audio?.close().catch(() => {});
  }
}
