import { expect, test } from '@playwright/test';
import { toneWav } from './audio-fixtures';
import { selectEditorTool } from './editor-helpers';
const result = { id: 'library-tone', title: 'Library piano', creator: 'Fixture composer', license: 'cc0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en/', source: 'wikimedia_audio', category: 'music', mature: false, foreign_landing_url: 'https://commons.wikimedia.org/wiki/File:Fixture.wav', url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Fixture.wav' };
for (const kind of ['Image', 'Video'] as const) test(`${kind} editor imports a bounded library sound through the local soundtrack decoder`, async ({ page }) => {
  await page.route('https://api.openverse.org/v1/audio/**', route => { const url = new URL(route.request().url()); expect(url.searchParams.get('license')).toBe('cc0'); expect(url.searchParams.get('source')).toBe('wikimedia_audio'); return route.fulfill({ json: { results: [result, { ...result, id: 'excluded', license: 'by-nc', title: 'Restricted song' }] } }); });
  await page.route(result.url, route => route.fulfill({ contentType: 'audio/wav', body: toneWav() }));
  await page.goto(`/preview/editor/${kind.toLowerCase()}`); await selectEditorTool(page, kind, 'Music');
  await expect(page.getByLabel('Sound library search')).toBeVisible();
  await page.getByRole('button', { name: 'Search sounds', exact: true }).click();
  await page.getByRole('button', { name: /Library piano Fixture composer/ }).click();
  await expect(page.getByText('Restricted song', { exact: true })).toHaveCount(0);
  const use = page.getByRole('button', { name: 'Use this sound', exact: true }); await expect(use).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I checked the source and can use this sound.' }).check();
  await use.click(); await expect(page.getByLabel('Soundtrack offset', { exact: true })).toBeVisible();
  await expect(page.getByText('Library piano added to your local soundtrack.', { exact: true })).toBeVisible();
  const audio = page.locator('.sound-library audio'); await audio.evaluate(node => (node as HTMLAudioElement).play());
  await selectEditorTool(page, kind, 'Export'); await expect.poll(() => audio.evaluate(node => (node as HTMLAudioElement).paused)).toBe(true);
});
test('library limits are reported without inventing an import', async ({ page }) => {
  await page.route('https://api.openverse.org/v1/audio/**', route => route.fulfill({ status: 429, json: {} }));
  await page.goto('/preview/editor/image'); await selectEditorTool(page, 'Image', 'Music'); await expect(page.getByLabel('Sound library search')).toBeVisible(); await page.getByRole('button', { name: 'Search sounds', exact: true }).click();
  await expect(page.getByText(/public sound library reached its request limit/)).toBeVisible(); await expect(page.getByLabel('Soundtrack offset', { exact: true })).toHaveCount(0);
});
