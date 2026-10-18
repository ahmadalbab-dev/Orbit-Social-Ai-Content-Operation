import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('image overlays become exported pixels and carousel ZIP retains independent slides', async ({ page }) => {
  const uploads: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') uploads.push(request.url()); });
  await page.goto('/preview');
  await page.getByRole('button', { name: 'Video Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Image Editor', exact: true }).click();
  const asset = async (color: string) => Buffer.from(await page.evaluate(color => { const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100; const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 100, 100); return canvas.toDataURL('image/png').split(',')[1]; }, color), 'base64');
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'base.png', mimeType: 'image/png', buffer: await asset('#ff0000') });
  await expect(page.getByRole('button', { name: 'Export image', exact: true })).toBeEnabled();
  await page.getByLabel('Add image overlay', { exact: true }).setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await asset('#0000ff') });
  await expect(page.getByLabel('Layer opacity', { exact: true })).toBeVisible();
  const pixel = (x: number, y: number) => page.getByLabel('Edited image preview', { exact: true }).evaluate((node, point) => Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(point.x, point.y, 1, 1).data), { x, y });
  await expect.poll(() => pixel(50, 50)).toEqual([0, 0, 255, 255]);
  expect(await pixel(5, 5)).toEqual([255, 0, 0, 255]);
  const imageDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export image', exact: true }).click();
  const image = await imageDownload; expect(image.suggestedFilename()).toBe('orbit-slide-01.png');
  const png = await readFile((await image.path())!); expect(png.subarray(1, 4).toString()).toBe('PNG');
  await page.getByRole('button', { name: 'Duplicate slide', exact: true }).click();
  await page.getByRole('button', { name: /Words to keep/ }).click();
  await page.getByRole('button', { name: 'Edit slide 1', exact: true }).click();
  await expect.poll(() => pixel(50, 50)).toEqual([0, 0, 255, 255]);
  const zipDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export carousel ZIP', exact: true }).click();
  const zip = await zipDownload; const bytes = await readFile((await zip.path())!);
  expect(zip.suggestedFilename()).toBe('orbit-carousel.zip'); expect(bytes.readUInt32LE(0)).toBe(0x04034b50); expect(bytes.readUInt16LE(bytes.length - 12)).toBe(2);
  expect(uploads).toEqual([]);
});

test('templates can start a composition on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview');
  await page.getByRole('button', { name: 'Video Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Image Editor', exact: true }).click();
  await page.getByRole('button', { name: /Editorial poster/ }).click();
  await expect(page.getByRole('button', { name: 'Export image', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
