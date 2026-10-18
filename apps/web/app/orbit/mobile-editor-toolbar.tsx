"use client";

import { useId, type ReactNode } from "react";
import { ImagePlus, LayoutTemplate, Layers, SlidersHorizontal, Music2, Sparkles, Download, Captions } from "lucide-react";
import "./mobile-editor-toolbar.css";

const icons = { media: ImagePlus, layout: LayoutTemplate, layers: Layers, adjust: SlidersHorizontal, music: Music2, ai: Sparkles, export: Download, captions: Captions };
export type EditorTool = keyof typeof icons;
export const imageTools: EditorTool[] = ["media", "layout", "layers", "adjust", "music", "ai", "export"];
export const videoTools: EditorTool[] = ["media", "layout", "adjust", "layers", "music", "ai", "captions", "export"];
const labels: Record<EditorTool, string> = { media: "Media", layout: "Templates", layers: "Layers", adjust: "Adjust & text", music: "Music", ai: "AI editor", export: "Export", captions: "Captions" };

export function MobileEditorToolbar({ value, onChange, tools, kind }: { value: EditorTool; onChange: (tool: EditorTool) => void; tools: EditorTool[]; kind: string }) {
  return <nav className="mobile-editor-toolbar" aria-label={`${kind} editing tools`}><div className="mobile-editor-tool-strip">{tools.map(tool => {
    const Icon = icons[tool];
    return <button type="button" key={tool} aria-pressed={value === tool} onClick={event => { onChange(tool);
      const button = event.currentTarget;
      const strip = button.parentElement;
      // Scroll only the tool rail, never the editor page or the canvas.
      if (strip) strip.scrollTo({ left: Math.max(0, button.offsetLeft - (strip.clientWidth - button.clientWidth) / 2), behavior: "auto" });
      button.closest(".mobile-media-editor")?.querySelector(".video-controls")?.scrollTo({ top: 0, behavior: "instant" }); }}><Icon size={22} aria-hidden="true"/><span>{labels[tool]}</span></button>;
  })}</div></nav>;
}

// Keep every panel mounted: changing tools must not discard drafts or local files.
export function EditorToolPanel({ tool, active, children }: { tool: EditorTool; active: EditorTool; children: ReactNode }) {
  const id = useId();
  return <section className="editor-tool-panel" data-tool={tool} data-active={active === tool} aria-labelledby={id}><h3 id={id} className="mobile-tool-heading">{labels[tool]}</h3>{children}</section>;
}
