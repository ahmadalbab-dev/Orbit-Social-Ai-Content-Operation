export type LibrarySound = { id: string; title: string; creator: string; url: string; source: string; license: string; extension: string };
const MAX_BYTES = 20 * 1024 * 1024;
function safeUrl(value: unknown, host: string, prefix: string) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password && url.pathname.startsWith(prefix) ? url : null; } catch { return null; }
}
/** Only CC0 Commons audio or Freesound preview MP3 enters the existing local decoder. Never proxy arbitrary URLs. */
export function librarySounds(input: unknown): LibrarySound[] {
  const rows = (input as { results?: unknown[] })?.results;
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 40).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const freesound = row.source === 'freesound';
    const url = safeUrl(row.url, freesound ? 'cdn.freesound.org' : 'upload.wikimedia.org', freesound ? '/previews/' : '/wikipedia/commons/');
    const source = safeUrl(row.foreign_landing_url, freesound ? 'freesound.org' : 'commons.wikimedia.org', freesound ? '/people/' : '/');
    const previewId = url?.pathname.match(/^\/previews\/\d+\/(\d+)_\d+-hq\.mp3$/)?.[1];
    const sourceId = source?.pathname.match(/^\/people\/[^/]+\/sounds\/(\d+)\/?$/)?.[1];
    if (freesound && (!previewId || previewId !== sourceId)) return [];
    const license = safeUrl(row.license_url, 'creativecommons.org', '/publicdomain/zero/1.0/');
    const extension = url?.pathname.match(/\.(mp3|wav|m4a|aac|ogg|oga|webm)$/i)?.[1]?.toLowerCase();
    if (row.license !== 'cc0' || !['wikimedia_audio', 'freesound'].includes(String(row.source)) || row.mature !== false || row.category === 'pronunciation' || !url || !source || !license || !extension || typeof row.id !== 'string' || typeof row.title !== 'string' || (typeof row.filesize === 'number' && row.filesize > MAX_BYTES) || (typeof row.duration === 'number' && row.duration > 600_000)) return [];
    return [{ id: row.id.slice(0, 100), title: row.title.slice(0, 160), creator: typeof row.creator === 'string' ? row.creator.slice(0, 160) : 'Wikimedia contributor', url: url.href, source: source.href, license: license.href, extension: extension === 'oga' ? 'ogg' : extension }];
  }).slice(0, 12);
}
export async function boundedAudioFile(track: LibrarySound, signal: AbortSignal): Promise<File> {
  const response = await fetch(track.url, { signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
  if (!response.ok || !response.body) throw Error('This sound could not be downloaded. Choose another result.');
  const type = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!type.startsWith('audio/') && type !== 'application/ogg' && type !== 'application/octet-stream') { await response.body.cancel(); throw Error('The source did not return an audio file.'); }
  if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body.cancel(); throw Error('Choose audio smaller than 20 MB.'); }
  const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > MAX_BYTES) throw Error('Choose audio smaller than 20 MB.'); chunks.push(new Uint8Array(next.value)); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  signal.throwIfAborted();
  const name = track.title.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 100).replace(/\.[a-z0-9]+$/i, '') || 'Library sound';
  return new File(chunks, `${name}.${track.extension}`, { type: type || `audio/${track.extension}` });
}
