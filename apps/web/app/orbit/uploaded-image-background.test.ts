import { describe, expect, it, vi } from 'vitest';
import { applyUploadedImageBackground, freshComposition, renderImageComposition } from './image-composition';
const image = { naturalWidth: 200, naturalHeight: 200 } as HTMLImageElement;
const background = { naturalWidth: 400, naturalHeight: 200 } as HTMLImageElement;
function composition() { return { ...freshComposition(image), caption: 'Customer text', overlays: [{ id: 'background-photo', name: 'second.jpg', image: background, x: 50, y: 50, width: 40, opacity: 50 }] }; }
describe('uploaded image background', () => {
  it('moves the second uploaded photo behind the retained base and keeps a restorable original', () => {
    const before = composition(), after = applyUploadedImageBackground(before, 0);
    expect(after.image).toBe(image); expect(after.backgroundLayerId).toBe('background-photo'); expect(after.overlays[0].image).toBe(background); expect(after.baseScale).toBe(.75); expect(after.caption).toBe('Customer text');
    expect(before.backgroundLayerId).toBeNull(); expect(before.baseScale).toBe(1); expect(before.overlays[0].opacity).toBe(50);
    expect(applyUploadedImageBackground({ ...before, baseScale: .42, baseX: 26 }, 0)).toMatchObject({ baseScale: .42, baseX: 26 });
  });
  it('draws cover-sized background first and the existing photo second, never double painting the background as a foreground overlay', () => {
    const context = { clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), measureText: () => ({ width: 12 }), fillText: vi.fn() };
    const target = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    renderImageComposition(target, applyUploadedImageBackground({ ...composition(), caption: '' }, 0));
    expect(context.drawImage).toHaveBeenCalledTimes(2); expect(context.drawImage.mock.calls[0]).toEqual([background, -100, 0, 400, 200]); expect(context.drawImage.mock.calls[1][0]).toBe(image); expect(context.scale).toHaveBeenCalledWith(.75, .75);
  });
  it('validates uploaded assets and supports clearing the role without removing the photo', () => {
    expect(() => applyUploadedImageBackground(composition(), 2)).toThrow('uploaded image layer'); expect(() => applyUploadedImageBackground(freshComposition(), 0)).toThrow('base photo');
    const clear = applyUploadedImageBackground(applyUploadedImageBackground(composition(), 0), null); expect(clear.backgroundLayerId).toBeNull(); expect(clear.overlays).toHaveLength(1);
  });
});
