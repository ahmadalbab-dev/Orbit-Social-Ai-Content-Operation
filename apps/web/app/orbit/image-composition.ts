export type Overlay = { id: string; name: string; image: HTMLImageElement; x: number; y: number; width: number; opacity: number };
export type ImageComposition = { backgroundLayerId: string | null; image: HTMLImageElement | null; baseScale: number; baseX: number; baseY: number; ratio: string; rotation: number; flip: boolean; brightness: number; contrast: number; saturation: number; focusX: number; focusY: number; textSize: number; textPosition: string; textColor: string; caption: string; template: string; accent: string; background: string; overlays: Overlay[] };
export const imageTemplates = [
  { id: "original", name: "Free canvas", tag: "Your composition", color: "#29443c", caption: "", ratio: "original" },
  { id: "product", name: "Product spotlight", tag: "New collection", color: "#ddd6bd", caption: "MADE FOR YOUR EVERYDAY", ratio: "4:5" },
  { id: "poster", name: "Editorial poster", tag: "A bold statement", color: "#e8ff72", caption: "A FRESH PERSPECTIVE", ratio: "4:5" },
  { id: "offer", name: "Weekend offer", tag: "Make it irresistible", color: "#f3b6a4", caption: "YOUR NEXT FAVOURITE\nDiscover the collection", ratio: "1:1" },
  { id: "quote", name: "Words to keep", tag: "Share a little inspiration", color: "#d0c6e6", caption: "Small beginnings.\nRemarkable possibilities.", ratio: "1:1" },
] as const;
export function freshComposition(image: HTMLImageElement | null = null): ImageComposition {
  return { backgroundLayerId: null, image, baseScale: 1, baseX: 50, baseY: 50, ratio: "original", rotation: 0, flip: false, brightness: 100, contrast: 100, saturation: 100, focusX: 50, focusY: 50, textSize: 100, textPosition: "bottom", textColor: "#ffffff", caption: "", template: "original", accent: "#e8ff72", background: "#152b25", overlays: [] };
}
export function applyImageTemplate(state: ImageComposition, id: string): ImageComposition {
  const template = imageTemplates.find(item => item.id === id);
  if (!template) return state;
  return { ...state, template: id, ratio: template.ratio, caption: state.caption.trim() ? state.caption : template.caption, accent: template.color, background: template.color, textColor: id === "original" ? "#ffffff" : "#17261f", textPosition: id === "poster" ? "top" : id === "quote" ? "centre" : "bottom", textSize: id === "poster" ? 145 : id === "quote" ? 125 : 100 };
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
  if (designed || !image || state.baseScale !== 1 || state.baseX !== 50 || state.baseY !== 50) { ctx.fillStyle = state.background; ctx.fillRect(0, 0, w, h); }
  const backgroundLayer = state.overlays.find(layer => layer.id === state.backgroundLayerId);
  if (backgroundLayer) {
    ctx.save(); ctx.globalAlpha = backgroundLayer.opacity / 100;
    const cover = Math.max(w / backgroundLayer.image.naturalWidth, h / backgroundLayer.image.naturalHeight);
    const width = backgroundLayer.image.naturalWidth * cover, height = backgroundLayer.image.naturalHeight * cover;
    ctx.drawImage(backgroundLayer.image, (w - width) / 2, (h - height) / 2, width, height); ctx.restore();
  }
  if (image) {
    ctx.save();
    ctx.translate(w * (state.baseX / 100 - .5), h * (state.baseY / 100 - .5));
    ctx.translate(w / 2, h / 2); ctx.scale(state.baseScale, state.baseScale); ctx.translate(-w / 2, -h / 2);
    if (state.baseScale !== 1 || state.baseX !== 50 || state.baseY !== 50) { ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); }
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
    if (layer.id === state.backgroundLayerId) continue;
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

export type ImageStylePreset = { id: string; name: string; template: "product" | "poster" | "offer" | "quote"; color: string; ink: string; ratio: string; brightness: number; contrast: number; saturation: number; description: string; caption: string; textPosition: "top" | "centre" | "bottom"; textSize: number };
export const imageStylePresets: readonly ImageStylePreset[] = [
  {"id": "quiet-luxury", "name": "Quiet luxury", "template": "product", "color": "#ede7da", "ink": "#29251f", "ratio": "4:5", "brightness": 105, "contrast": 95, "saturation": 80, "description": "A muted product frame and restrained launch headline.", "caption": "MADE WITH INTENTION", "textPosition": "bottom", "textSize": 100},
  {"id": "night-launch", "name": "Night launch", "template": "poster", "color": "#17212d", "ink": "#e8ff72", "ratio": "9:16", "brightness": 100, "contrast": 120, "saturation": 85, "description": "A dark portrait launch card with a high-contrast headline.", "caption": "MEET YOUR NEXT FAVOURITE", "textPosition": "top", "textSize": 145},
  {"id": "summer-drop", "name": "Summer drop", "template": "offer", "color": "#ffcc80", "ink": "#402c1b", "ratio": "1:1", "brightness": 105, "contrast": 110, "saturation": 125, "description": "A bright square sale card for a seasonal collection.", "caption": "THE SUMMER EDIT", "textPosition": "bottom", "textSize": 110},
  {"id": "soft-journal", "name": "Soft journal", "template": "quote", "color": "#dae5e1", "ink": "#24423b", "ratio": "4:5", "brightness": 108, "contrast": 90, "saturation": 75, "description": "A soft portrait journal card with centred text.", "caption": "A LITTLE MOMENT TO KEEP", "textPosition": "centre", "textSize": 125},
  {"id": "studio-drop", "name": "Studio drop", "template": "product", "color": "#e8e3d9", "ink": "#282d28", "ratio": "4:5", "brightness": 103, "contrast": 104, "saturation": 95, "description": "A neutral product introduction with a clear headline.", "caption": "NEW IN THE STUDIO", "textPosition": "bottom", "textSize": 105},
  {"id": "ugc-cover", "name": "UGC cover", "template": "poster", "color": "#eceee8", "ink": "#203b30", "ratio": "9:16", "brightness": 104, "contrast": 108, "saturation": 105, "description": "A portrait cover for a creator story or review.", "caption": "HERE IS WHAT I FOUND", "textPosition": "top", "textSize": 130},
  {"id": "cafe-menu", "name": "Café special", "template": "offer", "color": "#f2dfc4", "ink": "#493421", "ratio": "4:5", "brightness": 106, "contrast": 102, "saturation": 105, "description": "A café special card with room for your own offer.", "caption": "TODAY AT OUR TABLE", "textPosition": "bottom", "textSize": 108},
  {"id": "beauty-edit", "name": "Beauty edit", "template": "product", "color": "#ead9e1", "ink": "#453441", "ratio": "4:5", "brightness": 108, "contrast": 94, "saturation": 88, "description": "A soft product card for a beauty or care collection.", "caption": "YOUR EVERYDAY RITUAL", "textPosition": "bottom", "textSize": 110},
  {"id": "tech-arrival", "name": "Tech arrival", "template": "poster", "color": "#192b3c", "ink": "#b9efff", "ratio": "16:9", "brightness": 100, "contrast": 116, "saturation": 90, "description": "A wide product announcement with a bold top headline.", "caption": "A SMARTER EVERYDAY", "textPosition": "top", "textSize": 125},
  {"id": "weekend-guide", "name": "Weekend guide", "template": "poster", "color": "#f4e8cf", "ink": "#433a2d", "ratio": "9:16", "brightness": 105, "contrast": 108, "saturation": 110, "description": "A tall cover for a local guide or weekend plan.", "caption": "YOUR WEEKEND STARTS HERE", "textPosition": "top", "textSize": 135},
  {"id": "workshop-invite", "name": "Workshop invite", "template": "offer", "color": "#dbd5ef", "ink": "#352657", "ratio": "4:5", "brightness": 104, "contrast": 101, "saturation": 94, "description": "A portrait invitation with an editable event headline.", "caption": "COME CREATE WITH US", "textPosition": "bottom", "textSize": 115},
  {"id": "fitness-focus", "name": "Fitness focus", "template": "poster", "color": "#d6edb2", "ink": "#21371b", "ratio": "9:16", "brightness": 102, "contrast": 120, "saturation": 110, "description": "A crisp portrait cover for a movement or training story.", "caption": "SHOW UP FOR YOURSELF", "textPosition": "top", "textSize": 135},
  {"id": "recipe-note", "name": "Recipe note", "template": "quote", "color": "#f1e1cd", "ink": "#503b2b", "ratio": "4:5", "brightness": 106, "contrast": 96, "saturation": 105, "description": "A recipe or ingredient note with a centred caption panel.", "caption": "SOMETHING GOOD IS COOKING", "textPosition": "centre", "textSize": 115},
  {"id": "travel-postcard", "name": "Travel postcard", "template": "product", "color": "#d7e5ec", "ink": "#25404d", "ratio": "16:9", "brightness": 105, "contrast": 108, "saturation": 112, "description": "A wide photo postcard with an editable destination caption.", "caption": "A LITTLE FURTHER AWAY", "textPosition": "bottom", "textSize": 105},
  {"id": "mono-manifesto", "name": "Mono manifesto", "template": "poster", "color": "#eeeae4", "ink": "#242424", "ratio": "1:1", "brightness": 100, "contrast": 125, "saturation": 0, "description": "A monochrome square statement with a bold headline.", "caption": "MAKE YOUR OWN WAY", "textPosition": "top", "textSize": 145},
  {"id": "community-quote", "name": "Community quote", "template": "quote", "color": "#d9e5d1", "ink": "#2e4331", "ratio": "1:1", "brightness": 104, "contrast": 94, "saturation": 90, "description": "A square quote card for your community or team.", "caption": "BETTER THINGS, TOGETHER", "textPosition": "centre", "textSize": 125},
  {"id": "creator-checklist", "name": "Creator checklist", "template": "quote", "color": "#e4e0f3", "ink": "#39305a", "ratio": "9:16", "brightness": 103, "contrast": 102, "saturation": 90, "description": "A tall editable checklist or tip card.", "caption": "ONE IDEA\nONE SMALL STEP\nSTART TODAY", "textPosition": "centre", "textSize": 105},
  {"id": "launch-countdown", "name": "Launch countdown", "template": "offer", "color": "#f1c9b8", "ink": "#553326", "ratio": "1:1", "brightness": 102, "contrast": 112, "saturation": 110, "description": "A launch reminder card with a short call to action.", "caption": "THE WAIT IS ALMOST OVER", "textPosition": "bottom", "textSize": 120},
  {"id": "thank-you", "name": "Thank you note", "template": "quote", "color": "#eee2d7", "ink": "#5a4034", "ratio": "4:5", "brightness": 108, "contrast": 92, "saturation": 85, "description": "A portrait appreciation card for customers and followers.", "caption": "THANK YOU FOR BEING HERE", "textPosition": "centre", "textSize": 115},
  {"id": "portfolio-cover", "name": "Portfolio cover", "template": "poster", "color": "#d8e0e9", "ink": "#26364b", "ratio": "16:9", "brightness": 100, "contrast": 112, "saturation": 80, "description": "A wide editorial cover for a portfolio or case study.", "caption": "A NEW PERSPECTIVE", "textPosition": "top", "textSize": 130},
];
export function applyImageStylePreset(state: ImageComposition, id: string): ImageComposition {
  const preset = imageStylePresets.find(item => item.id === id); if (!preset) return state;
  return { ...applyImageTemplate(state, preset.template), background: preset.color, accent: preset.color, textColor: preset.ink, ratio: preset.ratio, brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation, caption: state.caption.trim() ? state.caption : preset.caption, textPosition: preset.textPosition, textSize: preset.textSize };
}

export type ImageLayoutId = "equal-split" | "photo-stack" | "product-card";
export const imageLayouts: { id: ImageLayoutId; name: string; description: string; photos: string }[] = [
  { id: "equal-split", name: "Equal split", description: "Give every uploaded photo equal width with a clean gutter.", photos: "2+ photos" },
  { id: "photo-stack", name: "Photo stack", description: "A large hero with smaller overlapping photos in front.", photos: "2+ photos" },
  { id: "product-card", name: "Product card", description: "Frame your product, keep your headline and add a detail inset.", photos: "1+ photos" },
];
/** Original layouts arrange actual uploaded assets; no generated or substituted media. */
export function applyImageLayout(state: ImageComposition, id: ImageLayoutId): ImageComposition {
  if (!state.image) throw Error("Choose a base image before applying this photo layout.");
  if (id !== "product-card" && !state.overlays.length) throw Error("Add an image overlay first. This layout needs at least two uploaded photos.");
  if (id === "equal-split") {
    const count = state.overlays.length + 1, cell = 100 / count, width = Math.max(5, cell - 4);
    return { ...state, backgroundLayerId: null, template: "original", ratio: "original", baseScale: width / 100, baseX: cell / 2, baseY: 50, textPosition: "bottom", overlays: state.overlays.map((layer, index) => ({ ...layer, x: cell * (index + 1.5), y: 50, width, opacity: 100 })) };
  }
  if (id === "photo-stack") {
    return { ...state, backgroundLayerId: null, template: "original", ratio: "4:5", baseScale: .78, baseX: 45, baseY: 43, textPosition: "bottom", overlays: state.overlays.map((layer, index) => ({ ...layer, x: Math.max(25, 68 - index * 5), y: Math.min(78, 61 + index * 3), width: Math.max(22, 50 - index * 3), opacity: 100 })) };
  }
  return { ...applyImageTemplate(state, "product"), backgroundLayerId: null, baseScale: 1, baseX: 50, baseY: 50, overlays: state.overlays.map((layer, index) => ({ ...layer, x: Math.min(82, 75 + index * 2), y: Math.min(70, 57 + index * 3), width: Math.max(16, 30 - index * 2), opacity: 100 })) };
}

/** Reuses an uploaded overlay behind the existing photo. No segmentation or generated pixels. */
export function applyUploadedImageBackground(state: ImageComposition, index: number | null): ImageComposition {
  if (index === null) return { ...state, backgroundLayerId: null };
  if (!state.image) throw Error("Choose a base photo before adding an uploaded image background.");
  if (!Number.isInteger(index) || index < 0 || index >= state.overlays.length) throw Error("Choose an uploaded image layer to use as the background.");
  const chosen = state.overlays[index];
  return { ...state, backgroundLayerId: chosen.id, baseScale: state.baseScale === 1 ? .75 : state.baseScale, overlays: state.overlays.map(layer => layer.id === chosen.id ? { ...layer, opacity: 100 } : layer) };
}
