import type { ImageComposition } from './image-composition';

/** Arrange existing assets only. Hidden layers remain available for later edits. */
export function beforeAfterRecipe(state: ImageComposition, afterId: string, beforeLabel: string, afterLabel: string): ImageComposition {
  if (!state.image) throw Error('Choose your before photo as the base image first.');
  const after = state.overlays.find(layer => layer.id === afterId);
  if (!after) throw Error('Add an image layer and choose it as your after photo.');
  const labels = [beforeLabel.trim(), afterLabel.trim()];
  if (labels.some(label => !label || label.length > 60)) throw Error('Write before and after labels of 1 to 60 characters each.');
  return {
    ...state, backgroundLayerId: null, template: 'original', ratio: '1:1',
    baseScale: .46, baseX: 25, baseY: 46, textPosition: 'bottom',
    caption: labels.join(' → '),
    overlays: state.overlays.map(layer => layer.id === after.id
      ? {...layer, x: 75, y: 46, width: 46, opacity: 100}
      : {...layer, opacity: 0}),
  };
}
