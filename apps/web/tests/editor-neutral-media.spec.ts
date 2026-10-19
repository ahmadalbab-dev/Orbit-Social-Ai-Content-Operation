import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { selectEditorTool } from './editor-helpers';
const clip = join(__dirname, 'fixtures', 'clip.mp4');

test('video uploads start with original framing and no automatic news or title overlays', async ({ page }) => {
  await page.goto('/preview/editor/video');
  await page.getByLabel('Choose video', { exact: true }).setInputFiles(clip);
  await selectEditorTool(page, 'Video', 'Adjust & text');
  await expect(page.getByLabel('Video format', { exact: true })).toHaveValue('original');
  await expect(page.getByRole('checkbox', { name: 'News report overlay' })).not.toBeChecked();
  await expect(page.getByLabel('Video brightness', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Template video headline', { exact: true })).toHaveCount(0);
  await selectEditorTool(page, 'Video', 'Templates');
  await page.getByRole('button', { name: /Product showcase/ }).click();
  await selectEditorTool(page, 'Video', 'Adjust & text');
  await expect(page.getByLabel('Video format', { exact: true })).toHaveValue('square');
  await expect(page.getByLabel('Video brightness', { exact: true })).toHaveValue('1.03');
  await page.getByLabel('Template video headline', { exact: true }).fill('My own headline');
  await selectEditorTool(page, 'Video', 'Media');
  await page.getByLabel('Choose video', { exact: true }).setInputFiles(clip);
  await selectEditorTool(page, 'Video', 'Adjust & text');
  await expect(page.getByLabel('Video format', { exact: true })).toHaveValue('original');
  await expect(page.getByRole('checkbox', { name: 'News report overlay' })).not.toBeChecked();
  await expect(page.getByLabel('Video brightness', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Template video headline', { exact: true })).toHaveCount(0);
});

test('image replacement starts neutral and customer text survives an explicitly chosen starter kit', async ({ page }) => {
  await page.goto('/preview/editor/image');
  const png = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 120; c.height = 80; const ctx = c.getContext('2d')!; ctx.fillStyle = '#246842'; ctx.fillRect(0, 0, 120, 80); return c.toDataURL().split(',')[1]; }), 'base64');
  const upload = () => page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await upload();
  await selectEditorTool(page, 'Image', 'Adjust & text');
  await page.getByLabel('Image caption', { exact: true }).fill('Customer headline');
  await selectEditorTool(page, 'Image', 'Templates');
  await page.getByRole('button', { name: /UGC cover/ }).click();
  await selectEditorTool(page, 'Image', 'Adjust & text');
  await expect(page.getByLabel('Image crop', { exact: true })).toHaveValue('9:16');
  await expect(page.getByLabel('Image caption', { exact: true })).toHaveValue('Customer headline');
  await selectEditorTool(page, 'Image', 'Media'); await upload();
  await selectEditorTool(page, 'Image', 'Adjust & text');
  await expect(page.getByLabel('Image crop', { exact: true })).toHaveValue('original');
  await expect(page.getByLabel('Image caption', { exact: true })).toHaveValue('');
  const pixel = await page.getByLabel('Edited image preview', { exact: true }).evaluate(node => Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(60, 40, 1, 1).data));
  expect(pixel).toEqual([36, 104, 66, 255]);
});
