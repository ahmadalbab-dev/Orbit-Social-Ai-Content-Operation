"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  Film,
  LockKeyhole,
  RefreshCw,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Button, Card } from "./ui";
import { SectionHeading } from "./design-ui";
import { malaysiaDateKey } from "./calendar-data";
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

export function VideoEditor({ active = true, preview = false }: { active?: boolean; preview?: boolean }) {
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [title, setTitle] = useState(
    "Pemandangan terkini di sekitar Kuala Lumpur",
  );
  const [date, setDate] = useState(() => malaysiaDateKey(new Date()));
  const [news, setNews] = useState(true);
  const [format, setFormat] = useState<RenderInput["format"]>("portrait");
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
  const dimensions = formats[format];
  const canRender =
    !!asset &&
    !!status?.configured &&
    validRange &&
    validCaptions &&
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
    if (status && file.size > status.limits.uploadBytes) {
      setNotice(
        `Choose a video smaller than ${Math.floor(status.limits.uploadBytes / 1024 / 1024)} MB.`,
      );
      return;
    }
    setSelected(file);
    setAsset(null);
    setSource(URL.createObjectURL(file));
    setSourceDuration(0);
    setStart(0);
    setDuration(0);
    setCaptions([]);
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
    <section className="workspace-view">
      <SectionHeading
        number="02"
        label="Video"
        title="A story worth sharing."
        action={
          <span className="template-chip">
            <Film size={14} aria-hidden="true" />
            News report
          </span>
        }
      />
      <div className="video-grid">
        <Card className="surface video-canvas">
          <div
            className="video-stage"
            style={{
              aspectRatio: dimensions.aspect,
              containerType: "inline-size",
            }}
          >
            {source ? (
              <video
                src={source}
                controls
                playsInline
                onLoadedMetadata={(event) => {
                  const length = event.currentTarget.duration;
                  if (Number.isFinite(length) && length > 0) {
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
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div className="video-placeholder">
                <Film size={40} aria-hidden="true" />
                <span>Your video goes here.</span>
              </div>
            )}
            {news ? (
              <div
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  left: 0,
                  top: "70%",
                  width: "100%",
                  height: "24%",
                  background: "rgba(255,0,0,.42)",
                  color: "white",
                  overflow: "hidden",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${(36 / dimensions.width) * 100}%`,
                    top: "8.333%",
                    fontSize: `${(24 / dimensions.width) * 100}cqw`,
                  }}
                >
                  {dateLabel}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: `${(36 / dimensions.width) * 100}%`,
                    right: "5%",
                    top: "29.167%",
                    fontSize: `${((format === "portrait" ? 32 : 36) / dimensions.width) * 100}cqw`,
                    lineHeight: 1.25,
                    overflowWrap: "anywhere",
                  }}
                >
                  {cleanText(title)}
                </div>
              </div>
            ) : null}
          </div>
          <div className="canvas-footer">
            <LockKeyhole size={13} aria-hidden="true" />
            Local preview
            {sourceDuration > 0 ? (
              <span>{sourceDuration.toFixed(1)}s</span>
            ) : null}
          </div>
          <p className="review-help">
            Preview layout is approximate. The downloaded MP4 is the final
            result. Local files must be selected again after leaving this tab.
          </p>
        </Card>
        <Card className="surface video-controls">
          <label className="upload-zone">
            <Upload size={24} aria-hidden="true" />
            <strong>Choose video</strong>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              aria-label="Choose video"
              disabled={busy}
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </label>
          {selected ? (
            <p className="revision-label">
              {selected.name} · {(selected.size / 1024 / 1024).toFixed(1)} MB ·{" "}
              {asset ? "Uploaded" : "On your device"}
            </p>
          ) : null}
          <p className="review-help">
            {preview ? "Local preview. Sign in for uploads and MP4 rendering." : status
              ? status.configured
                ? `Private render setup enabled. Jobs wait for an available worker. Output up to ${maxDuration} seconds; upload up to ${Math.floor(status.limits.uploadBytes / 1024 / 1024)} MB.`
                : "Rendering is not configured by the workspace operator yet."
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
          <label className="field">
            Format
            <select
              aria-label="Video format"
              value={format}
              disabled={busy}
              onChange={(event) =>
                setFormat(event.target.value as RenderInput["format"])
              }
            >
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
              <label className="field">
                <CalendarDays size={15} aria-hidden="true" />
                Date
                <input
                  aria-label="Video date"
                  type="date"
                  disabled={busy}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <p className="review-help">
                Transparent red panel with the date above the title. Font and
                opacity use the News report preset.
              </p>
            </>
          ) : null}
          <details className="small-details">
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
          {notice ? (
            <p role="status" className="action-notice">
              {notice}
            </p>
          ) : null}
        </Card>
      </div>
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
    </section>
  );
}
