import type { Overlay } from "./image-composition";
export type CanvasPoint = { x: number; y: number };
export type CanvasViewport = { zoom: number; x: number; y: number };
export const fittedImageViewport: CanvasViewport = { zoom: 1, x: 0, y: 0 };
export function boundedZoom(zoom: number) { return Math.max(1, Math.min(4, zoom)); }
export function canvasPercent(point: CanvasPoint, bounds: { left: number; top: number; width: number; height: number }): CanvasPoint {
  return { x: (point.x - bounds.left) / bounds.width * 100, y: (point.y - bounds.top) / bounds.height * 100 };
}
export function imageLayerBounds(layer: Overlay, canvasAspect: number) {
  const height = layer.width * canvasAspect * layer.image.naturalHeight / layer.image.naturalWidth;
  return { left: layer.x - layer.width / 2, top: layer.y - height / 2, width: layer.width, height };
}
/** Reverse paint order selects the visible topmost layer, even after viewport zoom. */
export function hitImageLayer(overlays: Overlay[], point: CanvasPoint, canvasAspect: number) {
  return [...overlays].reverse().find(layer => {
    const bounds = imageLayerBounds(layer, canvasAspect);
    return layer.opacity > 0 && point.x >= bounds.left && point.x <= bounds.left + bounds.width && point.y >= bounds.top && point.y <= bounds.top + bounds.height;
  });
}
export function draggedImageLayer(origin: CanvasPoint, pointerStart: CanvasPoint, pointerNow: CanvasPoint) {
  return { x: Math.max(0, Math.min(100, origin.x + pointerNow.x - pointerStart.x)), y: Math.max(0, Math.min(100, origin.y + pointerNow.y - pointerStart.y)) };
}
export function gestureDistance(points: CanvasPoint[]) { return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y); }
