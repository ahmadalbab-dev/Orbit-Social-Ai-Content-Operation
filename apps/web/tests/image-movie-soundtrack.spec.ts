import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { selectEditorTool } from './editor-helpers';

test('template movie retains video and measurable included MP3 audio', async ({ page }) => {
  test.setTimeout(60000);
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/preview/editor/image');
  await selectEditorTool(page, 'Image', 'Templates');
  await page.getByRole('button', { name: 'Mono manifesto A monochrome square statement with a bold headline.', exact: true }).click();
  await selectEditorTool(page, 'Image', 'Music');
  await page.getByRole('checkbox', { name: 'I checked the source and can use this sound.', exact: true }).check();
  await page.getByRole('button', { name: 'Use this sound', exact: true }).click();
  await expect(page.getByLabel('Soundtrack offset', { exact: true })).toBeVisible();
  await page.getByLabel('Image movie motion', { exact: true }).selectOption('zoom-in');
  await page.getByLabel('Image movie seconds per slide', { exact: true }).fill('3');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export image movie', exact: true }).click();
  const download = await pending;
  const bytes = await readFile((await download.path())!);
  const video = page.getByLabel('Exported image movie preview', { exact: true });
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).videoWidth)).toBe(1080);
  expect(await video.evaluate(node => (node as HTMLVideoElement).videoHeight)).toBe(1080);
  const sound = await page.evaluate(async data => {
    const audio = new AudioContext();
    try {
      const bytes = Uint8Array.from(atob(data), value => value.charCodeAt(0));
      const buffer = await audio.decodeAudioData(bytes.buffer);
      let squares = 0;
      for (const sample of buffer.getChannelData(0)) squares += sample * sample;
      return { duration: buffer.duration, rms: Math.sqrt(squares / buffer.length) };
    } finally { await audio.close(); }
  }, bytes.toString('base64'));
  expect(sound.duration).toBeGreaterThan(2.5);
  expect(sound.duration).toBeLessThan(3.5);
  expect(sound.rms).toBeGreaterThan(.001);
  expect(posts).toEqual([]);
});
