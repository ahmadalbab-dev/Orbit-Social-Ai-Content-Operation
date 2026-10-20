import type { ImageEditorState, EditorPlan } from './editor-ai-contract';
/** A known uploaded-asset operation needs no model request or media upload. */
export function uploadedBackgroundPlan(instruction: string, current: ImageEditorState): EditorPlan | null {
  if (/\b(?:not|never|don't|do not|jangan|bukan)\b/i.test(instruction)) return null;
  if (!/\b(?:create|use|set|make|guna|jadikan|gunakan)\b/i.test(instruction) || !/\b(?:background|latar)\b/i.test(instruction) || !/\b(?:second image|image 2|image two|gambar kedua)\b/i.test(instruction)) return null;
  if (!current.hasBaseImage || !current.layers?.some(layer => layer.index === 0)) return null;
  return { summary: 'Use your second uploaded image as a full-canvas background behind the existing photo. The whole foreground photo is preserved; this does not remove its original background. Review the result before exporting. No AI request or quota was used.', changes: { backgroundLayerIndex: 0 } };
}
