import { expect, test } from '@playwright/test';
import { toneWav } from './audio-fixtures';
import { selectEditorTool } from './editor-helpers';
const result = { id: 'library-tone', title: 'Library piano', creator: 'Fixture composer', license: 'cc0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en/', source: 'freesound', category: 'music', mature: false, foreign_landing_url: 'https://freesound.org/people/fixture/sounds/155139/', url: 'https://cdn.freesound.org/previews/155/155139_2098884-hq.mp3' };
for (const kind of ['Image', 'Video'] as const) test(`${kind} editor imports a bounded library sound through the local soundtrack decoder`, async ({ page }) => {
  await page.route('**/api/music/search?**', route => { const url = new URL(route.request().url()); expect(url.searchParams.get('q')).toBe('ambient'); return route.fulfill({ json: { results: [result, { ...result, id: 'excluded', license: 'by-nc', title: 'Restricted song' }] } }); });
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
  await page.route('**/api/music/search?**', route => route.fulfill({ status: 429, json: {} }));
  await page.goto('/preview/editor/image'); await selectEditorTool(page, 'Image', 'Music'); await expect(page.getByLabel('Sound library search')).toBeVisible(); await page.getByRole('button', { name: 'Search sounds', exact: true }).click();
  await expect(page.getByText(/public sound library reached its request limit/)).toBeVisible(); await expect(page.getByLabel('Soundtrack offset', { exact: true })).toHaveCount(0);
});

for (const kind of ['Image', 'Video'] as const) test(`${kind} editor plays and imports a real included MP3 when live catalog is unavailable`, async ({ page }) => {
  await page.route('**/api/music/search?**', route => route.fulfill({ json: { results: [], mode: 'starter' } }));
  await page.goto(`/preview/editor/${kind.toLowerCase()}`); await selectEditorTool(page, kind, 'Music');
  await page.getByRole('button', { name: 'Search sounds', exact: true }).click();
  await expect(page.getByText(/Live music search is temporarily unavailable/)).toBeVisible();
  await page.getByRole('button', { name: /Action music loop with dark ambient drones/ }).click();
  const audio = page.locator('.sound-library audio'); await expect(audio).toHaveAttribute('src', '/audio/action-ambient-155139.mp3'); await audio.evaluate(node => (node as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(node => (node as HTMLAudioElement).duration)).toBeGreaterThan(29);
  await expect.poll(() => audio.evaluate(node => (node as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
  await page.getByRole('checkbox', { name: 'I checked the source and can use this sound.' }).check();
  await page.getByRole('button', { name: 'Use this sound', exact: true }).click();
  await expect(page.getByLabel('Soundtrack offset', { exact: true })).toBeVisible();
  await expect(page.getByText('Action music loop with dark ambient drones added to your local soundtrack.', { exact: true })).toBeVisible();
});

test('same-origin live catalog route returns validated data or an explicit starter state', async ({ request }) => {
  const response = await request.get('/api/music/search?q=ambient', { timeout: 15000 });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(['live', 'starter']).toContain(body.mode);
  expect(Array.isArray(body.results)).toBe(true);
  if (body.mode === 'starter') { expect(body.results).toEqual([]); expect(body.notice).toContain('temporarily unavailable'); }
  else for (const track of body.results) { expect(track.license).toBe('cc0'); expect(new URL(track.url).hostname).toBe('cdn.freesound.org'); }
});
