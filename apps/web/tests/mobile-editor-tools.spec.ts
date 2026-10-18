import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { selectEditorTool } from './editor-helpers';

for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
  for (const kind of ['Video', 'Image'] as const) test(`${kind} dedicated workspace keeps canvas stable and tools reachable at ${size.width}x${size.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto(`/preview/editor/${kind.toLowerCase()}`);
    await expect(page.locator('.editor-workspace')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Workspace', exact: true })).toHaveCount(0);
    await expect(page.locator('.workspace-header, .orbit-footer')).toHaveCount(0);
    if (kind === 'Video') {
      await page.getByLabel('Choose video', { exact: true }).setInputFiles(join(__dirname, 'fixtures', 'clip.mp4'));
      await expect.poll(() => page.getByLabel('Edited video preview', { exact: true }).evaluate(node => (node as HTMLCanvasElement).width)).toBeGreaterThan(1);
    } else {
      const png = await page.evaluate(() => {
        const canvas = document.createElement('canvas');canvas.width = 1600;canvas.height = 400;
        const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f5c788';ctx.fillRect(0,0,1600,400);for(let column=0;column<4;column++){const x=column*400;ctx.fillStyle=column%2?'#b8543e':'#22565b';ctx.fillRect(x+24,24,352,352);ctx.fillStyle='#f8f0df';ctx.fillRect(x+64,64,272,272);ctx.fillStyle=column%2?'#22565b':'#b8543e';ctx.beginPath();ctx.arc(x+200,200,85,0,Math.PI*2);ctx.fill();}return canvas.toDataURL('image/png').split(',')[1];
      });
      await page.getByLabel('Choose image', { exact: true }).setInputFiles({name:'visual-acceptance.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
      const imageCanvas = page.getByLabel('Edited image preview', { exact: true });
      await expect.poll(() => imageCanvas.evaluate(node => (node as HTMLCanvasElement).width)).toBe(1600);
      const imageBox = (await imageCanvas.boundingBox())!;
      await page.mouse.click(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
      const selection = page.locator('.image-layer-selection');
      await expect(selection).toBeVisible();
      const canvasBox = (await imageCanvas.boundingBox())!, selectionBox = (await selection.boundingBox())!;
      for (const dimension of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(selectionBox[dimension] - canvasBox[dimension])).toBeLessThanOrEqual(2);
    }
    const tools = page.getByRole('navigation', { name: `${kind} editing tools`, exact: true });
    const strip = tools.locator('.mobile-editor-tool-strip');
    if (size.width <= 390) expect(await strip.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
    for (const button of await tools.getByRole('button').all()) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const bounds = (await button.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
    }
    await selectEditorTool(page, kind, 'Adjust & text');
    const input = page.getByLabel(kind === 'Image' ? 'Image caption' : 'Video title', { exact: true });
    await input.fill('My mobile edit');
    await page.getByRole('button',{name:'Light mode',exact:true}).click();
    await page.screenshot({path:testInfo.outputPath(`${kind.toLowerCase()}-${size.width}x${size.height}-light.png`)});
    await page.getByRole('button',{name:'Dark mode',exact:true}).click();
    await page.screenshot({path:testInfo.outputPath(`${kind.toLowerCase()}-${size.width}x${size.height}-dark.png`)});
    await selectEditorTool(page, kind, 'Music');
    await expect(page.locator(kind === 'Image' ? '.image-composer' : '.video-composer').getByLabel('Choose local music', { exact: true })).toBeVisible();
    await expect(page.getByLabel(`Choose ${kind.toLowerCase()}`, { exact: true })).toBeHidden();
    await selectEditorTool(page, kind, 'Adjust & text');
    await expect(input).toHaveValue('My mobile edit');
    const stage = page.locator(kind === 'Image' ? '.image-interactive-stage' : '.video-stage');
    const before = (await stage.boundingBox())!;
    await input.scrollIntoViewIfNeeded();
    await page.locator('.video-controls').evaluate(node => node.scrollTo({ top: node.scrollHeight, behavior: 'instant' }));
    const after = (await stage.boundingBox())!;
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    expect(after.height).toBeGreaterThan(50);
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(after.y + after.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY, overflow: document.documentElement.scrollWidth > innerWidth }))).toEqual({ x: 0, y: 0, overflow: false });
    await selectEditorTool(page, kind, 'Export');
    const action = page.getByRole('button', { name: kind === 'Image' ? 'Export image' : 'Export edited video locally', exact: true });
    await action.scrollIntoViewIfNeeded();
    const actionBox = (await action.boundingBox())!, toolBox = (await tools.boundingBox())!;
    expect(actionBox.y).toBeGreaterThanOrEqual(0);
    expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(toolBox.y + 1);
  });
}

test('media introduces both editors and browser back returns to the introduction', async ({ page }, testInfo) => {
  await page.goto('/preview?view=video');
  const start = page.getByRole('link', { name: 'Start image editing', exact: true });
  await expect(start).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start video editing', exact: true })).toBeVisible();
  await expect(page.locator('.image-composer, .video-composer')).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('media-introduction.png'),fullPage:true});
  await start.click();
  await expect(page).toHaveURL(/\/preview\/editor\/image$/);
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await page.goBack();
  await expect(start).toBeVisible();
  await start.click();
  await page.getByRole('link', { name: 'Back to media', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\?view=video$/);
  await expect(start).toBeVisible();
});
