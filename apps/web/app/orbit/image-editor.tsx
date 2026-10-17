"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RotateCw, FlipHorizontal, RefreshCw, Plus, Copy, Trash2, ArrowUp, ArrowDown, Undo2, Layers } from "lucide-react";
import { Button, Card } from "./ui";
import { SectionHeading } from "./design-ui";
import { ImageAiPanel } from "./image-ai-panel";
import { EditorAiPanel } from "./editor-ai-panel";
import type { ImageEditorChanges, ImageEditorState } from "./editor-ai-contract";
import { applyImageTemplate, freshComposition, imageCarouselZip, imageTemplates, renderImageComposition, type ImageComposition, type Overlay } from "./image-composition";
import "./image-editor.css";

type Slide = { id: string; name: string; state: ImageComposition };
const createSlide = (name = "Slide 1"): Slide => ({ id: crypto.randomUUID(), name, state: freshComposition() });
const downloadBlob = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const canvasBlob = (canvas: HTMLCanvasElement, format: string) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Export failed. Try a smaller image.")), `image/${format}`, .92));

/** Local composition stays on this device. AI upload happens only on an explicit request. */
export function ImageEditor({ preview = false }: { preview?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [slides, setSlides] = useState<Slide[]>(() => [createSlide()]);
  const [active, setActive] = useState(0), [selectedLayer, setSelectedLayer] = useState("");
  const [aiBusy, setAiBusy] = useState(false), [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState("png"), [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<ImageComposition | null>(null);
  const generation = useRef(0);
  const state = slides[active].state, image = state.image;
  const layer = state.overlays.find(item => item.id === selectedLayer);
  const busy = aiBusy || loading || exporting;
  const hasArtwork = Boolean(image || state.template !== "original" || state.overlays.length || state.caption);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { try { if (canvas.current) renderImageComposition(canvas.current, state); } catch (error) { setNotice(error instanceof Error ? error.message : "Preview is unavailable."); } }, [state]);
  function patch(changes: Partial<ImageComposition>) { setSlides(items => items.map((slide, index) => index === active ? { ...slide, state: { ...slide.state, ...changes } } : slide)); }
  function snapshot() { setUndo(state); }
  function activate(index: number) { if (busy) return; generation.current++; setActive(index); setSelectedLayer(""); setUndo(null); setNotice(""); }
  async function decode(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25 * 1024 * 1024) throw Error("Choose a PNG, JPEG or WebP under 25 MB.");
    const url = URL.createObjectURL(file), next = new Image();
    try { next.src = url; await next.decode(); if (next.naturalWidth * next.naturalHeight > 16_000_000) throw Error("Choose an image under 16 megapixels."); return next; }
    finally { URL.revokeObjectURL(url); }
  }
  async function select(file?: File, overlay = false) {
    if (!file) return false;
    const request = ++generation.current; setLoading(true); setNotice("");
    try {
      const next = await decode(file); if (request !== generation.current) return false;
      const retained = new Set(slides.flatMap((slide, index) => [...(slide.state.image && (overlay || index !== active) ? [slide.state.image] : []), ...slide.state.overlays.map(item => item.image)]));
      retained.add(next);
      if ([...retained].reduce((pixels, item) => pixels + item.naturalWidth * item.naturalHeight, 0) > 40_000_000) throw Error("This carousel is using too much image memory. Use smaller images or remove a slide/layer.");
      snapshot();
      if (overlay) {
        if (state.overlays.length >= 8) throw Error("Use up to eight image layers per slide.");
        const id = crypto.randomUUID(); patch({ overlays: [...state.overlays, { id, name: file.name, image: next, x: 50, y: 50, width: 40, opacity: 100 }] }); setSelectedLayer(id);
      } else { patch({ image: next }); }
      return true;
    } catch (error) { if (request === generation.current) setNotice(error instanceof Error ? error.message : "This image could not be opened."); return false; }
    finally { if (request === generation.current) setLoading(false); }
  }
  function updateLayer(changes: Partial<Overlay>) { if (layer) patch({ overlays: state.overlays.map(item => item.id === layer.id ? { ...item, ...changes } : item) }); }
  function reorderLayer(direction: number) { if (!layer) return; const next = [...state.overlays], index = next.findIndex(item => item.id === layer.id), target = index + direction; if (target < 0 || target >= next.length) return; snapshot(); [next[index], next[target]] = [next[target], next[index]]; patch({ overlays: next }); }
  function addSlide(duplicate = false) { if (slides.length >= 10) return; const next = createSlide(`Slide ${slides.length + 1}`); if (duplicate) next.state = { ...state, overlays: state.overlays.map(item => ({ ...item, id: crypto.randomUUID() })) }; setSlides(items => [...items, next]); setActive(slides.length); setSelectedLayer(""); setUndo(null); }
  function reorderSlide(direction: number) { const target = active + direction; if (target < 0 || target >= slides.length) return; const next = [...slides]; [next[active], next[target]] = [next[target], next[active]]; setSlides(next); setActive(target); }
  async function download(all = false) {
    if (busy) return; setExporting(true); setNotice("");
    try {
      const files: { name: string; bytes: Uint8Array }[] = [];
      const selected = all ? slides : [slides[active]];
      for (let i = 0; i < selected.length; i++) {
        const target = renderImageComposition(document.createElement("canvas"), selected[i].state);
        if (format === "jpeg") { const context = target.getContext("2d"); if (context) { context.globalCompositeOperation = "destination-over"; context.fillStyle = "white"; context.fillRect(0, 0, target.width, target.height); context.globalCompositeOperation = "source-over"; } }
        const blob = await canvasBlob(target, format), name = `orbit-slide-${String(all ? i + 1 : active + 1).padStart(2, "0")}.${format === "jpeg" ? "jpg" : "png"}`;
        if (!all) downloadBlob(blob, name); else files.push({ name, bytes: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (all) downloadBlob(new Blob([imageCarouselZip(files).buffer as ArrayBuffer], { type: "application/zip" }), "orbit-carousel.zip");
      setNotice(all ? `${files.length} carousel slides exported as a ZIP in slide order.` : "Image exported. Your original stays unchanged.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Export failed."); }
    finally { setExporting(false); }
  }
  const aiCurrent: ImageEditorState = { ratio: state.ratio as ImageEditorState["ratio"], rotation: state.rotation as ImageEditorState["rotation"], flip: state.flip, brightness: state.brightness, contrast: state.contrast, saturation: state.saturation, focusX: state.focusX, focusY: state.focusY, textSize: state.textSize, textPosition: (state.textPosition === "centre" ? "center" : state.textPosition) as ImageEditorState["textPosition"], textColor: state.textColor, caption: state.caption, template: state.template as ImageEditorState["template"], accent: state.accent, background: state.background };
  function applyAi(changes: ImageEditorChanges) { snapshot(); const base = changes.template ? applyImageTemplate(state, changes.template) : state; patch({ ...base, ...changes, caption: changes.caption ?? state.caption, textPosition: changes.textPosition === "center" ? "centre" : changes.textPosition ?? base.textPosition }); setNotice("AI composition applied. Review your slide before exporting."); }
  const sliders = (controls: { name: string; key: "brightness" | "contrast" | "saturation" | "focusX" | "focusY" | "textSize"; min?: number; max?: number }[]) => controls.map(control => <label className="slider-field" key={control.key}><span>{control.name}<output>{state[control.key]}%</output></span><input aria-label={`Image ${control.name.toLowerCase()}`} type="range" min={control.min ?? 0} max={control.max ?? 200} value={state[control.key]} onChange={event => patch({ [control.key]: Number(event.target.value) })}/></label>);
  return <section className="workspace-view image-composer">
    <SectionHeading number="02" label="Image" title="One idea. Every layer."/>
    <div className="image-template-strip" aria-label="Image templates">{imageTemplates.map(template => <button type="button" className={`image-template ${state.template === template.id ? "is-selected" : ""}`} key={template.id} disabled={busy} aria-pressed={state.template === template.id} onClick={() => { snapshot(); const next = applyImageTemplate(state, template.id); patch(next); }}><span className={`image-template-art template-${template.id}`} style={{ backgroundColor: template.color }}><i/><b>{template.id === "original" ? "+" : template.id === "quote" ? "“" : "Aa"}</b></span><strong>{template.name}</strong><small>{template.tag}</small></button>)}</div>
    <div className="video-grid">
      <Card className="surface video-canvas">
        <div className="image-stage">{!hasArtwork ? <div className="video-placeholder"><ImagePlus size={40}/><span>Start with an image or a template.</span></div> : null}<canvas ref={canvas} hidden={!hasArtwork} aria-label="Edited image preview"/></div>
        <div className="canvas-footer">Slide {active + 1} of {slides.length} · {state.overlays.length} overlay layers · up to 2048px</div>
        <div className="image-slide-strip" aria-label="Carousel slides">{slides.map((slide, index) => <button type="button" key={slide.id} disabled={busy} aria-pressed={index === active} aria-label={`Edit slide ${index + 1}`} onClick={() => activate(index)}><span style={{ background: slide.state.accent }}>{index + 1}</span>{slide.name}</button>)}</div>
        <div className="review-actions image-slide-actions"><Button variant="outline" disabled={busy || slides.length >= 10} onClick={() => addSlide()}><Plus size={16}/>Add slide</Button><Button variant="outline" disabled={busy || slides.length >= 10} onClick={() => addSlide(true)}><Copy size={16}/>Duplicate slide</Button><Button variant="outline" aria-label="Move slide earlier" disabled={busy || active === 0} onClick={() => reorderSlide(-1)}><ArrowUp size={16}/></Button><Button variant="outline" aria-label="Move slide later" disabled={busy || active === slides.length - 1} onClick={() => reorderSlide(1)}><ArrowDown size={16}/></Button><Button variant="outline" aria-label="Remove slide" disabled={busy || slides.length === 1} onClick={() => { setSlides(items => items.filter((_, index) => index !== active)); setActive(Math.max(0, active - 1)); setUndo(null); setSelectedLayer(""); }}><Trash2 size={16}/></Button></div>
        <p className="image-device-note">Original templates by Orbit. Your files stay on this device unless you choose an AI upload. Keep this page open until exported.</p>
      </Card>
      <Card className="surface video-controls">
        <EditorAiPanel key={slides[active].id} kind="image" current={aiCurrent} disabled={busy} preview={preview} onApply={applyAi}/>
        <fieldset disabled={busy} className="image-control-fieldset">
          <label className="upload-zone"><ImagePlus size={24}/><strong>{image ? "Replace base image" : "Choose image"}</strong><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose image" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }}/></label>
          <div className="two-fields"><label className="field">Crop<select aria-label="Image crop" value={state.ratio} onChange={event => patch({ ratio: event.target.value })}><option value="original">Original</option><option>1:1</option><option>4:5</option><option>9:16</option><option>16:9</option></select></label><label className="field">Export<select aria-label="Image export format" value={format} onChange={event => setFormat(event.target.value)}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label></div>
          <section className="image-layers" aria-label="Image overlay layers"><h3><Layers size={18}/>Image layers</h3><label className="image-overlay-upload"><Plus size={16}/>Add image overlay<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Add image overlay" disabled={state.overlays.length >= 8} onChange={event => { void select(event.target.files?.[0], true); event.target.value = ""; }}/></label>
          {state.overlays.length ? <><label className="field">Selected layer<select aria-label="Selected image layer" value={selectedLayer} onChange={event => setSelectedLayer(event.target.value)}><option value="">Choose a layer</option>{state.overlays.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name}</option>)}</select></label>{layer ? <>{([{ key: "x", name: "Horizontal position", max: 100 }, { key: "y", name: "Vertical position", max: 100 }, { key: "width", name: "Layer size", max: 150 }, { key: "opacity", name: "Layer opacity", max: 100 }] as const).map(control => <label className="slider-field" key={control.key}><span>{control.name}<output>{layer[control.key]}%</output></span><input aria-label={control.name} type="range" min={control.key === "width" ? 5 : 0} max={control.max} value={layer[control.key]} onChange={event => updateLayer({ [control.key]: Number(event.target.value) })}/></label>)}<div className="review-actions"><Button variant="outline" disabled={state.overlays[0].id === layer.id} onClick={() => reorderLayer(-1)}>Send backward</Button><Button variant="outline" disabled={state.overlays.at(-1)?.id === layer.id} onClick={() => reorderLayer(1)}>Bring forward</Button><Button variant="outline" aria-label="Remove image layer" onClick={() => { snapshot(); patch({ overlays: state.overlays.filter(item => item.id !== layer.id) }); setSelectedLayer(""); }}><Trash2 size={16}/></Button></div></> : null}</> : <p>Add a logo, product shot or another image above your base.</p>}</section>
          <details className="image-manual-controls"><summary>Adjust image and text</summary>
          <label className="field">Look preset<select aria-label="Image look preset" defaultValue="original" onChange={event => { const looks: Record<string, number[]> = { original: [100, 100, 100], vivid: [105, 115, 130], soft: [110, 90, 90], mono: [100, 115, 0] }; const values = looks[event.target.value]; patch({ brightness: values[0], contrast: values[1], saturation: values[2] }); }}><option value="original">Original</option><option value="vivid">Vivid</option><option value="soft">Soft</option><option value="mono">Monochrome</option></select></label>
          <div className="review-actions"><Button variant="outline" disabled={!image} aria-label="Rotate image" onClick={() => patch({ rotation: (state.rotation + 90) % 360 })}><RotateCw size={17}/>Rotate</Button><Button variant="outline" disabled={!image} aria-label="Flip image" onClick={() => patch({ flip: !state.flip })}><FlipHorizontal size={17}/>Flip</Button></div>
          {state.ratio !== "original" ? sliders([{ name: "Horizontal crop focus", key: "focusX", max: 100 }, { name: "Vertical crop focus", key: "focusY", max: 100 }]) : null}
          {sliders([{ name: "Brightness", key: "brightness" }, { name: "Contrast", key: "contrast" }, { name: "Saturation", key: "saturation" }])}
          <label className="field">Caption<textarea aria-label="Image caption" maxLength={200} value={state.caption} onChange={event => patch({ caption: event.target.value })}/></label>
          <div className="two-fields"><label className="field">Text position<select aria-label="Image text position" value={state.textPosition} onChange={event => patch({ textPosition: event.target.value })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option></select></label><label className="field">Text colour<input aria-label="Image text colour" type="color" value={state.textColor} onChange={event => patch({ textColor: event.target.value })}/></label></div>
          <label className="field">Template colour<input aria-label="Image template colour" type="color" value={state.background} onChange={event => patch({ accent: event.target.value, background: event.target.value })}/></label>
          {sliders([{ name: "Text size", key: "textSize", min: 60, max: 180 }])}
          </details>
        </fieldset>
        <details className="image-pixel-ai"><summary>Generate a new background or visual with AI</summary><ImageAiPanel source={() => canvas.current} disabled={!hasArtwork || loading || exporting} preview={preview} onBusyChange={setAiBusy} onResult={async blob => { const next = await decode(new File([blob], "orbit-ai-result.png", { type: blob.type })); snapshot(); patch(freshComposition(next)); }}/></details>
        <fieldset disabled={busy} className="image-control-fieldset"><Button disabled={!hasArtwork} onClick={() => void download()} aria-label="Export image"><Download size={17}/>{exporting ? "Exporting…" : "Export image"}</Button><Button variant="outline" disabled={slides.length < 2} onClick={() => void download(true)}><Download size={17}/>Export carousel ZIP</Button><Button variant="outline" disabled={!undo} onClick={() => { if (undo) { const previous = undo; setUndo(state); patch(previous); } }}><Undo2 size={17}/>Undo last composition</Button><Button variant="outline" onClick={() => { snapshot(); patch(freshComposition(image)); setSelectedLayer(""); }} aria-label="Reset image edits"><RefreshCw size={17}/>Reset edits</Button></fieldset>
        {notice ? <p role="status" className="action-notice">{notice}</p> : null}
      </Card>
    </div>
  </section>;
}
