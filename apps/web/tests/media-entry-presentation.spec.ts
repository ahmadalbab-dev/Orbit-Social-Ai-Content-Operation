import { expect, test, type Locator } from '@playwright/test';

async function discreteCaret(cursor: Locator) {
  await expect(cursor).toBeVisible();
  const samples = await cursor.evaluate(node => {
    const animation = node.getAnimations()[0];
    if (!animation) throw new Error('Expected a blinking insertion caret');
    animation.pause();
    const duration = Number(animation.effect!.getComputedTiming().duration);
    const opacity = Array.from({ length: 20 }, (_, step) => {
      animation.currentTime = step * duration / 20;
      return Number(getComputedStyle(node).opacity);
    });
    return { duration, opacity };
  });
  expect(samples.duration).toBe(500);
  expect(new Set(samples.opacity)).toEqual(new Set([0, 1]));
}

test('insertion carets blink fast with no faded intermediate state across workspace headings and workflow tabs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const view of ['studio', 'calendar', 'profile', 'settings']) {
    await page.goto(`/preview?view=${view}`);
    await discreteCaret(page.locator('.section-heading:visible .cursor-mark').first());
  }
  await page.goto('/preview');
  const examples = page.locator('.workflow-code-tabs');
  await examples.scrollIntoViewIfNeeded();
  for (const label of ['Content', 'Media', 'Channels']) {
    await examples.getByRole('button', { name: label, exact: true }).click();
    await discreteCaret(page.locator('.workflow-type-cursor').first());
    await expect(page.locator('.workflow-type-cursor').first()).toHaveText('|');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/preview?view=studio');
  const caret = page.locator('.section-heading:visible .cursor-mark').first();
  await expect(caret).toHaveCSS('animation-name', 'none');
  await expect(caret).toHaveCSS('opacity', '1');
});

for (const width of [390, 1440]) test(`media entry has distinct equal-size examples and controlled muted playback at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/preview?view=video');
  const choices = page.locator('.media-entry-choices');
  await expect(choices).toBeVisible();
  const videoVisual = page.locator('.media-entry-video .media-entry-visual');
  const imageVisual = page.locator('.media-entry-image .media-entry-visual');
  const videoBox = (await videoVisual.boundingBox())!, imageBox = (await imageVisual.boundingBox())!;
  expect(Math.abs(videoBox.width - imageBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(videoBox.height - imageBox.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(videoBox.width / videoBox.height - 16 / 9)).toBeLessThan(.02);
  if (width > 700) {
    const cards = await choices.locator('.media-entry-choice').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    expect(Math.abs(cards[0] - cards[1])).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('img', { name: /^Image composition example:/ })).toBeVisible();
  const clip = page.locator('.media-video-example video');
  await expect.poll(() => clip.evaluate(node => (node as HTMLVideoElement).readyState)).toBeGreaterThan(0);
  expect(await clip.evaluate(node => { const video = node as HTMLVideoElement;return video.paused && video.muted && video.duration === 4; })).toBe(true);
  await page.getByRole('button', { name: 'Play video example', exact: true }).click();
  await expect.poll(() => clip.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause video example', exact: true }).click();
  expect(await clip.evaluate(node => (node as HTMLVideoElement).paused)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await choices.screenshot({ path: testInfo.outputPath(`media-entry-${width}-light.png`), animations: 'disabled' });
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await choices.screenshot({ path: testInfo.outputPath(`media-entry-${width}-dark.png`), animations: 'disabled' });
  await page.getByRole('link', { name: 'Start image editing', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/editor\/image$/);
});
