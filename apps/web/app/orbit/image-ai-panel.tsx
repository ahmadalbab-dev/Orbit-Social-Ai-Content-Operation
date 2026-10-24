"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api, apiResponse } from "./session-api";
import {AiChat,useAiConversation} from "./ai-chat";
import { Button } from "./ui";

type Props = {
  source: () => HTMLCanvasElement | null;
  instructionDraft?: {text:string;id:number};
  disabled: boolean;
  generationDisabled?: boolean;
  preview: boolean;
  onResult: (blob: Blob) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void;
};
/** Only the explicit edit action uploads a bounded preview. The original stays on the device. */
export function ImageAiPanel({
  source,
  instructionDraft,
  disabled,
  generationDisabled = disabled,
  preview,
  onResult,
  onBusyChange,
}: Props) {
  const conversation=useAiConversation();
  const [prompt, setPrompt] = useState("");
  const [createNew, setCreateNew] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [imageProvider, setImageProvider] = useState("the configured image provider");
  const [previewLimit, setPreviewLimit] = useState(1024);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    if (!preview)
      void api<{ configured: boolean; provider?: string; model?: string; canGenerate?: boolean }>("/media/image-edit/status")
        .then((status) => {
          if (active) { setConfigured(status.configured); setCanGenerate(status.configured && status.canGenerate === true); setPreviewLimit(status.provider === "cloudflare" ? 511 : 1024); setImageProvider(status.provider === "cloudflare" ? "Cloudflare Workers AI (FLUX.2 Klein 4B)" : status.provider === "gateway" ? "Vercel AI Gateway (Gemini image editing)" : status.provider === "gemini" ? "Google Gemini (Nano Banana 2.1)" : status.provider === "fal-ai" ? "Hugging Face / fal-ai" : "the configured image provider"); }
        })
        .catch(() => {});
    return () => {
      active = false;
      pending.current?.abort();
      pending.current = null;
    };
  }, [preview]);
  useEffect(() => { if (instructionDraft) { setPrompt(instructionDraft.text.slice(0,1500)); setCreateNew(false); } }, [instructionDraft]);
  const needsMusic =
    /\b(?:add|insert|attach|include|put|tambah|masuk(?:kan)?|letak|sertakan)[\s\S]{0,80}(?:music|muzik|audio|soundtrack|song|lagu|voiceover|suara)\b/i.test(
      prompt,
    );
  async function edit() {
    if (preview || !configured || busy || !prompt.trim() || prompt.length > 1500 || (createNew ? !canGenerate || generationDisabled : disabled)) return;
    if (needsMusic) {
      setNotice(
        "Music needs a movie export. Open Turn your image or carousel into a movie, choose music and export an image movie. No AI request was sent.",
      );
      return;
    }
    const canvas = createNew ? null : source();
    if (!createNew && !canvas) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    onBusyChange?.(true);
    setNotice("");
    conversation.record("user",prompt.trim());
    try {
      let payload: {prompt:string;imageDataUrl?:string} = {prompt:prompt.trim()};
      if (canvas) {
      const copy = document.createElement("canvas");
      const scale = Math.min(1, previewLimit / Math.max(canvas.width, canvas.height));
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
      payload = {...payload,imageDataUrl};
      }
      const response = await apiResponse(createNew ? "/media/image-edit/generate" : "/media/image-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      conversation.record("assistant",createNew?"Your image is ready on the canvas. Review it, edit it or restore the previous composition with Undo.":"Your edited image is ready on the canvas. Review it before exporting.");
      setNotice(
        createNew ? "AI image generated. Review and edit it before exporting. Undo restores your previous composition." : "AI edit loaded. Review it before exporting. Your original file is unchanged.",
      );
    } catch (error) {
      if(pending.current===controller)conversation.record("notice",controller.signal.aborted?"Image request cancelled. A dispatched attempt may still count toward quota.":error instanceof Error?error.message:"AI imaging did not complete.");
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
    <section className="image-ai-panel orbit-chat-surface" aria-label="AI image editing">
      <AiChat title={createNew?"Imagine your next image.":"A new look for your image."} description="Describe your idea, review the result on your canvas, then refine and export." context="Media · Image generation" conversation={conversation} busy={busy}>
      {canGenerate?<div role="group" aria-label="AI image task"><Button variant="outline" disabled={busy} aria-pressed={!createNew} onClick={()=>{setCreateNew(false);setNotice("");}}>Edit current image</Button><Button variant="outline" disabled={busy} aria-pressed={createNew} onClick={()=>{setCreateNew(true);setNotice("");}}>Create from text</Button></div>:null}
      <h3>
        <Sparkles size={18} aria-hidden="true" /> {createNew?"Create with AI":"Edit with AI"}
      </h3>
      {createNew?<p>Describe a new image. Clicking Generate sends only your prompt to {imageProvider}; no current image or original file is uploaded. One attempt uses your shared workspace AI quota. Cloudflare account limits still apply; this does not promise unlimited free images.</p>:<p>
        Describe a background, lighting or style change. Clicking Edit sends
        this preview and your instruction to {imageProvider}. Each attempt
        uses your workspace AI quota and may incur provider charges.
      </p>}
      <label className="field">
        {createNew?"Your image":"Your edit"}
        <textarea
          aria-label={createNew?"AI image generation prompt":"AI image edit instruction"}
          value={prompt}
          disabled={busy || preview}
          maxLength={1500}
          placeholder={createNew?"A handmade ceramic coffee cup on a warm cream background, soft window light, no lettering.":"Keep the subject. Replace the background with a clean studio backdrop."}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <Button
        disabled={preview || (createNew ? generationDisabled || !canGenerate : disabled) || !configured || !prompt.trim() || busy}
        onClick={() => void edit()}
      >
        <Sparkles size={16} />
        {busy ? (createNew?"Generating image…":"Editing image…") : (createNew?"Generate image with AI":"Edit image with AI")}
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
      </AiChat>
      {notice ? (
        <p role="status" className="action-notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
