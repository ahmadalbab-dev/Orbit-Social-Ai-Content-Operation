/** A nonempty recording can still contain only audio or a truncated movie. */
export async function validateRecordedMovie(blob: Blob, seconds: number, signal: AbortSignal) {
  signal.throwIfAborted();
  const video = document.createElement("video"), url = URL.createObjectURL(blob);
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        video.removeEventListener("loadeddata", loaded);
        video.removeEventListener("error", failed);
        signal.removeEventListener("abort", cancelled);
        error ? reject(error) : resolve();
      };
      const failed = () => finish(new Error("The exported movie could not be decoded. Your edit is unchanged. Try exporting again."));
      const cancelled = () => finish(new Error("Export cancelled."));
      const loaded = () => {
        // MediaRecorder WebM can omit duration metadata, so accept an unknown duration.
        const truncated = Number.isFinite(video.duration) && video.duration < Math.max(.1, seconds - Math.max(.5, seconds * .1));
        if (!video.videoWidth || !video.videoHeight || truncated) failed();
        else finish();
      };
      const timer = setTimeout(() => finish(new Error("The exported movie took too long to verify. Your edit is unchanged. Try exporting again.")), 15000);
      video.addEventListener("loadeddata", loaded, { once: true });
      video.addEventListener("error", failed, { once: true });
      signal.addEventListener("abort", cancelled, { once: true });
      video.src = url;
      if (signal.aborted) cancelled();
    });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
