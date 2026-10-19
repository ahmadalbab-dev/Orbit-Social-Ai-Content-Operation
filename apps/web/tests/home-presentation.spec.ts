import { expect, test, type Locator } from '@playwright/test';

/** Measure title ink, excluding the translucent ambient-code background. */
async function canvasHasArtwork(canvas: Locator) {
  await expect.poll(() => canvas.evaluate(node => {
    const element = node as HTMLCanvasElement;
    const rawBounds = element.dataset.titleBounds;
    if (!element.width || !element.height || !rawBounds) return 0;
    const bounds = JSON.parse(rawBounds) as { x: number; y: number; width: number; height: number };
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return 0;
    const scaleX = element.width / box.width, scaleY = element.height / box.height;
    const left = Math.max(0, Math.floor(bounds.x * scaleX));
    const top = Math.max(0, Math.floor(bounds.y * scaleY));
    const right = Math.min(element.width, Math.ceil((bounds.x + bounds.width) * scaleX));
    const bottom = Math.min(element.height, Math.ceil((bounds.y + bounds.height) * scaleY));
    if (right <= left || bottom <= top) return 0;
    const pixels = element.getContext('2d')!.getImageData(left, top, right - left, bottom - top).data;
    let ink = 0;
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] > 40) ink++;
    return ink / (pixels.length / 4);
  })).toBeGreaterThan(.005);
}

for (const width of [320, 390, 1440, 3840]) {
  test(`Home presents a centered responsive hero and example posts at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1080 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/preview');
    const home = page.locator('.overview-view');
    const hero = home.locator('.orbit-hero');
    const copy = hero.locator('.hero-intro');
    const art = hero.locator('.orbit-artwork');
    await expect(home).toBeVisible();
    await canvasHasArtwork(art.locator('canvas'));
    const homeBox = (await home.boundingBox())!;
    expect(homeBox.x).toBeGreaterThanOrEqual(0);
    expect(homeBox.x + homeBox.width).toBeLessThanOrEqual(width + 1);
    expect(Math.abs(homeBox.x - (width - homeBox.width) / 2)).toBeLessThanOrEqual(2);
    if (width >= 1920) expect(Math.abs(homeBox.width - width * .7)).toBeLessThanOrEqual(2);
    else if (width < 768) expect(homeBox.width).toBeGreaterThanOrEqual(width * .88);
    else expect(homeBox.width).toBeGreaterThan(width * .8);
    const copyBox = (await copy.boundingBox())!, artBox = (await art.locator('canvas').boundingBox())!;
    const title = await art.locator('canvas').evaluate(node => JSON.parse((node as HTMLCanvasElement).dataset.titleBounds!) as { x: number; y: number; width: number; height: number });
    artBox.x += title.x;artBox.y += title.y;artBox.width = title.width;artBox.height = title.height;
    const overlapWidth = Math.min(copyBox.x + copyBox.width, artBox.x + artBox.width) - Math.max(copyBox.x, artBox.x);
    const overlapHeight = Math.min(copyBox.y + copyBox.height, artBox.y + artBox.height) - Math.max(copyBox.y, artBox.y);
    expect(overlapWidth <= 1 || overlapHeight <= 1).toBe(true);
    expect(copyBox.width).toBeGreaterThan(200);
    expect(title.height).toBeGreaterThan(10);
    expect((await art.boundingBox())!.height).toBeGreaterThan(100);
    const showcase = home.locator('.home-post-showcase');
    await expect(showcase.getByRole('heading', { name: 'One idea. Every channel.', exact: true })).toBeVisible();
    await expect(showcase.getByText('Example content and layouts. Live publishing is off.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const mode of ['Light', 'Dark']) {
      await page.getByRole('button', { name: `${mode} mode`, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode.toLowerCase());
      await hero.screenshot({ path: testInfo.outputPath(`home-hero-${width}-${mode.toLowerCase()}.png`), animations: 'disabled' });
      await showcase.screenshot({ path: testInfo.outputPath(`home-posts-${width}-${mode.toLowerCase()}.png`), animations: 'disabled' });
    }
  });
}

test('example platform tabs support keyboard selection and open Content Studio', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview');
  const showcase = page.locator('.home-post-showcase');
  const tabs = showcase.getByRole('tablist', { name: 'Example post platforms', exact: true });
  const facebook = tabs.getByRole('tab', { name: 'Facebook', exact: true });
  await facebook.focus();
  await expect(facebook).toHaveAttribute('aria-selected', 'true');
  await expect(showcase.getByRole('article', { name: 'Facebook example post', exact: true })).toBeVisible();
  for (const platform of ['Instagram', 'Threads']) {
    await page.keyboard.press('ArrowRight');
    const active = tabs.getByRole('tab', { name: platform, exact: true });
    await expect(active).toBeFocused();
    await expect(active).toHaveAttribute('aria-selected', 'true');
    await expect(showcase.getByRole('tabpanel')).toHaveCount(1);
    const example = showcase.getByRole('article', { name: `${platform} example post`, exact: true });
    await expect(example).toBeVisible();
    await expect(example.getByText('Example post · not published', { exact: true })).toBeVisible();
    await example.screenshot({path:testInfo.outputPath(`home-${platform.toLowerCase()}-example.png`),animations:'disabled'});
  }
  await page.keyboard.press('Home');
  await expect(facebook).toBeFocused();
  await expect(facebook).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab', { name: 'Threads', exact: true })).toBeFocused();
  await showcase.getByRole('button', { name: 'Create your own post', exact: true }).click();
  await expect(page).toHaveURL(/view=studio/);
  await expect(page.getByRole('heading', { name: 'Create once. Review every channel.', exact: true })).toBeVisible();
});

for (const preference of ['system', 'workspace'] as const) {
  test(`hero stays rendered and still with ${preference} reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: preference === 'system' ? 'reduce' : 'no-preference' });
    await page.goto('/preview');
    if (preference === 'workspace') {
      await page.getByRole('button', { name: 'Workspace Settings', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Reduce decorative animation', exact: true }).check();
      await page.getByRole('button', { name: 'Overview', exact: true }).click();
    }
    const canvas = page.locator('.overview-view canvas.orbit-field');
    await expect(canvas).toHaveAttribute('data-scene', 'orbit');
    await expect(canvas).toHaveAttribute('data-motion', 'paused');
    await canvasHasArtwork(canvas);
    const still = await canvas.evaluate(async node => {
      const canvas = node as HTMLCanvasElement;
      const before = canvas.toDataURL();
      for (let frame = 0; frame < 16; frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      return canvas.toDataURL() === before;
    });
    expect(still).toBe(true);
    if (preference === 'system') {
      await expect(page.getByRole('button', { name: 'System mode', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      const lightFrame = await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
      // Device theme changes update a frozen canvas without a click, resize or animation frame loop.
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect.poll(async () => (await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())) !== lightFrame).toBe(true);
      await expect(canvas).toHaveAttribute('data-motion', 'paused');
      await expect(canvas).toHaveAttribute('data-scene', 'orbit');
      await canvasHasArtwork(canvas);
      const darkStill = await canvas.evaluate(async node => {
        const element = node as HTMLCanvasElement, before = element.toDataURL();
        for (let frame = 0; frame < 16; frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        return element.toDataURL() === before;
      });
      expect(darkStill).toBe(true);
      await canvas.screenshot({ path: testInfo.outputPath('home-system-theme-paused-dark.png'), animations: 'disabled' });
    }
  });
}


test('hero records a complete live Orbit to ai studio and back handoff', async ({ browser, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'One Chromium recording complements cross-browser layout and reduced-motion checks.');
  test.setTimeout(45000);
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light', reducedMotion: 'no-preference',
    recordVideo: { dir: testInfo.outputPath('hero-motion'), size: { width: 1440, height: 900 } },
  });
  try {
    const page = await context.newPage();
    await page.goto('/preview');
    const canvas = page.locator('.overview-view canvas.orbit-field');
    await expect(canvas).toHaveAttribute('data-motion', 'running');
    await expect(canvas).toHaveAttribute('data-scene', 'orbit');
    await canvasHasArtwork(canvas);
    await expect(canvas).toHaveAttribute('data-scene', 'ai-studio', { timeout: 18000 });
    await canvasHasArtwork(canvas);
    await expect(canvas).toHaveAttribute('data-scene', 'orbit', { timeout: 18000 });
    await canvasHasArtwork(canvas);
  } finally {
    await context.close();
  }
});
