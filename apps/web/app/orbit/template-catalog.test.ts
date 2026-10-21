import { expect, it, vi } from 'vitest';
import { applyImageStylePreset, freshComposition, imageStylePresets, renderImageComposition } from './image-composition';
import { creativeVideoTemplates, neutralVideoSettings, videoTemplates } from './video-templates';

it('renders every image starter kit with uploaded media and preserves customer captions', () => {
  expect(imageStylePresets).toHaveLength(20);
  expect(new Set(imageStylePresets.map(preset => preset.id)).size).toBe(imageStylePresets.length);
  const image = { naturalWidth: 1600, naturalHeight: 1200 } as HTMLImageElement;
  for (const preset of imageStylePresets) {
    const context = { clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillText: vi.fn(), measureText: (text: string) => ({ width: text.length * 18 }) };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const original = { ...freshComposition(image), caption: 'My customer headline' };
    const selected = applyImageStylePreset(original, preset.id);
    expect(selected.image).toBe(image); expect(selected.caption).toBe(original.caption);
    expect(selected.template).not.toBe('original');
    expect(selected.background).toMatch(/^#[a-f0-9]{6}$/i); expect(selected.textColor).toMatch(/^#[a-f0-9]{6}$/i);
    renderImageComposition(canvas, selected);
    expect(canvas.width).toBeGreaterThan(0); expect(canvas.height).toBeGreaterThan(0);
    expect(context.drawImage).toHaveBeenCalledOnce(); expect(context.fillText).toHaveBeenCalled();
    expect(original.ratio).toBe('original');
  }
});

it('offers distinct bounded video recipes accepted by existing preview/export template families', () => {
  expect(creativeVideoTemplates).toHaveLength(20);
  expect(new Set(creativeVideoTemplates.map(preset => preset.key)).size).toBe(creativeVideoTemplates.length);
  const settings = creativeVideoTemplates.map(({ template, format, brightness, contrast, saturation, speed, title, captions }) => JSON.stringify({ template, format, brightness, contrast, saturation, speed, title, captions }));
  expect(new Set(settings).size).toBe(settings.length);
  for (const preset of creativeVideoTemplates) {
    expect(videoTemplates.some(base => base.id === preset.template)).toBe(true);
    expect(['portrait', 'square', 'landscape']).toContain(preset.format);
    for (const value of [preset.brightness, preset.contrast]) { expect(value).toBeGreaterThanOrEqual(.5); expect(value).toBeLessThanOrEqual(1.5); }
    expect(preset.saturation).toBeGreaterThanOrEqual(0); expect(preset.saturation).toBeLessThanOrEqual(2);
    expect(preset.speed).toBeGreaterThanOrEqual(.5); expect(preset.speed).toBeLessThanOrEqual(2);
    expect(preset.title?.length ?? 0).toBeLessThanOrEqual(100);
    expect(preset.captions?.every(text => text.length > 0 && text.length <= 120) ?? true).toBe(true);
  }
  expect(neutralVideoSettings).toMatchObject({ template: 'clean', title: '', news: false, speed: 1 });
});
