"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Download, ImagePlus, RotateCw, FlipHorizontal, RefreshCw, Plus, Copy, Trash2, ArrowUp, ArrowDown, Undo2, Layers, ZoomIn, ZoomOut, Maximize2, Film, X } from "lucide-react";
import { Button, Card } from "./ui";
import { MediaShare } from "./media-share";
import { SectionHeading } from "./design-ui";
import { ImageAiPanel } from "./image-ai-panel";
import { EditorAiPanel } from "./editor-ai-panel";
import type { ImageEditorChanges, ImageEditorState } from "./editor-ai-contract";
import { applyImageTemplate, applyUploadedImageBackground, applyImageStylePreset, applyImageLayout, imageLayouts, imageStylePresets, type ImageLayoutId, freshComposition, imageCarouselZip, imageTemplates, renderImageComposition, type ImageComposition, type Overlay } from "./image-composition";
import { boundedZoom, canvasPercent, draggedImageLayer, fittedImageViewport, gestureDistance, hitImageLayer, imageLayerBounds, type CanvasPoint, type CanvasViewport } from "./image-canvas-interaction";
import { SoundtrackControls } from "./soundtrack-controls";
import { exportCanvasMovie, type LocalSoundtrack } from "./local-soundtrack";
import {drawImageMotion,imageMotions,type ImageMotion} from "./image-motion";
import {beforeAfterRecipe} from "./image-recipes";
import "./image-editor.css";
import { MobileEditorToolbar, EditorToolPanel, imageTools, type EditorTool } from "./mobile-editor-toolbar";

type Slide = { id: string; name: string; state: ImageComposition };
const createSlide = (name = "Slide 1"): Slide => ({ id: crypto.randomUUID(), name, state: freshComposition() });
const downloadBlob = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const canvasBlob = (canvas: HTMLCanvasElement, format: string) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Export failed. Try a smaller image.")), `image/${format}`, .92));

function ImageLayoutThumbnail({ state, layout }: { state: ImageComposition; layout: ImageLayoutId }) {
  const preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = preview.current; if (!target) return;
    const context = target.getContext("2d"); if (!context) return;
    target.width = 240; target.height = 160;
    try {
      const source = renderImageComposition(document.createElement("canvas"), applyImageLayout({ ...state, caption: "" }, layout));
      context.fillStyle = state.background; context.fillRect(0, 0, 240, 160);
      const fit = Math.min(240 / source.width, 160 / source.height); context.drawImage(source, (240 - source.width * fit) / 2, (160 - source.height * fit) / 2, source.width * fit, source.height * fit);
    } catch {
      context.fillStyle = "#e8e9df"; context.fillRect(0, 0, 240, 160); context.fillStyle = "#647c71";
      if (layout === "equal-split") { context.fillRect(24, 26, 88, 108); context.fillStyle = "#a6b6a1"; context.fillRect(128, 26, 88, 108); }
      else { context.fillRect(30, 18, 128, 112); context.fillStyle = "#fff"; context.fillRect(124, 66, 96, 78); context.fillStyle = "#a6b6a1"; context.fillRect(130, 72, 84, 60); }
    }
  }, [state.image, state.overlays.length, layout]);
  return <canvas ref={preview} aria-hidden="true"/>;
}

function SlideThumbnail({ state }: { state: ImageComposition }) {
 const ref = useRef<HTMLCanvasElement>(null);
 useEffect(() => { const target=ref.current, context=target?.getContext("2d"); if(!target||!context)return; const source=renderImageComposition(document.createElement("canvas"),state); target.width=64;target.height=80;const fit=Math.min(64/source.width,80/source.height);context.clearRect(0,0,64,80);context.drawImage(source,(64-source.width*fit)/2,(80-source.height*fit)/2,source.width*fit,source.height*fit); },[state]);
 return <canvas ref={ref} aria-hidden="true" style={{width:32,height:40,objectFit:"contain"}}/>;
}

function BeforeAfterRecipe({state,disabled,onApply,onChoosePhotos}:{state:ImageComposition;disabled:boolean;onApply:(next:ImageComposition)=>void;onChoosePhotos:()=>void}) {
 const [afterId,setAfterId]=useState(''),[beforeLabel,setBeforeLabel]=useState('Before'),[afterLabel,setAfterLabel]=useState('After');
 const target=useRef<HTMLCanvasElement>(null);
 let proposed:ImageComposition|null=null,error='';
 try{proposed=beforeAfterRecipe(state,afterId,beforeLabel,afterLabel);}catch(reason){error=reason instanceof Error?reason.message:'Choose your comparison photos.';}
 useEffect(()=>{if(target.current&&proposed)renderImageComposition(target.current,proposed);},[state,afterId,beforeLabel,afterLabel]);
 return <section aria-label="Before and after recipe">
  <h4 className="editor-control-group-title">Before / after comparison</h4>
  <p>Arrange two of your uploaded photos side by side. Edit the labels, preview the real result, then apply it to this slide.</p>
  <p>Before photo: {state.image?'your current base image':'choose a base image first'}.</p>
  <label className="field">After photo<select aria-label="Comparison after photo" disabled={disabled} value={afterId} onChange={event=>setAfterId(event.target.value)}><option value="">Choose an uploaded image layer</option>{state.overlays.map(layer=><option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>
  <div className="two-fields"><label className="field">Before label<input aria-label="Comparison before label" disabled={disabled} maxLength={60} value={beforeLabel} onChange={event=>setBeforeLabel(event.target.value)}/></label><label className="field">After label<input aria-label="Comparison after label" disabled={disabled} maxLength={60} value={afterLabel} onChange={event=>setAfterLabel(event.target.value)}/></label></div>
  {proposed?<canvas ref={target} aria-label="Before and after recipe preview" style={{width:'100%',height:'auto',maxHeight:300,objectFit:'contain'}}/>:<p>{error}</p>}
  <p className="revision-label">Applying replaces this slide's caption with your labels. Other layers stay in the project and are hidden for this comparison. Export uses the same composition shown here.</p>
  <div className="review-actions"><Button disabled={disabled||!proposed} onClick={()=>{if(proposed)onApply(proposed);}}>Apply before / after recipe</Button><Button variant="outline" disabled={disabled} onClick={onChoosePhotos}>Choose comparison photos</Button></div>
 </section>;
}

/** Local composition stays on this device. AI upload happens only on an explicit request. */
export function ImageEditor({ preview = false, initialFile = null }: { preview?: boolean; initialFile?: File|null }) {
  const [tool, setTool] = useState<EditorTool>("media");
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(fittedImageViewport);
  const viewportNow = useRef(viewport); viewportNow.current = viewport;
  const pointers = useRef(new Map<number, CanvasPoint>());
  const drag = useRef<{ id: string; start: CanvasPoint; origin: CanvasPoint } | null>(null);
  const pan = useRef<{ start: CanvasPoint; viewport: CanvasViewport } | null>(null);
  const pinch = useRef<{ distance: number; viewport: CanvasViewport; middle: CanvasPoint } | null>(null);
  const [slides, setSlides] = useState<Slide[]>(() => [createSlide()]);
  const [active, setActive] = useState(0), [selectedLayer, setSelectedLayer] = useState("");
  const [aiBusy, setAiBusy] = useState(false), [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [soundtrack, setSoundtrack] = useState<LocalSoundtrack | null>(null);
  const [secondsPerSlide, setSecondsPerSlide] = useState(3), [movieAll, setMovieAll] = useState(false);
  const [movieProgress, setMovieProgress] = useState<number | null>(null), [movieResult, setMovieResult] = useState("");
  const [motionUndo,setMotionUndo]=useState<ImageMotion|null>(null);
  const [imageMotion,setImageMotion] = useState<ImageMotion>("none"),[motionPreview,setMotionPreview] = useState(false);
  const [pixelInstruction,setPixelInstruction] = useState<{text:string;id:number}|undefined>();
  const pixelPanel = useRef<HTMLDetailsElement>(null);
  const movieController = useRef<AbortController | null>(null);
  useEffect(() => () => movieController.current?.abort(), []);
  useEffect(() => () => { if (movieResult) URL.revokeObjectURL(movieResult); }, [movieResult]);
  const [format, setFormat] = useState("png"), [notice, setNotice] = useState("");
  const [backgroundPreviewIndex, setBackgroundPreviewIndex] = useState<number | null | undefined>(undefined);
  const [undo, setUndo] = useState<ImageComposition | null>(null);
  const generation = useRef(0);
  const state = slides[active].state, image = state.image;
  const layer = state.overlays.find(item => item.id === selectedLayer);
  useEffect(() => {
    if (!motionPreview || imageMotion === "none" || loading || exporting || backgroundPreviewIndex !== undefined || !canvas.current) return;
    const target=canvas.current, context=target.getContext("2d"); if(!context)return;
    const source=renderImageComposition(document.createElement("canvas"),state); target.width=source.width;target.height=source.height;
    let frame=0, start:number|undefined;
    const seconds=Number.isFinite(secondsPerSlide)&&secondsPerSlide>=1&&secondsPerSlide<=10?secondsPerSlide:3;
    const tick=(time:number)=>{start??=time;drawImageMotion(context,source,imageMotion,((time-start)/1000%seconds)/seconds);frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);renderImageComposition(target,state);};
  },[motionPreview,imageMotion,state,secondsPerSlide,loading,exporting,backgroundPreviewIndex]);
  const busy = aiBusy || loading || exporting || backgroundPreviewIndex !== undefined;
  const hasArtwork = Boolean(image || state.template !== "original" || state.overlays.length || state.caption);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { try { if (canvas.current) {
    const rendered = renderImageComposition(canvas.current, backgroundPreviewIndex === undefined ? state : applyUploadedImageBackground(state, backgroundPreviewIndex));
    // The selection overlay must use the same fitted rectangle as the canvas.
    rendered.parentElement?.style.setProperty("--image-aspect", String(rendered.width / rendered.height));
  } } catch (error) { setNotice(error instanceof Error ? error.message : "Preview is unavailable."); } }, [state, backgroundPreviewIndex]);
  function patch(changes: Partial<ImageComposition>) { setSlides(items => items.map((slide, index) => index === active ? { ...slide, state: { ...slide.state, ...changes } } : slide)); }
  function snapshot() { setUndo(state); }
  function previewPoint(point: CanvasPoint) { return canvas.current ? canvasPercent(point, canvas.current.getBoundingClientRect()) : point; }
  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId); drag.current = null; pan.current = null; pinch.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function startPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if(motionPreview){setMotionPreview(false);if(canvas.current)renderImageComposition(canvas.current,state);}
    if (busy || !hasArtwork || event.button > 0 || !canvas.current) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point); event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const points = [...pointers.current.values()]; drag.current = null; pan.current = null;
      pinch.current = { distance: Math.max(1, gestureDistance(points)), viewport: viewportNow.current, middle: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } }; return;
    }
    const at = previewPoint(point), hit = hitImageLayer(state.overlays.filter(layer => layer.id !== state.backgroundLayerId), at, canvas.current.width / canvas.current.height);
    const rect = canvas.current.getBoundingClientRect();
    const baseHit = image && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    setSelectedLayer(hit?.id ?? (baseHit ? "__base" : ""));
    if (hit) { snapshot(); drag.current = { id: hit.id, start: at, origin: { x: hit.x, y: hit.y } }; }
    else if (baseHit) { snapshot(); drag.current = { id: "__base", start: at, origin: { x: state.baseX, y: state.baseY } }; }
    else { pan.current = { start: point, viewport: viewportNow.current }; }
  }
  function movePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy || !pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY }; pointers.current.set(event.pointerId, point);
    if (pinch.current && pointers.current.size >= 2) {
      const points = [...pointers.current.values()], initial = pinch.current;
      const zoom = boundedZoom(initial.viewport.zoom * gestureDistance(points) / initial.distance);
      setViewport({ zoom, x: zoom === 1 ? 0 : initial.viewport.x + (points[0].x + points[1].x) / 2 - initial.middle.x, y: zoom === 1 ? 0 : initial.viewport.y + (points[0].y + points[1].y) / 2 - initial.middle.y });
    } else if (drag.current) {
      const current = drag.current, position = draggedImageLayer(current.origin, current.start, previewPoint(point));
      if (current.id === "__base") patch({ baseX: position.x, baseY: position.y });
      else patch({ overlays: state.overlays.map(item => item.id === current.id ? { ...item, ...position } : item) });
    } else if (pan.current && pan.current.viewport.zoom > 1) {
      const initial = pan.current; setViewport({ ...initial.viewport, x: initial.viewport.x + point.x - initial.start.x, y: initial.viewport.y + point.y - initial.start.y });
    }
  }
  useEffect(() => {
    const target = stage.current; if (!target) return;
    const wheel = (event: WheelEvent) => { if (busy || !hasArtwork) return; event.preventDefault(); setViewport(current => { const zoom = boundedZoom(current.zoom * Math.exp(-event.deltaY * .002)); return zoom === 1 ? fittedImageViewport : { ...current, zoom }; }); };
    target.addEventListener("wheel", wheel, { passive: false });
    return () => target.removeEventListener("wheel", wheel);
  }, [busy, hasArtwork]);
  function activate(index: number) { if (busy) return; generation.current++; setActive(index); setSelectedLayer(""); setUndo(null); setNotice(""); setViewport(fittedImageViewport); }
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
      } else { patch(freshComposition(next)); setSelectedLayer(""); setViewport(fittedImageViewport); setImageMotion("none"); setMotionPreview(false);setMotionUndo(null); }
      return true;
    } catch (error) { if (request === generation.current) setNotice(error instanceof Error ? error.message : "This image could not be opened."); return false; }
    finally { if (request === generation.current) setLoading(false); }
  }
  useEffect(()=>{if(initialFile)void select(initialFile);},[initialFile]);
  function updateLayer(changes: Partial<Overlay>) { if (layer) patch({ overlays: state.overlays.map(item => item.id === layer.id ? { ...item, ...changes } : item) }); }
  function reorderLayer(direction: number) { if (!layer) return; const next = [...state.overlays], index = next.findIndex(item => item.id === layer.id), target = index + direction; if (target < 0 || target >= next.length) return; snapshot(); [next[index], next[target]] = [next[target], next[index]]; patch({ overlays: next }); }
  function addSlide(duplicate = false) { if (slides.length >= 10) return; const next = createSlide(`Slide ${slides.length + 1}`); if (duplicate) next.state = { ...state, overlays: state.overlays.map(item => ({ ...item, id: crypto.randomUUID() })) }; if (duplicate && state.backgroundLayerId) next.state.backgroundLayerId = next.state.overlays[state.overlays.findIndex(item => item.id === state.backgroundLayerId)]?.id ?? null; setSlides(items => [...items, next]); setActive(slides.length); setSelectedLayer(""); setUndo(null); }
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
        if (!all) { downloadBlob(blob, name); setShareFile(new File([blob], name, { type: blob.type })); } else files.push({ name, bytes: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (all) downloadBlob(new Blob([imageCarouselZip(files).buffer as ArrayBuffer], { type: "application/zip" }), "orbit-carousel.zip");
      setNotice(all ? `${files.length} carousel slides exported as a ZIP in slide order.` : "Image exported. Your original stays unchanged.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Export failed."); }
    finally { setExporting(false); }
  }
  async function downloadMovie() {
    if (busy || !hasArtwork) return;
    const seconds = Number(secondsPerSlide);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 10) { setNotice("Choose 1 to 10 seconds per slide."); return; }
    const controller = new AbortController(); movieController.current = controller; setExporting(true); setMovieProgress(0); setNotice("");
    try {
      const selected = movieAll ? slides : [slides[active]], frames: HTMLCanvasElement[] = [];
      const source = renderImageComposition(document.createElement("canvas"), selected[0].state), scale = Math.min(1, 1080 / Math.max(source.width, source.height));
      const movie = document.createElement("canvas"); movie.width = Math.max(1, Math.round(source.width * scale)); movie.height = Math.max(1, Math.round(source.height * scale));
      for (const slide of selected) {
        const original = renderImageComposition(document.createElement("canvas"), slide.state), frame = document.createElement("canvas"); frame.width = movie.width; frame.height = movie.height;
        const context = frame.getContext("2d"); if (!context) throw Error("Movie rendering is unavailable.");
        context.fillStyle = slide.state.background; context.fillRect(0, 0, frame.width, frame.height);
        const fit = Math.min(frame.width / original.width, frame.height / original.height); context.drawImage(original, (frame.width - original.width * fit) / 2, (frame.height - original.height * fit) / 2, original.width * fit, original.height * fit); frames.push(frame);
      }
      const context = movie.getContext("2d"); if (!context) throw Error("Movie rendering is unavailable.");
      const blob = await exportCanvasMovie(movie, seconds * frames.length, soundtrack, controller.signal, setMovieProgress, elapsed => { const index=Math.min(frames.length-1,Math.floor(elapsed/seconds)),frame=frames[index]; drawImageMotion(context,frame,imageMotion,Math.min(1,(elapsed-index*seconds)/seconds)); });
      if (controller.signal.aborted) return;
      const name = `orbit-${movieAll ? "carousel" : "image"}-movie.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
      downloadBlob(blob, name); setShareFile(new File([blob], name, { type: blob.type })); setMovieResult(URL.createObjectURL(blob)); setNotice("Image movie exported locally. Preview the complete movie below.");
    } catch (error) { if (movieController.current === controller) setNotice(error instanceof Error ? error.message : "Movie export failed."); }
    finally { if (movieController.current === controller) { movieController.current = null; setExporting(false); setMovieProgress(null); } }
  }
  const aiCurrent: ImageEditorState = { backgroundLayerIndex: state.backgroundLayerId ? state.overlays.findIndex(layer => layer.id === state.backgroundLayerId) : null, hasBaseImage: Boolean(image), baseAspectRatio: image ? image.naturalWidth / image.naturalHeight : undefined, canvasAspectRatio: state.ratio === "1:1" ? 1 : state.ratio === "4:5" ? .8 : state.ratio === "9:16" ? 9 / 16 : state.ratio === "16:9" ? 16 / 9 : image ? state.rotation % 180 ? image.naturalHeight / image.naturalWidth : image.naturalWidth / image.naturalHeight : 1, baseScale: state.baseScale, baseX: state.baseX, baseY: state.baseY, ratio: state.ratio as ImageEditorState["ratio"], rotation: state.rotation as ImageEditorState["rotation"], flip: state.flip, brightness: state.brightness, contrast: state.contrast, saturation: state.saturation, focusX: state.focusX, focusY: state.focusY, textSize: state.textSize, textPosition: (state.textPosition === "centre" ? "center" : state.textPosition) as ImageEditorState["textPosition"], textColor: state.textColor, caption: state.caption, template: state.template as ImageEditorState["template"], accent: state.accent, background: state.background, layers: state.overlays.map((layer, index) => ({ index, x: layer.x, y: layer.y, width: layer.width, opacity: layer.opacity })) };
  function applyAi(changes: ImageEditorChanges) {
    snapshot();
    const { layers, backgroundLayerIndex, ...compositionChanges } = changes;
    const backgroundState = backgroundLayerIndex === undefined ? state : applyUploadedImageBackground(state, backgroundLayerIndex);
    const base = compositionChanges.template ? applyImageTemplate(backgroundState, compositionChanges.template) : backgroundState;
    const overlays = backgroundState.overlays.map((layer, index) => {
      const change = layers?.find(item => item.index === index);
      if (!change) return layer;
      return { ...layer, x: change.x ?? layer.x, y: change.y ?? layer.y, width: change.width ?? layer.width, opacity: change.opacity ?? layer.opacity };
    });
    patch({ ...base, ...compositionChanges, overlays, caption: compositionChanges.caption ?? state.caption, textPosition: compositionChanges.textPosition === "center" ? "centre" : compositionChanges.textPosition ?? base.textPosition });
    setNotice("AI composition applied. Review your slide before exporting.");
  }
  const sliders = (controls: { name: string; key: "brightness" | "contrast" | "saturation" | "focusX" | "focusY" | "textSize" | "baseX" | "baseY"; min?: number; max?: number }[]) => controls.map(control => <label className="slider-field" key={control.key}><span>{control.name}<output>{state[control.key]}%</output></span><input aria-label={`Image ${control.name.toLowerCase()}`} type="range" min={control.min ?? 0} max={control.max ?? 200} value={state[control.key]} onChange={event => patch({ [control.key]: Number(event.target.value) })}/></label>);
  return <section className="workspace-view image-composer mobile-media-editor">
    <SectionHeading number="02" label="Image" title="One idea. Every layer."/>
    <div className="video-grid">
      <Card className="surface video-canvas image-preview-card">
        <div className="image-stage image-interactive-stage" ref={stage} onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={() => { drag.current = null; pan.current = null; }} aria-label="Image canvas interaction area">
          {!hasArtwork ? <div className="video-placeholder"><ImagePlus size={40}/><span>Start with an image or a template.</span></div> : null}
          <div className="image-viewport-content" hidden={!hasArtwork} style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
            <canvas ref={canvas} hidden={!hasArtwork} aria-label="Edited image preview"/>
            {selectedLayer === "__base" && image ? <div className="image-layer-selection" aria-hidden="true" style={{ left: `${state.baseX - state.baseScale * 50}%`, top: `${state.baseY - state.baseScale * 50}%`, width: `${state.baseScale * 100}%`, height: `${state.baseScale * 100}%` }}><span>Base image</span><i/><i/><i/><i/></div> : null}
            {layer && layer.id !== state.backgroundLayerId && canvas.current ? (() => { const bounds = imageLayerBounds(layer, canvas.current.width / canvas.current.height); return <div className="image-layer-selection" aria-hidden="true" style={{ left: `${bounds.left}%`, top: `${bounds.top}%`, width: `${bounds.width}%`, height: `${bounds.height}%` }}><span>{layer.name}</span><i/><i/><i/><i/></div>; })() : null}
          </div>
        </div>
        <div className="image-preview-toolbar"><span>Drag a layer · pinch or scroll to zoom</span><Button variant="outline" aria-label="Zoom image preview out" disabled={!hasArtwork || viewport.zoom <= 1} onClick={() => setViewport(current => ({ ...current, zoom: boundedZoom(current.zoom - .25) }))}><ZoomOut size={16}/></Button><output aria-label="Image preview zoom">{Math.round(viewport.zoom * 100)}%</output><Button variant="outline" aria-label="Zoom image preview in" disabled={!hasArtwork || viewport.zoom >= 4} onClick={() => setViewport(current => ({ ...current, zoom: boundedZoom(current.zoom + .25) }))}><ZoomIn size={16}/></Button><Button variant="outline" aria-label="Fit image preview" onClick={() => setViewport(fittedImageViewport)}><Maximize2 size={16}/>Fit</Button></div>
        <div className="canvas-footer">Slide {active + 1} of {slides.length} · {state.overlays.length} overlay layers · up to 2048px</div>
        <div className="image-slide-strip" aria-label="Carousel slides">{slides.map((slide, index) => <button type="button" key={slide.id} disabled={busy} aria-pressed={index === active} aria-label={`Edit slide ${index + 1}`} onClick={() => activate(index)}><SlideThumbnail state={slide.state}/><span style={{ background: slide.state.accent }}>{index + 1}</span>{slide.name}</button>)}</div>

        <p className="image-device-note">Original templates by Orbit. Your files stay on this device unless you choose an AI upload. Keep this page open until exported.</p>
      </Card>
      <Card className="surface video-controls">
<EditorToolPanel tool="layout" active={tool}><p className="editor-panel-intro">Start neutral, then choose a layout for your own photos. Templates never replace your uploaded media.</p><BeforeAfterRecipe key={slides[active].id} state={state} disabled={busy} onChoosePhotos={()=>setTool(image?'layers':'media')} onApply={next=>{snapshot();patch(next);setMotionPreview(false);setSelectedLayer('');setNotice('Before / after comparison applied. Labels and layers remain editable; Undo last composition restores the previous slide.');}}/><h4 className="editor-control-group-title">Arrange your photos</h4>    <div className="image-layout-gallery" aria-label="Uploaded photo layouts">{imageLayouts.map(layout => <button type="button" key={layout.id} disabled={busy} aria-label={layout.name} onClick={() => { try { const next = applyImageLayout(state, layout.id); snapshot(); patch(next); setNotice(`${layout.name} applied to your uploaded photos. Your text is unchanged.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Choose the photos for this layout first."); } }}><ImageLayoutThumbnail state={state} layout={layout.id}/><span className="image-layout-copy"><strong>{layout.name}</strong><small>{layout.description}</small><em>{layout.photos}</em></span></button>)}</div>
    <h4 className="editor-control-group-title">Social starter kits</h4><div className="image-creative-presets">{imageStylePresets.map(preset => <button type="button" key={preset.id} aria-pressed={state.template === preset.template && state.ratio === preset.ratio && state.background === preset.color} disabled={busy} onClick={() => { snapshot(); patch(applyImageStylePreset(state, preset.id)); }}><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div>
    <details className="image-explore-templates"><summary>Explore classic layouts and colour finishes</summary>
    <div className="image-template-strip" aria-label="Image templates">{imageTemplates.map(template => <button type="button" className={`image-template ${state.template === template.id ? "is-selected" : ""}`} key={template.id} disabled={busy} aria-pressed={state.template === template.id} onClick={() => { snapshot(); const next = applyImageTemplate(state, template.id); patch(next); }}><span className={`image-template-art template-${template.id}`} style={{ backgroundColor: template.color }}><i/><b>{template.id === "original" ? "+" : template.id === "quote" ? "“" : "Aa"}</b></span><strong>{template.name}</strong><small>{template.tag}</small></button>)}</div>
    <div className="image-style-presets" aria-label="Image style presets"><span>Finish the look</span>{imageStylePresets.map(preset => <button type="button" key={preset.id} disabled={busy} onClick={() => { snapshot(); patch(applyImageStylePreset(state, preset.id)); }}><i style={{ background: preset.color, borderColor: preset.ink }}/>{preset.name}</button>)}</div>
</details></EditorToolPanel>
<EditorToolPanel tool="ai" active={tool}>
        <EditorAiPanel key={slides[active].id} kind="image" assetIdentity={JSON.stringify([slides[active].id, image?.src, state.overlays.map(item => item.id)])} source={()=>canvas.current} onPrepareImageMotion={motion=>{setMotionUndo(imageMotion);setImageMotion(motion);setMotionPreview(true);setTool("music");setNotice("Previewing local camera motion. Export an image movie to save this movement; PNG and JPEG stay still.");}} onOpenImageEdit={text=>{setMotionPreview(false);setPixelInstruction({text,id:Date.now()});if(pixelPanel.current)pixelPanel.current.open=true;}} onOpenMusic={() => { setTool("music"); setNotice("Choose a music file below. Music is added locally when you export an image movie."); }} current={aiCurrent} disabled={busy} preview={preview} onApply={applyAi}/></EditorToolPanel>
        <fieldset disabled={busy} className="image-control-fieldset">
          <EditorToolPanel tool="media" active={tool}><label className="upload-zone"><ImagePlus size={24}/><strong>{image ? "Replace base image" : "Choose image"}</strong><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose image" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }}/></label>
        <div className="review-actions"><Button variant="outline" disabled={busy || slides.length >= 10} onClick={() => addSlide()}><Plus size={16}/>Add slide</Button><Button variant="outline" disabled={busy || slides.length >= 10} onClick={() => addSlide(true)}><Copy size={16}/>Duplicate slide</Button><Button variant="outline" aria-label="Move slide earlier" disabled={busy || active === 0} onClick={() => reorderSlide(-1)}><ArrowUp size={16}/></Button><Button variant="outline" aria-label="Move slide later" disabled={busy || active === slides.length - 1} onClick={() => reorderSlide(1)}><ArrowDown size={16}/></Button><Button variant="outline" aria-label="Remove slide" disabled={busy || slides.length === 1} onClick={() => { setSlides(items => items.filter((_, index) => index !== active)); setActive(Math.max(0, active - 1)); setUndo(null); setSelectedLayer(""); }}><Trash2 size={16}/></Button></div></EditorToolPanel><EditorToolPanel tool="adjust" active={tool}>
          <div className="two-fields"><label className="field">Crop<select aria-label="Image crop" value={state.ratio} onChange={event => patch({ ratio: event.target.value })}><option value="original">Original</option><option>1:1</option><option>4:5</option><option>9:16</option><option>16:9</option></select></label><label className="field">Export<select aria-label="Image export format" value={format} onChange={event => setFormat(event.target.value)}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label></div>
</EditorToolPanel><EditorToolPanel tool="layers" active={tool}>
          <section className="image-layers" aria-label="Image overlay layers"><h3><Layers size={18}/>Image layers</h3><p>Use an uploaded image behind your existing photo. This preserves the complete foreground photo; it does not remove its original background.</p><label className="image-overlay-upload"><Plus size={16}/>Add image overlay<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Add image overlay" disabled={state.overlays.length >= 8} onChange={event => { void select(event.target.files?.[0], true); event.target.value = ""; }}/></label>
          {state.overlays.length ? <><label className="field">Selected layer<select aria-label="Selected image layer" value={selectedLayer} onChange={event => setSelectedLayer(event.target.value)}><option value="">Choose a layer</option>{image ? <option value="__base">Base image</option> : null}{state.overlays.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name}{item.id === state.backgroundLayerId ? " · Background" : ""}</option>)}</select></label>{layer ? <><Button variant="outline" disabled={!image || layer.id === state.backgroundLayerId} onClick={() => { setBackgroundPreviewIndex(state.overlays.findIndex(item => item.id === layer.id)); setNotice("Previewing your uploaded image behind the existing photo. Apply or cancel this preview before continuing."); }}>Preview selected image as background</Button>{layer.id === state.backgroundLayerId ? <p>This image fills the background. Foreground controls adjust your original photo above it.</p> : null}{([{ key: "x", name: "Horizontal position", max: 100 }, { key: "y", name: "Vertical position", max: 100 }, { key: "width", name: "Layer size", max: 150 }, { key: "opacity", name: "Layer opacity", max: 100 }] as const).map(control => <label className="slider-field" key={control.key}><span>{control.name}<output>{layer[control.key]}%</output></span><input aria-label={control.name} disabled={layer.id === state.backgroundLayerId && control.key !== "opacity"} type="range" min={control.key === "width" ? 5 : 0} max={control.max} value={layer[control.key]} onChange={event => updateLayer({ [control.key]: Number(event.target.value) })}/></label>)}<div className="review-actions"><Button variant="outline" disabled={state.overlays[0].id === layer.id} onClick={() => reorderLayer(-1)}>Send backward</Button><Button variant="outline" disabled={state.overlays.at(-1)?.id === layer.id} onClick={() => reorderLayer(1)}>Bring forward</Button><Button variant="outline" aria-label="Remove image layer" onClick={() => { snapshot(); patch({ overlays: state.overlays.filter(item => item.id !== layer.id), backgroundLayerId: state.backgroundLayerId === layer.id ? null : state.backgroundLayerId }); setSelectedLayer(""); }}><Trash2 size={16}/></Button></div></> : null}</> : <p>Add a logo, product shot or another image above your base.</p>}</section>
          {image ? <details className="image-base-controls" open={selectedLayer === "__base"}><summary>Base image position and size</summary><label className="slider-field"><span>Base image size<output>{Math.round(state.baseScale * 100)}%</output></span><input aria-label="Base image size" type="range" min="10" max="200" value={state.baseScale * 100} onChange={event => patch({ baseScale: Number(event.target.value) / 100 })}/></label>{sliders([{ name: "Base horizontal position", key: "baseX", max: 100 }, { name: "Base vertical position", key: "baseY", max: 100 }])}</details> : null}
</EditorToolPanel><EditorToolPanel tool="adjust" active={tool}>
          <details className="image-manual-controls" open={tool === "adjust" || undefined}><summary>Adjust image and text</summary>
          <label className="field">Look preset<select aria-label="Image look preset" defaultValue="original" onChange={event => { const looks: Record<string, number[]> = { original: [100, 100, 100], vivid: [105, 115, 130], soft: [110, 90, 90], mono: [100, 115, 0] }; const values = looks[event.target.value]; patch({ brightness: values[0], contrast: values[1], saturation: values[2] }); }}><option value="original">Original</option><option value="vivid">Vivid</option><option value="soft">Soft</option><option value="mono">Monochrome</option></select></label>
          <div className="review-actions"><Button variant="outline" disabled={!image} aria-label="Rotate image" onClick={() => patch({ rotation: (state.rotation + 90) % 360 })}><RotateCw size={17}/>Rotate</Button><Button variant="outline" disabled={!image} aria-label="Flip image" onClick={() => patch({ flip: !state.flip })}><FlipHorizontal size={17}/>Flip</Button></div>
          {state.ratio !== "original" ? sliders([{ name: "Horizontal crop focus", key: "focusX", max: 100 }, { name: "Vertical crop focus", key: "focusY", max: 100 }]) : null}
          {sliders([{ name: "Brightness", key: "brightness" }, { name: "Contrast", key: "contrast" }, { name: "Saturation", key: "saturation" }])}
          <label className="field">Caption<textarea aria-label="Image caption" maxLength={200} value={state.caption} onChange={event => patch({ caption: event.target.value })}/></label>
          <div className="two-fields"><label className="field">Text position<select aria-label="Image text position" value={state.textPosition} onChange={event => patch({ textPosition: event.target.value })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option></select></label><label className="field">Text colour<input aria-label="Image text colour" type="color" value={state.textColor} onChange={event => patch({ textColor: event.target.value })}/></label></div>
          <label className="field">Template colour<input aria-label="Image template colour" type="color" value={state.background} onChange={event => patch({ accent: event.target.value, background: event.target.value })}/></label>
          {sliders([{ name: "Text size", key: "textSize", min: 60, max: 180 }])}
          </details></EditorToolPanel>
        </fieldset>
<EditorToolPanel tool="layers" active={tool}>{backgroundPreviewIndex !== undefined ? <section aria-label="Uploaded background preview"><p>Preview: uploaded background behind your complete photo. A full-size foreground is reduced to 75% so the background is visible; existing custom sizes stay unchanged.</p><div className="review-actions"><Button onClick={() => { snapshot(); patch(applyUploadedImageBackground(state, backgroundPreviewIndex)); setBackgroundPreviewIndex(undefined); setNotice("Uploaded background applied locally. Use Undo last composition to restore the previous edit."); }}>Apply uploaded background</Button><Button variant="outline" onClick={() => { setBackgroundPreviewIndex(undefined); setNotice("Background preview cancelled. Your composition is unchanged."); }}>Cancel background preview</Button></div></section> : state.backgroundLayerId ? <Button variant="outline" disabled={busy} onClick={() => { setBackgroundPreviewIndex(null); setNotice("Previewing removal of the uploaded background. Your foreground photo remains."); }}>Preview removing uploaded background</Button> : null}</EditorToolPanel>
<EditorToolPanel tool="music" active={tool}>
        <details className="image-movie-controls" open={tool === "music" || undefined}><summary>Turn your image or carousel into a movie</summary><p className="image-device-note">Animate your existing image with camera movement and optional music. This does not generate subject movement or new footage. Keep this tab open while recording.</p><label className="field">Image motion<select aria-label="Image movie motion" disabled={busy} value={imageMotion} onChange={event=>{setMotionUndo(imageMotion);setImageMotion(event.target.value as ImageMotion);setMotionPreview(false);}}>{imageMotions.map(motion=><option key={motion.id} value={motion.id}>{motion.name}</option>)}</select></label><Button variant="outline" disabled={busy||!hasArtwork||imageMotion==="none"} onClick={()=>setMotionPreview(value=>!value)}>{motionPreview?"Stop motion preview":"Preview image motion"}</Button><Button variant="outline" disabled={busy||imageMotion==="none"} onClick={()=>{setMotionUndo(imageMotion);setImageMotion("none");setMotionPreview(false);}}>Reset image motion</Button><Button variant="outline" disabled={busy||motionUndo===null} onClick={()=>{if(motionUndo!==null){setMotionUndo(imageMotion);setImageMotion(motionUndo);setMotionPreview(false);}}}>Undo image motion</Button><SoundtrackControls value={soundtrack} onChange={setSoundtrack} disabled={busy}/>{soundtrack ? <audio controls src={soundtrack.src} aria-label="Source music preview"/> : null}<div className="two-fields"><label className="field">Seconds per slide<input aria-label="Image movie seconds per slide" type="number" min="1" max="10" step=".5" disabled={busy} value={secondsPerSlide} onChange={event => setSecondsPerSlide(Number(event.target.value))}/></label><label className="field">Movie content<select aria-label="Image movie content" disabled={busy} value={movieAll ? "carousel" : "current"} onChange={event => setMovieAll(event.target.value === "carousel")}><option value="current">Current image</option><option value="carousel">All carousel slides</option></select></label></div><Button disabled={busy || !hasArtwork} onClick={() => void downloadMovie()}><Film size={16}/>Export image movie</Button>{movieProgress !== null ? <><progress aria-label="Image movie export progress" max="100" value={movieProgress}/><Button variant="outline" onClick={() => movieController.current?.abort()}><X size={16}/>Cancel image movie export</Button></> : null}{movieResult ? <video controls playsInline src={movieResult} aria-label="Exported image movie preview"/> : null}</details>
</EditorToolPanel><EditorToolPanel tool="ai" active={tool}>
        <details className="image-pixel-ai" ref={pixelPanel}><summary>Generate a new background or visual with AI</summary><ImageAiPanel instructionDraft={pixelInstruction} source={() => canvas.current} disabled={!hasArtwork || loading || exporting} preview={preview} onBusyChange={setAiBusy} onResult={async blob => { const next = await decode(new File([blob], "orbit-ai-result.png", { type: blob.type })); snapshot(); patch(freshComposition(next)); }}/></details>
</EditorToolPanel><EditorToolPanel tool="export" active={tool}>
        <MediaShare file={shareFile} disabled={busy}/>
        <fieldset disabled={busy} className="image-control-fieldset"><Button disabled={!hasArtwork} onClick={() => void download()} aria-label="Export image"><Download size={17}/>{exporting ? "Exporting…" : "Export image"}</Button><Button variant="outline" disabled={slides.length < 2} onClick={() => void download(true)}><Download size={17}/>Export carousel ZIP</Button><Button variant="outline" disabled={!undo} onClick={() => { if (undo) { const previous = undo; setUndo(state); patch(previous); } }}><Undo2 size={17}/>Undo last composition</Button><Button variant="outline" onClick={() => { snapshot(); patch(freshComposition(image)); setSelectedLayer(""); setMotionPreview(false);setImageMotion("none");setMotionUndo(null); }} aria-label="Reset image edits"><RefreshCw size={17}/>Reset edits</Button></fieldset>
</EditorToolPanel>
        {notice ? <p role="status" className="action-notice">{notice}</p> : null}
      </Card>
    </div>
    <MobileEditorToolbar kind="Image" value={tool} onChange={next=>{setMotionPreview(false);setTool(next);}} tools={imageTools}/>
  </section>;
}
