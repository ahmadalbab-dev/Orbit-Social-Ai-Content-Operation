import { expect, test } from '@playwright/test';

for (const kind of ['Video', 'Image']) test(`${kind} mobile tools scroll sideways and retain edits while the preview stays visible`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview');
  await page.getByRole('button', { name: 'Video Editor', exact: true }).click();
  if (kind === 'Image') await page.getByRole('button', { name: 'Image Editor', exact: true }).click();
  const tools = page.getByRole('navigation', { name: `${kind} editing tools` });
  await expect(tools).toBeVisible();
  const strip = tools.locator('.mobile-editor-tool-strip');
  expect(await strip.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await strip.evaluate(node => node.scrollTo({ left: node.scrollWidth }));
  await tools.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.locator(kind === 'Image' ? '.image-composer' : '.video-composer').getByLabel('Choose local music', { exact: true })).toBeVisible();
  await expect(page.getByLabel(`Choose ${kind.toLowerCase()}`, { exact: true })).toBeHidden();
  await tools.getByRole('button', { name: 'Adjust & text', exact: true }).click();
  const input = kind === 'Image' ? page.getByLabel('Image caption', { exact: true }) : page.getByLabel('Video title', { exact: true });
  await input.fill('My mobile edit');
  await tools.getByRole('button', { name: 'Music', exact: true }).click();
  await tools.getByRole('button', { name: 'Adjust & text', exact: true }).click();
  await expect(input).toHaveValue('My mobile edit');
  if (kind === 'Video') {
    await page.getByRole('button', { name: 'Video date', exact: true }).click();
    const calendar = page.getByRole('dialog', { name: 'Video date calendar', exact: true });
    await calendar.locator('.ios-date-days button[data-current-month="true"]').filter({ hasText: /^15$/ }).click();
    await expect(calendar).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Video date', exact: true })).toContainText('15');
  }
  await input.scrollIntoViewIfNeeded();
  const preview = page.locator(kind === 'Image' ? '.image-interactive-stage' : '.video-stage');
  const bounds = (await preview.boundingBox())!, bar = (await tools.boundingBox())!;
  const navigation = (await page.getByRole('navigation', { name: 'Workspace', exact: true }).boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(navigation.y + navigation.height);
  expect(bounds.y + bounds.height).toBeLessThan(bar.y);
  expect(bar.y + bar.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
