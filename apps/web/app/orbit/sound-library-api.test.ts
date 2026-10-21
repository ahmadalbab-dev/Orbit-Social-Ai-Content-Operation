import { afterEach, expect, it, vi } from 'vitest';
import { boundedAudioFile, librarySounds } from './sound-library-api';
const row = { id: 'sound', title: 'Piano.wav', creator: 'Artist', url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Piano.wav', foreign_landing_url: 'https://commons.wikimedia.org/wiki/File:Piano.wav', license: 'cc0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en/', source: 'wikimedia_audio', mature: false, category: 'music', duration: 16000, filesize: 300 };
afterEach(() => vi.unstubAllGlobals());
it('accepts only supported CC0 Commons audio, excluding pronunciation and oversized files', () => {
  expect(librarySounds({ results: [row] })).toHaveLength(1);
  for (const patch of [{ license: 'by-nc' }, { source: 'freesound' }, { url: 'https://upload.wikimedia.org.evil.test/a.wav' }, { url: 'https://user@upload.wikimedia.org/wikipedia/commons/a.wav' }, { url: 'https://upload.wikimedia.org/wikipedia/commons/a.svg' }, { foreign_landing_url: 'https://evil.test/' }, { license_url: 'https://creativecommons.org/licenses/by/4.0/' }, { mature: true }, { category: 'pronunciation' }, { duration: 601000 }, { filesize: 21 * 1024 * 1024 }]) expect(librarySounds({ results: [{ ...row, ...patch }] })).toEqual([]);
});
it('streams a bounded audio file without forwarding credentials or following redirects', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/wav' } })); vi.stubGlobal('fetch', fetcher);
  const file = await boundedAudioFile(librarySounds({ results: [row] })[0], new AbortController().signal);
  expect(file.name).toBe('Piano.wav'); expect(file.size).toBe(3);
  expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
});
it('cancels an audio stream once its actual bytes exceed the limit', async () => {
  const cancel = vi.fn(); const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20 * 1024 * 1024)); controller.enqueue(new Uint8Array(1)); }, cancel });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': 'audio/wav' } })));
  await expect(boundedAudioFile(librarySounds({ results: [row] })[0], new AbortController().signal)).rejects.toThrow('20 MB'); expect(cancel).toHaveBeenCalled();
});

it('filters unsupported catalog entries before limiting selectable results', () => {
  const unsupported = Array.from({ length: 12 }, (_, index) => ({ ...row, id: `midi-${index}`, url: row.url.replace('.wav', '.mid') }));
  expect(librarySounds({ results: [...unsupported, row] })).toHaveLength(1);
  expect(librarySounds({ results: Array.from({ length: 40 }, (_, index) => ({ ...row, id: String(index) })) })).toHaveLength(12);
});
