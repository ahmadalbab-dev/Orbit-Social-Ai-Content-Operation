"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api, apiResponse } from "./session-api";
import { Button } from "./ui";

type Props = {
  source: () => HTMLCanvasElement | null;
  instructionDraft?: {text:string;id:number};
  disabled: boolean;
  preview: boolean;
  onResult: (blob: Blob) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void;
};
/** Only the explicit edit action uploads a bounded preview. The original stays on the device. */
export function ImageAiPanel({
  source,
  instructionDraft,
  disabled,
  preview,
  onResult,
  onBusyChange,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [configured, setConfigured] = useState(false);
  const [imageProvider, setImageProvider] = useState("the configured image provider");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    if (!preview)
      void api<{ configured: boolean; provider?: string; model?: string }>("/media/image-edit/status")
        .then((status) => {
          if (active) { setConfigured(status.configured); setImageProvider(status.provider === "gemini" ? "Google Gemini (Nano Banana 2.1)" : status.provider === "fal-ai" ? "Hugging Face / fal-ai" : "the configured image provider"); }
        })
        .catch(() => {});
    return () => {
      active = false;
      pending.current?.abort();
      pending.current = null;
    };
  }, [preview]);
  useEffect(() => { if (instructionDraft) setPrompt(instructionDraft.text.slice(0,1500)); }, [instructionDraft]);
  const needsMusic =
    /\b(?:add|insert|attach|include|put|tambah|masuk(?:kan)?|letak|sertakan)[\s\S]{0,80}(?:music|muzik|audio|soundtrack|song|lagu|voiceover|suara)\b/i.test(
      prompt,
    );
  async function edit() {
    if (needsMusic) {
      setNotice(
        "Music needs a movie export. Open Turn your image or carousel into a movie, choose music and export an image movie. No AI request was sent.",
      );
      return;
    }
    const canvas = source();
    if (!canvas || !prompt.trim() || busy) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    onBusyChange?.(true);
    setNotice("");
    try {
      const copy = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(canvas.width, canvas.height));
      copy.width = Math.max(1, Math.round(canvas.width * scale));
      copy.height = Math.max(1, Math.round(canvas.height * scale));
      const context = copy.getContext("2d");
      if (!context) throw Error("Image preview is unavailable.");
      context.drawImage(canvas, 0, 0, copy.width, copy.height);
      const imageDataUrl = copy.toDataURL("image/png");
      if (imageDataUrl.length > 2_796_240)
        throw Error(
          "This preview is too large for AI editing. Crop or reduce the image and retry.",
        );
      const response = await apiResponse("/media/image-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, prompt: prompt.trim() }),
        signal: controller.signal,
      });
      if (
        !/^image\/(png|jpeg|webp)(;|$)/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        throw Error("AI did not return an editable image.");
      const blob = await response.blob();
      if (blob.size > 4 * 1024 * 1024)
        throw Error("AI returned an image that is too large.");
      if (controller.signal.aborted || pending.current !== controller) return;
      await onResult(blob);
      setNotice(
        "AI edit loaded. Review it before exporting. Your original file is unchanged.",
      );
    } catch (error) {
      if (pending.current === controller)
        setNotice(
          controller.signal.aborted
            ? "AI edit cancelled. A dispatched attempt may still count toward your quota."
            : error instanceof Error
              ? error.message
              : "AI editing did not complete.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  }
  return (
    <section className="image-ai-panel" aria-label="AI image editing">
      <h3>
        <Sparkles size={18} aria-hidden="true" /> Edit with AI
      </h3>
      <p>
        Describe a background, lighting or style change. Clicking Edit sends
        this preview and your instruction to {imageProvider}. Each attempt
        uses your workspace AI quota and may incur provider charges.
      </p>
      <label className="field">
        Your edit
        <textarea
          aria-label="AI image edit instruction"
          value={prompt}
          disabled={busy || preview}
          maxLength={1500}
          placeholder="Keep the subject. Replace the background with a clean studio backdrop."
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <Button
        disabled={preview || disabled || !configured || !prompt.trim() || busy}
        onClick={() => void edit()}
      >
        <Sparkles size={16} />
        {busy ? "Editing image…" : "Edit image with AI"}
      </Button>
      {needsMusic ? (
        <p role="status">
          Music needs a movie export. Open Turn your image or carousel into a
          movie below, upload your audio and export. A PNG cannot contain sound.
        </p>
      ) : null}
      {busy ? (
        <Button variant="outline" onClick={() => pending.current?.abort()}>
          <X size={16} />
          Cancel AI edit
        </Button>
      ) : null}
      {preview ? (
        <p>Sign in to use AI image editing.</p>
      ) : !configured ? (
        <p>AI image connection is not available yet. Local editing is ready.</p>
      ) : null}
      {notice ? (
        <p role="status" className="action-notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
