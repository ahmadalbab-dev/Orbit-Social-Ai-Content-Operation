"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { apiResponse } from "./session-api";
import { Button } from "./ui";
import { validVideoPlan, type VideoEditPlan } from "./video-edit-plan";
export function VideoAiPlanPanel({
  duration,
  disabled,
  preview,
  onApply,
}: {
  duration: number;
  disabled: boolean;
  preview: boolean;
  onApply: (plan: VideoEditPlan) => void;
}) {
  const [brief, setBrief] = useState("");
  const [plan, setPlan] = useState<VideoEditPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    setPlan(null);
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [duration]);
  async function generate() {
    if (busy || disabled || !brief.trim()) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setNotice("");
    setPlan(null);
    try {
      const response = await apiResponse("/media/video-plan", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ brief: brief.trim(), duration }),
        signal: controller.signal,
      });
      const result = (await response.json()) as VideoEditPlan;
      if (controller.signal.aborted || pending.current !== controller) return;
      if (!validVideoPlan(result, duration))
        throw new Error(
          "AI returned timings outside this clip. Refine your brief and retry.",
        );
      setPlan(result);
    } catch (error) {
      if (pending.current === controller)
        setNotice(
          controller.signal.aborted
            ? "Video plan cancelled. A dispatched attempt may still count toward your quota."
            : error instanceof Error
              ? error.message
              : "The AI video plan could not be created.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="image-ai-panel" aria-label="AI video edit plan">
      <h3>
        <Sparkles size={18} aria-hidden="true" />
        Plan your video with AI
      </h3>
      <p>
        Describe what happens in your clip. AI suggests a title, timed captions
        and scene ideas from your description. It does not watch or edit the
        footage. Only your brief and clip length are sent to the AI provider.
        Each attempt uses your workspace AI quota and may incur provider
        charges.
      </p>
      <label className="field">
        Video brief
        <textarea
          aria-label="AI video brief"
          maxLength={1500}
          value={brief}
          disabled={busy || preview}
          onChange={(event) => {
            setBrief(event.target.value);
            setPlan(null);
          }}
          placeholder="A slow drive through Kuala Lumpur at sunrise. Write a calm Malay news title and three short captions."
        />
      </label>
      <Button
        disabled={preview || disabled || busy || !brief.trim()}
        onClick={() => void generate()}
      >
        <Sparkles size={16} />
        {busy ? "Planning…" : "Generate edit plan"}
      </Button>
      {busy ? (
        <Button variant="outline" onClick={() => pending.current?.abort()}>
          <X size={16} />
          Cancel video plan
        </Button>
      ) : null}
      {preview ? (
        <p>Sign in to generate an AI video plan.</p>
      ) : disabled ? (
        <p>Choose a video and valid trim length first.</p>
      ) : null}
      {plan ? (
        <div>
          <h4>{plan.title}</h4>
          <p>
            Caption timings use the trimmed source timeline, before speed
            adjustment.
          </p>
          {plan.captions.map((caption, index) => (
            <p key={index}>
              {caption.start.toFixed(1)}–{caption.end.toFixed(1)}s ·{" "}
              {caption.text}
            </p>
          ))}
          {plan.scenes.length ? (
            <details>
              <summary>Suggested scene ideas</summary>
              {plan.scenes.map((scene, index) => (
                <p key={index}>
                  {scene.start.toFixed(1)}–{scene.end.toFixed(1)}s ·{" "}
                  {scene.text}
                </p>
              ))}
            </details>
          ) : null}
          <Button
            disabled={disabled}
            onClick={() => {
              onApply(plan);
              setPlan(null);
              setNotice(
                "Title and captions applied. Preview and review them before exporting. Scene ideas remain suggestions.",
              );
            }}
          >
            Apply title and captions
          </Button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="action-notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
