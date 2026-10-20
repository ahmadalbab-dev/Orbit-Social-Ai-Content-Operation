"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Film,
  LockKeyhole,
  Pause,
  Play,
  RefreshCw,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Button, Card } from "./ui";
import { SectionHeading } from "./design-ui";
import {
  drawEditedFrame,
  exportLocalVideo,
  type LocalVideoEdit,
  type VideoImageOverlay,
} from "./local-video-export";
import { lightningRecipe, validateLightning, scheduleThunder, type LightningEffect } from "./local-video-effects";
import { SoundtrackControls, useVideoSoundtrack } from "./soundtrack-controls";
import { type LocalSoundtrack, validateSoundtrack } from "./local-soundtrack";
import { videoTemplates, creativeVideoTemplates, neutralVideoSettings } from "./video-templates";
import { EditorAiPanel } from "./editor-ai-panel";
import type {
  VideoEditorChanges,
  VideoEditorState,
} from "./editor-ai-contract";
import "./video-editor-advanced.css";
import { MobileEditorToolbar, EditorToolPanel, videoTools, type EditorTool } from "./mobile-editor-toolbar";
import { VideoAiPlanPanel } from "./video-ai-plan-panel";
import { malaysiaDateKey } from "./calendar-data";
import { DatePicker } from "../../components/ui/date-picker";
import {
  cancelRender,
  listRenders,
  mediaStatus,
  queueRender,
  renderDownload,
  renderPending,
  uploadVideo,
  type MediaAsset,
  type MediaStatus,
  type RenderInput,
  type RenderJob,
} from "./media-api";

const formats = {
  portrait: {
    label: "9:16 · Portrait",
    aspect: 9 / 16,
    width: 720,
    height: 1280,
  },
  square: { label: "1:1 · Square", aspect: 1, width: 1080, height: 1080 },
  landscape: {
    label: "16:9 · Landscape",
    aspect: 16 / 9,
    width: 1280,
    height: 720,
  },
};
const cleanText = (value: string) =>
  value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
const readableError = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
const failures: Record<string, string> = {
  RENDER_FAILED:
    "The video could not be rendered. Check the source and trim range, then create a new render.",
  INVALID_SOURCE:
    "The source video is not supported. Try an MP4 with H.264 video.",
  RENDER_TIMEOUT: "The render took too long. Try a shorter clip.",
};

export function VideoEditor({
  active = true,
  preview = false,
}: {
  active?: boolean;
  preview?: boolean;
}) {
  const [tool, setTool] = useState<EditorTool>("media");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [viewZoom, setViewZoom] = useState(1);
  const [soundtrack, setSoundtrack] = useState<LocalSoundtrack | null>(null);
  const overlayImages = useRef(new Map<string, HTMLImageElement>());
  const overlayUrls = useRef(new Set<string>());
  const overlayLoading = useRef(false);
  const sourceGeneration = useRef(0);
  const [overlays, setOverlays] = useState<VideoImageOverlay[]>([]);
  const [template, setTemplate] = useState("clean");
  const [aiUndo, setAiUndo] = useState<{
    state: VideoEditorState;
    overlays: VideoImageOverlay[];
    originalFrame: boolean;
  } | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const localExport = useRef<AbortController | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lightning, setLightning] = useState<LightningEffect | null>(null);
  const [proposedLightning, setProposedLightning] = useState<LightningEffect | null>(null);
  const [previewLightning, setPreviewLightning] = useState(false);
  const [lightningUndo, setLightningUndo] = useState<{effect: LightningEffect | null} | null>(null);
  const thunderContext = useRef<AudioContext | null>(null);
  const chosenLightning = previewLightning ? proposedLightning : lightning;
  function prepareLightning() {
    try { if (!source) throw new Error("Choose a video before preparing lightning and thunder."); setProposedLightning(lightningRecipe(duration / speed)); setPreviewLightning(false); setTool("ai"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Choose a clip at least half a second long."); }
  }
  function unlockThunder() {
    try { if (typeof AudioContext === "undefined") throw new Error("Audio preview is unavailable in this browser.");
      const context = thunderContext.current ?? new AudioContext(); thunderContext.current = context; return context.resume();
    } catch (error) { return Promise.reject(error); }
  }
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => malaysiaDateKey(new Date()));
  const [news, setNews] = useState(false);
  const [format, setFormat] = useState<RenderInput["format"]>("portrait");
  const [originalFrame, setOriginalFrame] = useState(true);
  const [sourceFrame, setSourceFrame] = useState({ width: 1280, height: 720, aspect: 16 / 9 });
  const [sourceDuration, setSourceDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<
    NonNullable<RenderInput["captions"]>
  >([]);
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const operations = useRef(new Set<AbortController>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      overlayUrls.current.forEach((url) => URL.revokeObjectURL(url));
      overlayUrls.current.clear();
      overlayImages.current.clear();
      for (const controller of operations.current) controller.abort();
    };
  }, []);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
  const pending = jobs.some(renderPending);
  useEffect(() => {
    if (!active || preview) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;
    async function refresh() {
      if (
        polling ||
        document.visibilityState === "hidden" ||
        controller.signal.aborted
      )
        return;
      polling = true;
      try {
        const [nextStatus, nextJobs] = await Promise.all([
          mediaStatus(controller.signal),
          listRenders(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setStatus(nextStatus);
          setJobs(nextJobs);
        }
      } catch (error) {
        if (!controller.signal.aborted) setNotice(readableError(error));
      } finally {
        polling = false;
        if (!controller.signal.aborted && pending)
          timer = setTimeout(refresh, 4000);
      }
    }
    const visibility = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    void refresh();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active, pending, preview]);

  async function action(work: (signal: AbortSignal) => Promise<void>) {
    const controller = new AbortController();
    operations.current.add(controller);
    setBusy(true);
    setNotice("");
    try {
      await work(controller.signal);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setNotice(readableError(error));
    } finally {
      operations.current.delete(controller);
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.volume = volume;
    }
  }, [speed, volume, source]);
  const maxDuration = Math.min(status?.limits.maxDuration ?? 120, 120);
  const dateLabel = date
    ? new Intl.DateTimeFormat("ms-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${date}T12:00:00+08:00`))
    : "";
  const validRange =
    Number.isFinite(start) &&
    Number.isFinite(duration) &&
    start >= 0 &&
    duration >= 0.1 &&
    duration <= maxDuration &&
    start + duration <= sourceDuration + 0.01;
  const validCaptions = captions.every(
    (c) =>
      cleanText(c.text).length > 0 &&
      cleanText(c.text).length <= 120 &&
      Number.isFinite(c.start) &&
      Number.isFinite(c.end) &&
      c.start >= 0 &&
      c.end > c.start &&
      c.end <= duration,
  );
  const dimensions = originalFrame && source ? sourceFrame : formats[format];
  useVideoSoundtrack(videoRef, soundtrack, {
    source,
    start,
    duration,
    speed,
    active: active && !busy,
  });
  let validMusic = true;
  try {
    if (soundtrack) validateSoundtrack(soundtrack);
  } catch {
    validMusic = false;
  }
  const validOverlays = overlays.every(
    (o) => o.start >= 0 && o.end > o.start && o.end <= duration,
  );
  let validLightning = true;
  try { if (lightning) validateLightning(lightning, duration / speed); } catch { validLightning = false; }
  useEffect(() => {
    // Changing the source/trim/speed invalidates an old timing proposal instead of silently retiming it.
    setPreviewLightning(false);setProposedLightning(null);
  }, [source, start, duration, speed]);
  useEffect(() => { setLightning(null);setLightningUndo(null); }, [source]);
  useEffect(() => () => { void thunderContext.current?.close().catch(() => {}); }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !chosenLightning || !active || busy) return;
    let stop = () => {}, generation = 0;
    const cancel = () => { generation++;stop();stop=()=>{}; };
    const sync = async () => {
      cancel();const current=generation;
      if (video.paused || document.hidden) return;
      try { validateLightning(chosenLightning, duration / speed);await unlockThunder();
        if (current !== generation || video.paused) return;
        const context=thunderContext.current!;
        stop=scheduleThunder(context,chosenLightning,context.destination,Math.max(0,(video.currentTime-start)/speed),duration/speed);
      } catch { if(current===generation)setNotice("Thunder preview was blocked. Tap Play again to enable audio."); }
    };
    const visibility = () => { if (document.hidden) cancel(); else void sync(); };
    document.addEventListener("visibilitychange",visibility);
    video.addEventListener("play",sync);video.addEventListener("pause",cancel);video.addEventListener("seeking",cancel);video.addEventListener("seeked",sync);video.addEventListener("ended",cancel);
    if (!video.paused) void sync();
    return () => { cancel();document.removeEventListener("visibilitychange",visibility);video.removeEventListener("play",sync);video.removeEventListener("pause",cancel);video.removeEventListener("seeking",cancel);video.removeEventListener("seeked",sync);video.removeEventListener("ended",cancel); };
  }, [source, chosenLightning, start, duration, speed, active, busy]);
  const edit: LocalVideoEdit = {
    start,
    duration,
    width: dimensions.width,
    height: dimensions.height,
    speed,
    volume,
    rotation,
    flip,
    brightness,
    contrast,
    saturation,
    overlays,
    soundtrack,
    lightning: chosenLightning,
    ...(template === "product" ||
    template === "cinematic" ||
    template === "captions"
      ? {
          titleCard: {
            text: cleanText(title),
            kicker:
              template === "product"
                ? "PRODUCT SPOTLIGHT"
                : template === "cinematic"
                  ? "ORBIT STORIES"
                  : "THE STORY",
            accent: template === "product" ? "#b2ed8c" : "#d1beff",
            background:
              template === "cinematic"
                ? "rgba(0,0,0,.5)"
                : "rgba(20,18,31,.88)",
            position:
              template === "captions" ? ("top" as const) : ("bottom" as const),
          },
        }
      : {}),
    captions,
    ...(news ? { news: { title: cleanText(title), date: dateLabel } } : {}),
  };
  const latestEdit = useRef(edit);
  latestEdit.current = edit;
  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);
  useEffect(() => {
    if (!source || !active) return;
    let frame = 0;
    const draw = () => {
      const video = videoRef.current,
        canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const current = latestEdit.current;
        if (canvas.width !== current.width) canvas.width = current.width;
        if (canvas.height !== current.height) canvas.height = current.height;
        const context = canvas.getContext("2d");
        if (context)
          drawEditedFrame(
            context,
            video,
            current,
            Math.max(0, video.currentTime - current.start),
            overlayImages.current,
          );
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, active]);
  async function addOverlays(files: FileList | null) {
    if (!files || busy || overlayLoading.current) return;
    overlayLoading.current = true;
    const generation = sourceGeneration.current;
    const room = 6 - overlays.length;
    const next: VideoImageOverlay[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      ) {
        setNotice("Use PNG, JPEG or WebP images up to 8 MB each.");
        continue;
      }
      const src = URL.createObjectURL(file);
      overlayUrls.current.add(src);
      try {
        const image = new Image();
        image.src = src;
        await image.decode();
        if (
          !mounted.current ||
          generation !== sourceGeneration.current ||
          image.naturalWidth * image.naturalHeight > 4_000_000
        )
          throw new Error("Use an overlay below 4 megapixels.");
        const id = crypto.randomUUID();
        overlayImages.current.set(id, image);
        next.push({
          id,
          src,
          x: 0.05,
          y: 0.05,
          width: 0.3,
          opacity: 1,
          start: 0,
          end: duration,
        });
      } catch {
        URL.revokeObjectURL(src);
        overlayUrls.current.delete(src);
        if (mounted.current)
          setNotice(
            "The image could not be loaded. Use an image below 4 megapixels.",
          );
      }
    }
    overlayLoading.current = false;
    if (mounted.current && generation === sourceGeneration.current)
      setOverlays((old) => [...old, ...next].slice(0, 6));
  }
  const aiCurrent: VideoEditorState = {
    sourceDuration,
    format,
    speed,
    volume,
    rotation: rotation as 0 | 90 | 180 | 270,
    flip,
    start,
    duration,
    brightness,
    contrast,
    saturation,
    template: template as VideoEditorState["template"],
    title,
    news,
    captions,
    layers: overlays.map(({ x, y, width, opacity, start, end }, index) => ({
      index,
      x,
      y,
      width,
      opacity,
      start,
      end,
    })),
  };
  function applyAi(changes: VideoEditorChanges) {
    const preset = videoTemplates.find((t) => t.id === changes.template);
    const next = {
      ...(preset
        ? {
            format: preset.format,
            news: preset.news,
            brightness: preset.brightness,
            contrast: preset.contrast,
            saturation: preset.saturation,
            speed: preset.speed,
          }
        : {}),
      ...changes,
    };
    if (next.duration !== undefined && next.duration > maxDuration) {
      setNotice(
        `Local video export supports clips up to ${maxDuration} seconds.`,
      );
      return;
    }
    setAiUndo({ state: aiCurrent, overlays, originalFrame });
    restoreAi(next);
    if (next.duration !== undefined && !next.captions)
      setCaptions((old) =>
        old
          .filter((c) => c.start < next.duration!)
          .map((c) => ({ ...c, end: Math.min(c.end, next.duration!) })),
      );
    if (next.duration !== undefined || next.layers) {
      const clipDuration = next.duration ?? duration;
      setOverlays((old) =>
        old
          .map((overlay, index) => {
            const layer = next.layers?.find((row) => row.index === index);
            if (!layer) return overlay;
            return {
              ...overlay,
              x: layer.x ?? overlay.x,
              y: layer.y ?? overlay.y,
              width: layer.width ?? overlay.width,
              opacity: layer.opacity ?? overlay.opacity,
              start: layer.start ?? overlay.start,
              end: layer.end ?? overlay.end,
            };
          })
          .filter((overlay) => overlay.start < clipDuration)
          .map((overlay) => ({
            ...overlay,
            end: Math.min(overlay.end, clipDuration),
          })),
      );
    }
  }
  function restoreAi(next: VideoEditorChanges) {
    if (next.template !== undefined) setTemplate(next.template);
    if (next.format !== undefined) { setFormat(next.format); setOriginalFrame(false); }
    if (next.speed !== undefined) setSpeed(next.speed);
    if (next.volume !== undefined) setVolume(next.volume);
    if (next.rotation !== undefined) setRotation(next.rotation);
    if (next.flip !== undefined) setFlip(next.flip);
    if (next.start !== undefined) setStart(next.start);
    if (next.duration !== undefined) setDuration(next.duration);
    if (next.brightness !== undefined) setBrightness(next.brightness);
    if (next.contrast !== undefined) setContrast(next.contrast);
    if (next.saturation !== undefined) setSaturation(next.saturation);
    if (next.title !== undefined) setTitle(next.title);
    if (next.news !== undefined) setNews(next.news);
    if (next.captions !== undefined) setCaptions(next.captions);
  }
  const canRender =
    !originalFrame &&
    !!asset &&
    !!status?.configured &&
    validRange &&
    validCaptions &&
    speed === 1 &&
    volume === 1 &&
    rotation === 0 &&
    !flip &&
    !edit.titleCard &&
    !soundtrack &&
    !lightning &&
    !previewLightning &&
    !overlays.length &&
    brightness === 1 &&
    contrast === 1 &&
    saturation === 1 &&
    (!news ||
      (cleanText(title).length > 0 &&
        cleanText(title).length <= 100 &&
        !!dateLabel));
  const putJob = (job: RenderJob) =>
    setJobs((previous) => [
      job,
      ...previous.filter((row) => row.id !== job.id),
    ]);
  function choose(file: File | undefined) {
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setNotice("Choose an MP4, WebM or MOV video.");
      return;
    }
    if (file.size > (status?.limits.uploadBytes ?? 256 * 1024 * 1024)) {
      setNotice(
        `Choose a video smaller than ${Math.floor((status?.limits.uploadBytes ?? 256 * 1024 * 1024) / 1024 / 1024)} MB.`,
      );
      return;
    }
    setAiUndo(null);
    setTemplate(neutralVideoSettings.template); setNews(neutralVideoSettings.news); setTitle(neutralVideoSettings.title);
    setBrightness(1); setContrast(1); setSaturation(1); setOriginalFrame(true); setViewZoom(1);
    sourceGeneration.current += 1;
    overlayUrls.current.forEach((url) => URL.revokeObjectURL(url));
    overlayUrls.current.clear();
    overlayImages.current.clear();
    setOverlays([]);
    setSelected(file);
    setAsset(null);
    setSource(URL.createObjectURL(file));
    setSourceDuration(0);
    setStart(0);
    setDuration(0);
    setCaptions([]);
    setSpeed(1);
    setVolume(1);
    setRotation(0);
    setFlip(false);
    setPlayhead(0);
    setNotice("");
  }
  async function download(job: RenderJob, signal: AbortSignal) {
    const blob = await renderDownload(job.id, signal);
    if (signal.aborted) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-${job.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "MP4 download started. On iPhone, find it in Safari downloads or Files.",
    );
  }
  return (
    <section className="workspace-view video-composer mobile-media-editor">
      <SectionHeading
        number="02"
        label="Video"
        title="A story worth sharing."
        action={
          <span className="template-chip">
            <Film size={14} aria-hidden="true" />
            Local editing templates
          </span>
        }
      />
      <div className="video-grid">
        <Card className="surface video-canvas">
          <div
            ref={stageRef}
            className="video-stage"
            style={{
              aspectRatio: dimensions.aspect,
              ...{ "--video-aspect": dimensions.aspect },
              containerType: "inline-size",
            }}
          >
            {source ? (
              <video
                ref={videoRef}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onEmptied={() => setPlaying(false)}
                onTimeUpdate={(event) =>
                  setPlayhead(event.currentTarget.currentTime)
                }
                src={source}
                playsInline
                onLoadedMetadata={(event) => {
                  const length = event.currentTarget.duration;
                  if (Number.isFinite(length) && length > 0) {
                    const rawWidth = event.currentTarget.videoWidth, rawHeight = event.currentTarget.videoHeight;
                    if (rawWidth > 0 && rawHeight > 0) { const scale = Math.min(1, 1920 / Math.max(rawWidth, rawHeight)); setSourceFrame({ width: Math.max(2, Math.round(rawWidth * scale / 2) * 2), height: Math.max(2, Math.round(rawHeight * scale / 2) * 2), aspect: rawWidth / rawHeight }); if (originalFrame) setFormat(rawWidth / rawHeight > 1.2 ? "landscape" : rawWidth / rawHeight < .9 ? "portrait" : "square"); }
                    setSourceDuration(length);
                    setDuration(Math.min(length, maxDuration));
                  } else
                    setNotice(
                      "This video has no usable duration. Choose another file.",
                    );
                }}
                onError={() => {
                  setSourceDuration(0);
                  setNotice(
                    "This browser cannot preview this file. Try an MP4 with H.264 video.",
                  );
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  visibility: "hidden",
                  transform: `scaleX(${flip ? -1 : 1}) rotate(${rotation}deg)`,
                  scale:
                    rotation % 180 !== 0
                      ? Math.min(dimensions.aspect, 1 / dimensions.aspect)
                      : 1,
                }}
              />
            ) : (
              <div className="video-placeholder">
                <Film size={40} aria-hidden="true" />
                <span>Your video goes here.</span>
              </div>
            )}
            {source ? (
              <canvas
                ref={canvasRef}
                style={{ transform: `scale(${viewZoom})` }}
                className="video-composite-preview"
                aria-label="Edited video preview"
              />
            ) : null}
            {source ? (
              <div
                className="video-layer-handles"
                style={{ transform: `scale(${viewZoom})` }}
              >
                {overlays
                  .filter(
                    (o) =>
                      playhead - start >= o.start && playhead - start < o.end,
                  )
                  .map((o, index) => {
                    const image = overlayImages.current.get(o.id),
                      height = image
                        ? (o.width * dimensions.aspect * image.naturalHeight) /
                          image.naturalWidth
                        : 0.1;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className="video-layer-handle"
                        aria-label={`Move video image layer ${overlays.indexOf(o) + 1}`}
                        aria-pressed={selectedLayer === o.id}
                        disabled={busy}
                        style={{
                          left: `${o.x * 100}%`,
                          top: `${o.y * 100}%`,
                          width: `${o.width * 100}%`,
                          height: `${height * 100}%`,
                        }}
                        onPointerDown={(e) => {
                          const box = stageRef.current?.getBoundingClientRect();
                          if (!box) return;
                          videoRef.current?.pause();
                          setSelectedLayer(o.id);
                          drag.current = {
                            id: o.id,
                            clientX: e.clientX,
                            clientY: e.clientY,
                            x: o.x,
                            y: o.y,
                            width: box.width * viewZoom,
                            height: box.height * viewZoom,
                          };
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          const d = drag.current;
                          if (!d || d.id !== o.id) return;
                          setOverlays((old) =>
                            old.map((row) =>
                              row.id === o.id
                                ? {
                                    ...row,
                                    x: Math.max(
                                      0,
                                      Math.min(
                                        1 - row.width,
                                        d.x + (e.clientX - d.clientX) / d.width,
                                      ),
                                    ),
                                    y: Math.max(
                                      0,
                                      Math.min(
                                        1 - height,
                                        d.y +
                                          (e.clientY - d.clientY) / d.height,
                                      ),
                                    ),
                                  }
                                : row,
                            ),
                          );
                        }}
                        onPointerUp={() => {
                          drag.current = null;
                        }}
                        onPointerCancel={() => {
                          drag.current = null;
                        }}
                        onKeyDown={(e) => {
                          const delta = e.shiftKey ? 0.05 : 0.01;
                          if (
                            ![
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                            ].includes(e.key)
                          )
                            return;
                          e.preventDefault();
                          setSelectedLayer(o.id);
                          setOverlays((old) =>
                            old.map((row) =>
                              row.id === o.id
                                ? {
                                    ...row,
                                    x: Math.max(
                                      0,
                                      Math.min(
                                        1 - row.width,
                                        row.x +
                                          (e.key === "ArrowLeft"
                                            ? -delta
                                            : e.key === "ArrowRight"
                                              ? delta
                                              : 0),
                                      ),
                                    ),
                                    y: Math.max(
                                      0,
                                      Math.min(
                                        1 - height,
                                        row.y +
                                          (e.key === "ArrowUp"
                                            ? -delta
                                            : e.key === "ArrowDown"
                                              ? delta
                                              : 0),
                                      ),
                                    ),
                                  }
                                : row,
                            ),
                          );
                        }}
                      >
                        <span>{index + 1}</span>
                      </button>
                    );
                  })}
              </div>
            ) : null}
          </div>
          {source ? (
            <div className="video-playhead">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                aria-label={playing ? "Pause video preview" : "Play video preview"}
                aria-pressed={playing}
                title={playing ? "Pause video preview" : "Play video preview"}
                style={{ minWidth: 44, minHeight: 44, padding: 10 }}
                onClick={() => {
                  const v = videoRef.current;
                  if (v) {
                    if (v.paused) {
                      if (chosenLightning) void unlockThunder().catch(() => setNotice("Tap Play again to enable thunder audio."));
                      void v
                        .play()
                        .catch(() => setNotice("Playback unavailable."));
                    } else v.pause();
                  }
                }}
              >
                {playing ? <Pause size={20} strokeWidth={1.5} aria-hidden="true" /> : <Play size={20} strokeWidth={1.5} aria-hidden="true" />}
              </Button>
              <input
                aria-label="Video playhead"
                type="range"
                min="0"
                max={sourceDuration || 1}
                step=".05"
                value={playhead}
                disabled={busy}
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Number(e.target.value);
                    setPlayhead(Number(e.target.value));
                  }
                }}
              />
              <output>{playhead.toFixed(1)}s</output>
            </div>
          ) : null}
          {source ? (
            <label className="field video-zoom">
              View zoom
              <input
                aria-label="Video view zoom"
                type="range"
                min=".5"
                max="2"
                step=".1"
                value={viewZoom}
                onChange={(e) => setViewZoom(Number(e.target.value))}
              />
              <output>{Math.round(viewZoom * 100)}% · view only</output>
            </label>
          ) : null}
          <div className="canvas-footer">
            <LockKeyhole size={13} aria-hidden="true" />
            Local preview
            {sourceDuration > 0 ? (
              <span>{sourceDuration.toFixed(1)}s</span>
            ) : null}
          </div>
          <p className="review-help">
            Preview and local export use the same layout. Local export works on
            your device. Keep this tab open until it finishes.
          </p>
        </Card>
        <Card className="surface video-controls">
<EditorToolPanel tool="media" active={tool}>
          <label className="upload-zone">
            <Upload size={24} aria-hidden="true" />
            <strong>Choose video</strong>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              aria-label="Choose video"
              disabled={busy}
              onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; choose(file); }}
            />
          </label>
          {selected ? (
            <p className="revision-label">
              {selected.name} · {(selected.size / 1024 / 1024).toFixed(1)} MB ·{" "}
              {asset ? "Uploaded" : "On your device"}
            </p>
          ) : null}
          <p className="review-help">
            {preview
              ? "Edit and export on your device. Sign in for workspace uploads."
              : status
                ? status.configured
                  ? `Private render setup enabled. Jobs wait for an available worker. Output up to ${maxDuration} seconds; upload up to ${Math.floor((status?.limits.uploadBytes ?? 256 * 1024 * 1024) / 1024 / 1024)} MB.`
                  : "Server rendering is not configured. You can still edit and export locally below."
                : "Checking render service…"}
          </p>
          <Button
            className="full-button"
            variant="outline"
            disabled={
              busy ||
              !selected ||
              !!asset ||
              !status?.configured ||
              sourceDuration <= 0 ||
              selected.size > status.limits.uploadBytes
            }
            onClick={() =>
              action(async (signal) => {
                if (!selected) return;
                const uploaded = await uploadVideo(selected, signal);
                if (signal.aborted) return;
                setAsset(uploaded);
                setNotice(
                  "Video uploaded to your private workspace. Choose settings, then render.",
                );
              })
            }
          >
            <Upload size={17} aria-hidden="true" />
            {asset ? "Uploaded" : "Upload to workspace"}
          </Button>
</EditorToolPanel><EditorToolPanel tool="ai" active={tool}>
          <EditorAiPanel
            assetIdentity={JSON.stringify([source, overlays.map(layer => layer.id)])}
            key={source}
            onPrepareLightning={prepareLightning}
            kind="video"
            onOpenMusic={() => { setTool("music"); setNotice("Choose a music file below to add a local soundtrack."); }}
            source={() => {
              const video = videoRef.current;
              if (!video || video.readyState < 2) return null;
              const current = latestEdit.current,
                scale = Math.min(
                  1,
                  768 / Math.max(current.width, current.height),
                );
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(current.width * scale));
              canvas.height = Math.max(1, Math.round(current.height * scale));
              const ctx = canvas.getContext("2d");
              if (!ctx) return null;
              ctx.scale(scale, scale);
              drawEditedFrame(
                ctx,
                video,
                current,
                Math.max(0, video.currentTime - current.start),
                overlayImages.current,
              );
              return canvas;
            }}
            current={aiCurrent}
            disabled={busy || !source || !validRange}
            preview={preview}
            onApply={(changes) => applyAi(changes as VideoEditorChanges)}
          />
          <section aria-label="Local lightning and thunder" className="surface" style={{padding:16}}>
            <h3>Lightning + thunder</h3><p className="review-help">A stylized lightning overlay with synthesized thunder. Your original scene and music stay in place. This does not replace the background or generate a new clip.</p>
            <Button variant="outline" disabled={busy || !source} onClick={prepareLightning}>Prepare lightning + thunder</Button>
            {proposedLightning ? <div role="region" aria-label="Lightning proposal"><p>One lightning event at {proposedLightning.at.toFixed(2)}s in the finished video, followed by synthesized thunder after {proposedLightning.thunderDelay.toFixed(2)}s.</p><p className="review-help">Preview is temporary. Apply includes the effect in local video exports.</p>
              <Button variant="outline" disabled={busy} onClick={() => { const video=videoRef.current;if(!video)return;setPreviewLightning(true);video.currentTime=start;void unlockThunder().then(()=>video.play()).catch(()=>setNotice("Tap Play to preview lightning and thunder.")); }}>Preview lightning + thunder</Button>
              <Button variant="outline" disabled={busy || !previewLightning} onClick={()=>{videoRef.current?.pause();setPreviewLightning(false);}}>Stop effect preview</Button>
              <Button disabled={busy} onClick={()=>{videoRef.current?.pause();setLightningUndo({effect:lightning});setLightning(proposedLightning);setPreviewLightning(false);setProposedLightning(null);setNotice("Lightning and synthesized thunder applied to local export.");}}>Apply lightning + thunder</Button>
            </div> : null}
            {lightning ? <p role="status">Lightning + synthesized thunder active.</p> : null}
            {lightningUndo ? <Button variant="outline" disabled={busy} onClick={()=>{videoRef.current?.pause();setLightning(lightningUndo.effect);setLightningUndo(null);setPreviewLightning(false);setProposedLightning(null);setNotice("Lightning edit undone.");}}>Undo lightning edit</Button> : null}
            {!validLightning ? <p role="alert">The applied lightning timing no longer fits this trim. Undo it or prepare a new effect before exporting.</p> : null}
          </section>

          {aiUndo ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                restoreAi(aiUndo.state);
                setOriginalFrame(aiUndo.originalFrame);
                setOverlays(aiUndo.overlays);
                setAiUndo(null);
              }}
            >
              Undo AI edit
            </Button>
          ) : null}
</EditorToolPanel><EditorToolPanel tool="music" active={tool}>
          <SoundtrackControls
            value={soundtrack}
            onChange={setSoundtrack}
            disabled={busy}
          />
</EditorToolPanel><EditorToolPanel tool="layout" active={tool}>
          <section aria-label="Video template gallery">
            <h3>Start with a template</h3>
            <p className="review-help">
              Original Orbit layouts. Every setting remains editable.
            </p>
            <Button variant="outline" aria-pressed={originalFrame && template === "clean" && !news} disabled={busy || !source} onClick={() => { setTemplate("clean"); setNews(false); setTitle(""); setCaptions([]); setBrightness(1); setContrast(1); setSaturation(1); setSpeed(1); setRotation(0); setFlip(false); setOriginalFrame(true); setNotice("Original source framing and colour restored. Uploaded layers and music remain editable."); }}>Original source · no template</Button>
            <div className="video-creative-presets">{creativeVideoTemplates.map(preset => <button type="button" key={preset.key} aria-pressed={!originalFrame && template === preset.template && format === preset.format && brightness === preset.brightness && contrast === preset.contrast && saturation === preset.saturation && speed === preset.speed} disabled={busy || !source} onClick={() => { setOriginalFrame(false); setTemplate(preset.template); setFormat(preset.format); setNews(false); setBrightness(preset.brightness); setContrast(preset.contrast); setSaturation(preset.saturation); setSpeed(preset.speed); if (preset.key === "ugc" && duration > 0 && !captions.length) setCaptions(["Your opening hook", "Show the detail", "Your next step"].map((text, index) => ({ text, start: index * duration / 3, end: (index + 1) * duration / 3 }))); if (preset.key === "photo-dump") { if (!overlays.length) setNotice("Photo sequence uses uploaded image layers. Add photos under Layers, then apply this template."); else { setOverlays(current => current.map((layer, index) => { const bitmap = overlayImages.current.get(layer.id), width = bitmap ? Math.min(.88, .88 / (9 / 16) * bitmap.naturalWidth / bitmap.naturalHeight) : .88; return { ...layer, x: (1 - width) / 2, y: .06, width, start: index * duration / current.length, end: (index + 1) * duration / current.length }; })); setNotice("Your uploaded photos are arranged in sequence. Adjust each timing under Layers."); } } else setNotice(`${preset.name} applied. Your source file stays unchanged; all text and timings are editable.`); }}><span aria-hidden="true" className={`video-preset-art preset-${preset.key}`}><i/><i/><i/></span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div>
            <details className="video-additional-templates"><summary>Explore frame and title styles</summary>
            <div className="video-template-gallery">
              {videoTemplates.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={busy}
                  aria-pressed={!originalFrame && template === t.id}
                  onClick={() => {
                    setTemplate(t.id);
                    setOriginalFrame(false);
                    setFormat(t.format);
                    setNews(t.news);
                    setBrightness(t.brightness);
                    setContrast(t.contrast);
                    setSaturation(t.saturation);
                    setSpeed(t.speed);
                    if (t.id === "captions" && duration > 0 && !captions.length)
                      setCaptions([
                        {
                          text: "Your opening line",
                          start: 0,
                          end: Math.min(3, duration),
                        },
                      ]);
                  }}
                >
                  <strong>{t.name}</strong>
                  <small>{t.description}</small>
                </button>
              ))}
            </div>
            </details>
          </section>
</EditorToolPanel><EditorToolPanel tool="adjust" active={tool}>
          <details className="small-details" open={tool === "adjust" || undefined}>
            <summary>Colour adjustments</summary>
            {(
              [
                ["Brightness", brightness, setBrightness, 0.5, 1.5],
                ["Contrast", contrast, setContrast, 0.5, 1.5],
                ["Saturation", saturation, setSaturation, 0, 2],
              ] as const
            ).map(([name, value, setter, min, max]) => (
              <label className="field" key={name}>
                {name}
                <input
                  aria-label={`Video ${name.toLowerCase()}`}
                  type="range"
                  min={min}
                  max={max}
                  step=".01"
                  value={value}
                  disabled={busy}
                  onChange={(e) => setter(Number(e.target.value))}
                />
                <output>{Math.round(value * 100)}%</output>
              </label>
            ))}
          </details>
</EditorToolPanel><EditorToolPanel tool="layers" active={tool}>
          <details className="small-details" open={tool === "layers" || undefined}>
            <summary>Image overlays · {overlays.length}/6</summary>
            <p className="review-help">
              Add logos, product images or picture-in-picture stills. Times use
              the trimmed clip before speed adjustment. Later layers appear on
              top.
            </p>
            <label className="field">
              Add overlay images
              <input
                aria-label="Add video image overlays"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                disabled={busy || !validRange || overlays.length >= 6}
                onChange={(e) => {
                  void addOverlays(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="video-overlay-list">
              {overlays.map((o, i) => (
                <div className="video-overlay-row" key={o.id}>
                  <strong>Image layer {i + 1}</strong>
                  <div className="two-fields">
                    {(
                      ["x", "y", "width", "opacity", "start", "end"] as const
                    ).map((field) => (
                      <label className="field" key={field}>
                        {
                          {
                            x: "Left (%)",
                            y: "Top (%)",
                            width: "Width (%)",
                            opacity: "Opacity (%)",
                            start: "From (seconds)",
                            end: "To (seconds)",
                          }[field]
                        }
                        <input
                          aria-label={`Layer ${i + 1} ${field}`}
                          type="number"
                          min={field === "width" ? 5 : 0}
                          max={
                            field === "start" || field === "end"
                              ? duration
                              : 100
                          }
                          step={field === "start" || field === "end" ? 0.1 : 1}
                          value={
                            field === "start" || field === "end"
                              ? o[field]
                              : Math.round(o[field] * 100)
                          }
                          disabled={busy}
                          onChange={(e) => {
                            const value =
                              Number(e.target.value) /
                              (field === "start" || field === "end" ? 1 : 100);
                            setOverlays((old) =>
                              old.map((row) =>
                                row.id === o.id
                                  ? { ...row, [field]: value }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      URL.revokeObjectURL(o.src);
                      overlayUrls.current.delete(o.src);
                      overlayImages.current.delete(o.id);
                      setOverlays((old) =>
                        old.filter((row) => row.id !== o.id),
                      );
                    }}
                  >
                    Remove layer
                  </Button>
                </div>
              ))}
            </div>
            {!validOverlays ? (
              <p role="alert">
                Keep image layer timings inside the trimmed clip.
              </p>
            ) : null}
          </details>
</EditorToolPanel><EditorToolPanel tool="adjust" active={tool}>
          <div className="two-fields">
            <label className="field">
              Speed
              <select
                aria-label="Video speed"
                disabled={busy}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Volume
              <input
                aria-label="Video volume"
                type="range"
                min="0"
                max="1"
                step=".05"
                disabled={busy}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
              <output>
                {Math.round(volume * 100)}%{volume === 0 ? " · Muted" : ""}
              </output>
            </label>
          </div>
          <div className="review-actions">
            <Button
              variant="outline"
              disabled={busy || !source}
              onClick={() => setRotation((v) => (v + 90) % 360)}
            >
              Rotate 90°
            </Button>
            <Button
              variant="outline"
              disabled={busy || !source}
              onClick={() => setFlip((v) => !v)}
            >
              Flip {flip ? "on" : "off"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !source}
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.currentTime = start;
                  void video
                    .play()
                    .catch(() =>
                      setNotice("Tap play on the preview to start."),
                    );
                }
              }}
            >
              Preview from trim
            </Button>
          </div>
          <label className="field">
            Format
            <select
              aria-label="Video format"
              value={originalFrame ? "original" : format}
              disabled={busy}
              onChange={(event) => { if (event.target.value === "original") setOriginalFrame(true); else { setOriginalFrame(false); setFormat(event.target.value as RenderInput["format"]); } }}
            >
              <option value="original">Original source frame</option>
              {Object.entries(formats).map(([value, entry]) => (
                <option key={value} value={value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div className="two-fields">
            <label className="field">
              Start (seconds)
              <input
                aria-label="Trim start seconds"
                type="number"
                min="0"
                step="0.1"
                value={start}
                disabled={busy}
                onChange={(event) => setStart(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Length (seconds)
              <input
                aria-label="Trim length seconds"
                type="number"
                min="0.1"
                max={maxDuration}
                step="0.1"
                value={duration}
                disabled={busy}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          </div>
          {source && !validRange ? (
            <p className="review-help">
              Choose a trim range within this video, up to {maxDuration}{" "}
              seconds.
            </p>
          ) : null}
          <label className="field">
            <span>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, minHeight: 16, padding: 0 }}
                checked={news}
                disabled={busy}
                onChange={(event) => setNews(event.target.checked)}
              />{" "}
              News report overlay
            </span>
          </label>
          {!news && template !== "clean" ? (
            <label className="field">
              Template headline
              <input
                aria-label="Template video headline"
                maxLength={100}
                disabled={busy}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          ) : null}
          {news ? (
            <>
              <label className="field">
                <Type size={15} aria-hidden="true" />
                Title
                <textarea
                  aria-label="Video title"
                  maxLength={100}
                  disabled={busy}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <div className="field">
                <span>Date</span>
                <DatePicker
                  label="Video date"
                  disabled={busy}
                  value={date}
                  onChange={setDate}
                />
              </div>
              <p className="review-help">
                Transparent red panel with the date above the title. Font and
                opacity use the News report preset.
              </p>
            </>
          ) : null}
</EditorToolPanel><EditorToolPanel tool="captions" active={tool}>
          <VideoAiPlanPanel
            key={`${source}:${start}:${duration}`}
            duration={duration}
            disabled={busy || !source || !validRange}
            preview={preview}
            onApply={(plan) => {
              setTitle(plan.title);
              setCaptions(plan.captions);
              setNews(true);
            }}
          />
          <details className="small-details" open={tool === "captions" || undefined}>
            <summary>Timed captions</summary>
            <p>Times are relative to the trimmed clip. Up to 20 captions.</p>
            {captions.map((caption, index) => (
              <div key={index}>
                <label className="field">
                  Caption {index + 1}
                  <input
                    aria-label={`Caption ${index + 1} text`}
                    maxLength={120}
                    value={caption.text}
                    disabled={busy}
                    onChange={(event) =>
                      setCaptions((old) =>
                        old.map((row, i) =>
                          i === index
                            ? { ...row, text: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
                <div className="two-fields">
                  {(["start", "end"] as const).map((field) => (
                    <label className="field" key={field}>
                      {field === "start" ? "From" : "To"} (seconds)
                      <input
                        aria-label={`Caption ${index + 1} ${field}`}
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={caption[field]}
                        disabled={busy}
                        onChange={(event) =>
                          setCaptions((old) =>
                            old.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    [field]: Number(event.target.value),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-action"
                  disabled={busy}
                  onClick={() =>
                    setCaptions((old) => old.filter((_, i) => i !== index))
                  }
                >
                  <X size={15} />
                  Remove caption
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              disabled={busy || captions.length >= 20 || duration < 0.1}
              onClick={() =>
                setCaptions((old) => [
                  ...old,
                  { text: "", start: 0, end: Math.min(duration, 3) },
                ])
              }
            >
              Add caption
            </Button>
            {!validCaptions ? (
              <p className="review-help">
                Fill each caption and keep its start and end within the trimmed
                clip.
              </p>
            ) : null}
          </details>
</EditorToolPanel><EditorToolPanel tool="export" active={tool}>
          <p className="review-help">
            {originalFrame ? "Original source frame is retained by local export (up to 1920px). Choose a standard format to enable a server render. " : ""}
            Selected clip: {duration > 0 ? (duration / speed).toFixed(1) : "0"}{" "}
            seconds after speed adjustment. Speed, volume, rotate and flip are
            applied by local export with image layers and colour. The server
            preset uses trim, format, title and captions.
          </p>
          <Button
            className="full-button"
            disabled={
              busy ||
              !source ||
              !validRange ||
              !validCaptions ||
              !validOverlays ||
              !validMusic ||
              !validLightning ||
              previewLightning ||
              (news && (!cleanText(title) || !dateLabel))
            }
            onClick={() =>
              action(async (signal) => {
                localExport.current =
                  [...operations.current].find(
                    (controller) => controller.signal === signal,
                  ) ?? null;
                videoRef.current?.pause();
                setExportProgress(0);
                try {
                  const blob = await exportLocalVideo(
                    source,
                    {
                      start,
                      duration,
                      width: dimensions.width,
                      height: dimensions.height,
                      speed,
                      volume,
                      rotation,
                      flip,
                      captions,
                      overlays,
                      soundtrack,
                      lightning,
                      titleCard: edit.titleCard,
                      brightness,
                      contrast,
                      saturation,
                      ...(news
                        ? { news: { title: cleanText(title), date: dateLabel } }
                        : {}),
                    },
                    signal,
                    (value) => {
                      if (mounted.current) setExportProgress(value);
                    },
                  );
                  if (signal.aborted) return;
                  const url = URL.createObjectURL(blob),
                    link = document.createElement("a");
                  link.href = url;
                  link.download = `orbit-edited.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                  setNotice(
                    `Edited ${blob.type.includes("mp4") ? "MP4" : "WebM"} exported. On iPhone use Safari downloads or Files.`,
                  );
                } finally {
                  if (mounted.current) setExportProgress(null);
                  localExport.current = null;
                }
              })
            }
          >
            <Download size={17} />
            {exportProgress !== null
              ? `Exporting ${Math.round(exportProgress)}%`
              : "Export edited video locally"}
          </Button>
          {exportProgress !== null ? (
            <>
              <progress
                aria-label="Local video export progress"
                value={exportProgress}
                max={100}
                style={{ width: "100%" }}
              />
              <Button
                variant="outline"
                onClick={() => localExport.current?.abort()}
              >
                Cancel local export
              </Button>
            </>
          ) : null}
          <p className="review-help">
            Image layers and colour adjustments require local export. Local
            export uses your browser encoder: MP4 where supported, otherwise
            WebM. No upload required. Timed captions are manual; AI
            transcription is not enabled here.
          </p>
          <Button
            className="full-button"
            disabled={busy || !canRender}
            onClick={() =>
              action(async (signal) => {
                if (!asset) return;
                const job = await queueRender(
                  {
                    assetId: asset.id,
                    start,
                    duration,
                    format,
                    ...(news
                      ? { news: { title: cleanText(title), date: dateLabel } }
                      : {}),
                    ...(captions.length
                      ? {
                          captions: captions.map((c) => ({
                            ...c,
                            text: cleanText(c.text),
                          })),
                        }
                      : {}),
                  },
                  signal,
                );
                if (signal.aborted) return;
                putJob(job);
                setNotice("Render queued. You can follow its status below.");
              })
            }
          >
            <Film size={17} aria-hidden="true" />
            {busy ? "Working…" : "Render MP4"}
          </Button>
      <div className="numbered-section">
        <div className="section-index">
          <span>01</span>Render queue
        </div>
        <div className="schedule-list">
          {!jobs.length ? (
            <p className="review-help">
              Your workspace render jobs appear here after you submit a video.
            </p>
          ) : (
            jobs.map((job) => (
              <Card className="surface schedule-row" key={job.id}>
                <div>
                  <strong>
                    {job.status === "SUCCEEDED"
                      ? "MP4 ready"
                      : job.status === "QUEUED"
                        ? "Waiting for worker"
                        : job.status === "PROCESSING"
                          ? "Rendering"
                          : job.status === "CANCELLED"
                            ? "Cancelled"
                            : "Render failed"}
                  </strong>
                  <p className="revision-label">
                    {new Intl.DateTimeFormat("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(job.createdAt))}
                  </p>
                  {job.status === "FAILED" ? (
                    <p>
                      {failures[job.errorCode ?? ""] ??
                        "The render could not be completed. Try a supported video and a shorter clip."}
                    </p>
                  ) : null}
                </div>
                {renderPending(job) ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      action(async (signal) => {
                        const next = await cancelRender(job.id, signal);
                        if (!signal.aborted) {
                          putJob(next);
                          setNotice(
                            next.status === "CANCELLED"
                              ? "Render cancelled."
                              : "Cancellation requested. Refreshing job status.",
                          );
                        }
                      })
                    }
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                ) : job.status === "SUCCEEDED" ? (
                  <Button
                    disabled={busy}
                    onClick={() => action((signal) => download(job, signal))}
                  >
                    <Download size={17} />
                    Download MP4
                  </Button>
                ) : null}
              </Card>
            ))
          )}
          <Button
            variant="outline"
            disabled={preview || busy || !active}
            onClick={() =>
              action(async (signal) => {
                const next = await listRenders(signal);
                if (!signal.aborted) setJobs(next);
              })
            }
          >
            <RefreshCw size={16} />
            Refresh renders
          </Button>
        </div>
      </div>

</EditorToolPanel>
          {notice ? (
            <p role="status" className="action-notice">
              {notice}
            </p>
          ) : null}
        </Card>
      </div>
      <MobileEditorToolbar kind="Video" value={tool} onChange={setTool} tools={videoTools}/>
    </section>
  );
}
