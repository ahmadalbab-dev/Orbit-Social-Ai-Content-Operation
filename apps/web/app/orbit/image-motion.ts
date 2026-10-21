export const imageMotions = [
  { id: 'none', name: 'Still image' },
  { id: 'zoom-in', name: 'Slow zoom in' },
  { id: 'zoom-out', name: 'Slow zoom out' },
  { id: 'pan-left', name: 'Pan left' },
  { id: 'pan-right', name: 'Pan right' },
] as const;
export type ImageMotion = typeof imageMotions[number]['id'];
/** Camera movement of existing pixels only; never invent subject motion or generated footage. */
export function imageMotionInstruction(instruction: string): ImageMotion | null {
  if (/\b(?:not|never|don't|do not|jangan|bukan|person|child|human|face|walk|dance|talk|subject|orang|wajah|background|latar|remove|replace|erase|generate|new|cutout|buang|ganti|jana|music|soundtrack|muzik|lagu)\b/i.test(instruction)) return null;
  if (!/\b(?:screen|image|photo|picture|camera|gambar|skrin|foto|kamera)\b/i.test(instruction) || !/\b(?:moving|motion|animate|animation|bergerak|gerakkan|pan|zoom)\b/i.test(instruction)) return null;
  return /\b(?:left|kiri)\b/i.test(instruction) ? 'pan-left' : /\b(?:right|kanan)\b/i.test(instruction) ? 'pan-right' : /\b(?:out|keluar)\b/i.test(instruction) ? 'zoom-out' : 'zoom-in';
}
export function imageMotionFrame(width: number, height: number, motion: ImageMotion, progress: number) {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const eased = t * t * (3 - 2 * t);
  const scale = motion === 'none' ? 1 : motion === 'zoom-in' ? 1 + .12 * eased : motion === 'zoom-out' ? 1.12 - .12 * eased : 1.12;
  const w = width * scale, h = height * scale;
  const x = motion === 'pan-left' ? -(w - width) * eased : motion === 'pan-right' ? -(w - width) * (1 - eased) : (width - w) / 2;
  return { x, y: (height - h) / 2, width: w, height: h };
}
export function drawImageMotion(context: CanvasRenderingContext2D, source: HTMLCanvasElement, motion: ImageMotion, progress: number) {
  const { width, height } = context.canvas;
  const frame = imageMotionFrame(width, height, motion, progress);
  context.clearRect(0, 0, width, height);
  context.drawImage(source, frame.x, frame.y, frame.width, frame.height);
}

/** Route only image-pixel work; preserve ordinary canvas colour/layout planning. */
export function pixelImageInstruction(instruction: string): boolean {
  if (/\b(?:not|never|don't|do not|jangan|bukan)\b/i.test(instruction)) return false;
  if (/\b(?:remove|erase|replace|swap|buang|ganti)\b[\s\S]{0,100}\b(?:background|object|person|latar|objek)\b/i.test(instruction)) return true;
  if (/\b(?:create|generate|buat|jana)\b[\s\S]{0,100}\b(?:background|latar|scene)\b/i.test(instruction) && /\b(?:studio|beach|mountain|forest|city|sunset|lifestyle|texture|commercial)\b/i.test(instruction)) return true;
  return /\b(?:turn|transform|convert|jadikan|tukar)\b[\s\S]{0,100}\bcommercial product\b/i.test(instruction);
}
