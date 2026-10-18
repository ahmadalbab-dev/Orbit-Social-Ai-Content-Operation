"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "./ui";
import {
  soundtrackGain,
  validateSoundtrack,
  type LocalSoundtrack,
} from "./local-soundtrack";
export function SoundtrackControls({
  value,
  onChange,
  disabled = false,
}: {
  value: LocalSoundtrack | null;
  onChange: (track: LocalSoundtrack | null) => void;
  disabled?: boolean;
}) {
  const [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false);
  const owned = useRef(new Set<string>()),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      owned.current.forEach((url) => URL.revokeObjectURL(url));
      owned.current.clear();
    };
  }, []);
  useEffect(() => {
    for (const url of owned.current)
      if (url !== value?.src) {
        URL.revokeObjectURL(url);
        owned.current.delete(url);
      }
  }, [value?.src]);
  async function choose(file: File | undefined) {
    if (!file || disabled || loading) return;
    setNotice("");
    if (
      file.size > 20 * 1024 * 1024 ||
      !/\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(file.name)
    ) {
      setNotice(
        "Choose an MP3, WAV, M4A, AAC, OGG or WebM audio file up to 20 MB.",
      );
      return;
    }
    setLoading(true);
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (
        buffer.duration > 600 ||
        buffer.length * buffer.numberOfChannels > 30_000_000
      )
        throw new Error(
          "Use music up to 10 minutes and 30 million decoded samples.",
        );
      if (!mounted.current) return;
      const src = URL.createObjectURL(file);
      owned.current.add(src);
      onChange({
        src,
        name: file.name,
        duration: buffer.duration,
        offset: 0,
        volume: 0.5,
        fadeIn: 0.5,
        fadeOut: 0.5,
      });
    } catch (error) {
      if (mounted.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "This audio cannot be decoded. Try MP3 or WAV.",
        );
    } finally {
      await context?.close().catch(() => {});
      if (mounted.current) setLoading(false);
    }
  }
  return (
    <section className="local-soundtrack" aria-label="Local soundtrack">
      <h3>Music &amp; sound</h3>
      <p className="review-help">
        Upload audio you can use. Music plays alongside the original clip and is
        included in the exported movie. It stays on this device.
      </p>
      <label className="field">
        Choose music
        <input
          aria-label="Choose local music"
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          disabled={disabled || loading}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {loading ? <p role="status">Checking audio…</p> : null}
      {value ? (
        <>
          <p className="revision-label">
            {value.name} · {value.duration.toFixed(1)}s
          </p>
          <div className="two-fields">
            {(["offset", "volume", "fadeIn", "fadeOut"] as const).map(
              (field) => (
                <label key={field} className="field">
                  {
                    {
                      offset: "Music offset (seconds)",
                      volume: "Music volume",
                      fadeIn: "Fade in (seconds)",
                      fadeOut: "Fade out (seconds)",
                    }[field]
                  }
                  <input
                    aria-label={`Soundtrack ${field}`}
                    type={field === "volume" ? "range" : "number"}
                    min="0"
                    max={
                      field === "offset"
                        ? Math.max(0, value.duration - 0.01)
                        : field === "volume"
                          ? 1
                          : 10
                    }
                    step={field === "volume" ? 0.05 : 0.1}
                    value={value[field]}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange({ ...value, [field]: Number(e.target.value) })
                    }
                  />
                  {field === "volume" ? (
                    <output>{Math.round(value.volume * 100)}%</output>
                  ) : null}
                </label>
              ),
            )}
          </div>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Remove music
          </Button>
        </>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}
export function useVideoSoundtrack(
  videoRef: RefObject<HTMLVideoElement | null>,
  track: LocalSoundtrack | null,
  options: {
    source: string;
    start: number;
    duration: number;
    speed: number;
    active: boolean;
  },
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track || !options.active) return;
    try {
      validateSoundtrack(track);
    } catch {
      return;
    }
    const music = new Audio(track.src);
    music.preload = "auto";
    let frame = 0,
      playing = false;
    const sync = () => {
      const elapsed = (video.currentTime - options.start) / options.speed;
      const audible =
        !video.paused &&
        elapsed >= 0 &&
        elapsed < options.duration / options.speed &&
        track.offset + elapsed < track.duration;
      if (audible) {
        if (Math.abs(music.currentTime - (track.offset + elapsed)) > 0.2)
          music.currentTime = track.offset + elapsed;
        music.volume = soundtrackGain(
          track,
          elapsed,
          options.duration / options.speed,
        );
        if (!playing) {
          playing = true;
          void music.play().catch(() => {});
        }
      } else {
        music.pause();
        playing = false;
      }
      frame = requestAnimationFrame(sync);
    };
    frame = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(frame);
      music.pause();
      music.removeAttribute("src");
      music.load();
    };
  }, [
    videoRef,
    track,
    options.source,
    options.start,
    options.duration,
    options.speed,
    options.active,
  ]);
}
