"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RotateCw, FlipHorizontal, RefreshCw } from "lucide-react";
import { Button, Card } from "./ui";
import { SectionHeading } from "./design-ui";

/** Files never leave the device. Canvas exports only the selected local raster. */
export function ImageEditor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState("original");
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [caption, setCaption] = useState("");
  const [format, setFormat] = useState("png");
  const [notice, setNotice] = useState("");
  const pending = useRef(0);
  useEffect(() => () => { pending.current++; }, []);
  function reset() { setRatio("original"); setRotation(0); setFlip(false); setBrightness(100); setContrast(100); setSaturation(100); setCaption(""); setNotice(""); }
  async function select(file?: File) {
    const request = ++pending.current;
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25 * 1024 * 1024) { setNotice("Choose a PNG, JPEG or WebP under 25 MB."); return; }
    const url = URL.createObjectURL(file);
    const next = new Image();
    try {
      next.src = url;
      await next.decode();
      if (request !== pending.current) return;
      if (next.naturalWidth * next.naturalHeight > 40_000_000) { setNotice("Choose an image under 40 megapixels."); return; }
      reset(); setImage(next);
    } catch { if (request === pending.current) setNotice("This image could not be opened."); }
    finally { URL.revokeObjectURL(url); }
  }
  useEffect(() => {
    if (!image || !canvas.current) return;
    const turned = rotation % 180 !== 0;
    const iw = turned ? image.naturalHeight : image.naturalWidth;
    const ih = turned ? image.naturalWidth : image.naturalHeight;
    const aspect = ratio === "original" ? iw / ih : ratio === "1:1" ? 1 : ratio === "4:5" ? .8 : 9 / 16;
    const cw = Math.min(iw, ih * aspect), ch = cw / aspect;
    const scale = Math.min(1, 2048 / Math.max(cw, ch));
    const target = canvas.current;
    target.width = Math.max(1, Math.round(cw * scale)); target.height = Math.max(1, Math.round(ch * scale));
    const ctx = target.getContext("2d"); if (!ctx) { setNotice("Image editing is unavailable in this browser."); return; }
    ctx.save(); ctx.translate(target.width / 2, target.height / 2); ctx.scale(scale * (flip ? -1 : 1), scale); ctx.rotate(rotation * Math.PI / 180);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2); ctx.restore();
    if (caption.trim()) {
      const size = Math.max(12, Math.round(target.width / 28));
      ctx.font = `bold ${size}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, target.height - size * 3, target.width, size * 3);
      ctx.fillStyle = "white"; ctx.fillText(caption.trim(), target.width / 2, target.height - size * 1.5, target.width * .9);
    }
  }, [image, ratio, rotation, flip, brightness, contrast, saturation, caption]);
  function download() {
    const target = canvas.current; if (!target || !image) return;
    const exportCanvas = document.createElement("canvas"); exportCanvas.width = target.width; exportCanvas.height = target.height;
    const ctx = exportCanvas.getContext("2d"); if (!ctx) return;
    if (format === "jpeg") { ctx.fillStyle = "white"; ctx.fillRect(0, 0, target.width, target.height); }
    ctx.drawImage(target, 0, 0);
    exportCanvas.toBlob(blob => {
      if (!blob) { setNotice("Export failed. Try a smaller image."); return; }
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `orbit-image.${format === "jpeg" ? "jpg" : "png"}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("Image exported. Your original stays unchanged.");
    }, `image/${format}`, .92);
  }
  return <section className="workspace-view"><SectionHeading number="02" label="Image" title="A fresh look. Your image."/><div className="video-grid"><Card className="surface video-canvas"><div className="image-stage">{!image ? <div className="video-placeholder"><ImagePlus size={40}/><span>Your image goes here.</span></div> : null}<canvas ref={canvas} hidden={!image} aria-label="Edited image preview"/></div><div className="canvas-footer">On your device · centre crop · up to 2048px</div></Card><Card className="surface video-controls"><label className="upload-zone"><ImagePlus size={24}/><strong>Choose image</strong><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose image" onChange={e => void select(e.target.files?.[0])}/></label><div className="two-fields"><label className="field">Crop<select aria-label="Image crop" value={ratio} onChange={e => setRatio(e.target.value)}><option value="original">Original</option><option>1:1</option><option>4:5</option><option>9:16</option></select></label><label className="field">Export<select aria-label="Image export format" value={format} onChange={e => setFormat(e.target.value)}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label></div><div className="review-actions"><Button variant="outline" disabled={!image} aria-label="Rotate image" onClick={() => setRotation(v => (v + 90) % 360)}><RotateCw size={17}/>Rotate</Button><Button variant="outline" disabled={!image} aria-label="Flip image" onClick={() => setFlip(v => !v)}><FlipHorizontal size={17}/>Flip</Button></div>{[{name:"Brightness", value:brightness, set:setBrightness},{name:"Contrast",value:contrast,set:setContrast},{name:"Saturation",value:saturation,set:setSaturation}].map(control => <label className="slider-field" key={control.name}><span>{control.name}<output>{control.value}%</output></span><input aria-label={`Image ${control.name.toLowerCase()}`} type="range" min="0" max="200" value={control.value} onChange={e => control.set(Number(e.target.value))}/></label>)}<label className="field">Caption<input aria-label="Image caption" maxLength={180} value={caption} onChange={e => setCaption(e.target.value)}/></label><Button disabled={!image} onClick={download} aria-label="Export image"><Download size={17}/>Export image</Button><Button variant="outline" onClick={reset} aria-label="Reset image edits"><RefreshCw size={17}/>Reset edits</Button>{notice ? <p role="status" className="action-notice">{notice}</p> : null}</Card></div></section>;
}
