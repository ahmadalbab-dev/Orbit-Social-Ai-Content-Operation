export type Overlay = { id: string; name: string; image: HTMLImageElement; x: number; y: number; width: number; opacity: number };
export type ImageComposition = { image: HTMLImageElement | null; ratio: string; rotation: number; flip: boolean; brightness: number; contrast: number; saturation: number; focusX: number; focusY: number; textSize: number; textPosition: string; textColor: string; caption: string; template: string; accent: string; background: string; overlays: Overlay[] };
export const imageTemplates = [
  { id: "original", name: "Free canvas", tag: "Your composition", color: "#29443c", caption: "", ratio: "original" },
  { id: "product", name: "Product spotlight", tag: "New collection", color: "#ddd6bd", caption: "MADE FOR YOUR EVERYDAY", ratio: "4:5" },
  { id: "poster", name: "Editorial poster", tag: "A bold statement", color: "#e8ff72", caption: "A FRESH PERSPECTIVE", ratio: "4:5" },
  { id: "offer", name: "Weekend offer", tag: "Make it irresistible", color: "#f3b6a4", caption: "YOUR NEXT FAVOURITE\nDiscover the collection", ratio: "1:1" },
  { id: "quote", name: "Words to keep", tag: "Share a little inspiration", color: "#d0c6e6", caption: "Small beginnings.\nRemarkable possibilities.", ratio: "1:1" },
] as const;
export function freshComposition(image: HTMLImageElement | null = null): ImageComposition {
  return { image, ratio: "original", rotation: 0, flip: false, brightness: 100, contrast: 100, saturation: 100, focusX: 50, focusY: 50, textSize: 100, textPosition: "bottom", textColor: "#ffffff", caption: "", template: "original", accent: "#e8ff72", background: "#152b25", overlays: [] };
}
export function applyImageTemplate(state: ImageComposition, id: string): ImageComposition {
  const template = imageTemplates.find(item => item.id === id);
  if (!template) return state;
  return { ...state, template: id, ratio: template.ratio, caption: template.caption, accent: template.color, background: template.color, textColor: id === "original" ? "#ffffff" : "#17261f", textPosition: id === "poster" ? "top" : id === "quote" ? "centre" : "bottom", textSize: id === "poster" ? 145 : id === "quote" ? 125 : 100 };
}
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      for (const piece of (context.measureText(word).width > maxWidth ? Array.from(word) : [word])) {
        const separator = piece === word && line ? " " : "";
        if (line && context.measureText(line + separator + piece).width > maxWidth) { lines.push(line); line = piece; }
        else line += separator + piece;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
/** The preview and every exported slide share this exact composition renderer. */
export function renderImageComposition(target: HTMLCanvasElement, state: ImageComposition) {
  const { image } = state;
  const turned = state.rotation % 180 !== 0;
  const iw = image ? turned ? image.naturalHeight : image.naturalWidth : 1080;
  const ih = image ? turned ? image.naturalWidth : image.naturalHeight : 1080;
  const aspect = state.ratio === "original" ? iw / ih : state.ratio === "1:1" ? 1 : state.ratio === "4:5" ? .8 : state.ratio === "16:9" ? 16 / 9 : 9 / 16;
  const cw = Math.min(iw, ih * aspect), ch = cw / aspect;
  const scale = Math.min(1, 2048 / Math.max(cw, ch));
  target.width = Math.max(1, Math.round(cw * scale)); target.height = Math.max(1, Math.round(ch * scale));
  const ctx = target.getContext("2d"); if (!ctx) throw Error("Image editing is unavailable in this browser.");
  const w = target.width, h = target.height, designed = state.template !== "original";
  ctx.clearRect(0, 0, w, h);
  if (designed || !image) { ctx.fillStyle = state.background; ctx.fillRect(0, 0, w, h); }
  if (image) {
    ctx.save();
    if (designed && state.template !== "quote") {
      const margin = w * .065, photoTop = state.template === "poster" ? h * .25 : margin;
      const photoHeight = state.template === "poster" ? h * .64 : h * .65;
      ctx.beginPath(); ctx.rect(margin, photoTop, w - margin * 2, photoHeight); ctx.clip();
      const cover = Math.max((w - margin * 2) / iw, photoHeight / ih);
      ctx.translate(w / 2 + (iw * cover - (w - margin * 2)) * (.5 - state.focusX / 100), photoTop + photoHeight / 2 + (ih * cover - photoHeight) * (.5 - state.focusY / 100)); ctx.scale(state.flip ? -1 : 1, 1); ctx.rotate(state.rotation * Math.PI / 180);
      ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
      ctx.drawImage(image, -image.naturalWidth * cover / 2, -image.naturalHeight * cover / 2, image.naturalWidth * cover, image.naturalHeight * cover);
    } else {
      ctx.translate(w / 2, h / 2); ctx.scale(scale, scale);
      ctx.translate((iw - cw) * (.5 - state.focusX / 100), (ih - ch) * (.5 - state.focusY / 100));
      ctx.scale(state.flip ? -1 : 1, 1); ctx.rotate(state.rotation * Math.PI / 180);
      ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    }
    ctx.restore();
  }
  if (state.template === "quote") { ctx.fillStyle = state.accent + "e8"; ctx.fillRect(w * .07, h * .14, w * .86, h * .72); }
  for (const layer of state.overlays) {
    ctx.save(); ctx.globalAlpha = layer.opacity / 100;
    const width = w * layer.width / 100, height = width * layer.image.naturalHeight / layer.image.naturalWidth;
    ctx.drawImage(layer.image, w * layer.x / 100 - width / 2, h * layer.y / 100 - height / 2, width, height); ctx.restore();
  }
  if (state.caption.trim()) {
    const size = Math.max(12, Math.round(w / 24 * state.textSize / 100));
    ctx.font = `bold ${size}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = wrap(ctx, state.caption.trim(), w * .84), lineHeight = size * 1.4;
    const visible = lines.slice(0, Math.max(1, Math.min(8, Math.floor(h * .65 / lineHeight))));
    if (visible.length < lines.length) visible[visible.length - 1] = visible[visible.length - 1].slice(0, -3) + "…";
    const height = visible.length * lineHeight + size;
    const top = state.textPosition === "top" ? h * .02 : state.textPosition === "centre" ? (h - height) / 2 : h - height - (designed ? h * .04 : 0);
    if (!designed) { ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(0, top, w, height); }
    ctx.fillStyle = state.textColor;
    visible.forEach((line, i) => ctx.fillText(line, w / 2, top + size / 2 + lineHeight * (i + .5)));
  }
  return target;
}
/** Stored ZIP keeps carousel order without requiring external services or dependencies. */
export function imageCarouselZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = []; let offset = 0;
  const header = (size: number) => new DataView(new ArrayBuffer(size));
  for (const file of files) {
    const name = new TextEncoder().encode(file.name); let crc = 0xffffffff;
    for (const byte of file.bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; } crc = (crc ^ 0xffffffff) >>> 0;
    const local = header(30); local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint32(14, crc, true); local.setUint32(18, file.bytes.length, true); local.setUint32(22, file.bytes.length, true); local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, file.bytes);
    const entry = header(46); entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint32(16, crc, true); entry.setUint32(20, file.bytes.length, true); entry.setUint32(24, file.bytes.length, true); entry.setUint16(28, name.length, true); entry.setUint32(42, offset, true);
    directory.push(new Uint8Array(entry.buffer), name); offset += 30 + name.length + file.bytes.length;
  }
  const directorySize = directory.reduce((sum, item) => sum + item.length, 0), end = header(22);
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, directorySize, true); end.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + 22); let position = 0;
  for (const part of [...chunks, ...directory, new Uint8Array(end.buffer)]) { result.set(part, position); position += part.length; }
  return result;
}
