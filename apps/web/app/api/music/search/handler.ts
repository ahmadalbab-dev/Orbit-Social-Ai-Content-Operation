import { librarySounds } from '../../../orbit/sound-library-api';
import { createOpenverseAuth, OpenverseAuthError } from './openverse-auth';
const catalogueToken = createOpenverseAuth();
const ENDPOINT = 'https://api.openverse.org/v1/audio/';
const MAX_JSON = 512 * 1024;
const cache = new Map<string, { expires: number; body: unknown }>();
let active = 0;
async function json(response: Response) {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) { await response.body?.cancel(); throw Error('Invalid catalogue response'); }
  const reader = response.body?.getReader(); if (!reader) throw Error('Empty catalogue response');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > MAX_JSON) throw Error('Catalogue response too large'); chunks.push(chunk.value); } }
  finally { await reader.cancel().catch(() => {}); }
  const data = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
function reply(body: unknown, status = 200, cacheable = true) { return Response.json(body, { status, headers: { 'Cache-Control': status === 200 && cacheable ? 'public, max-age=30, s-maxage=60' : 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
/** Public read-only catalogue: fixed provider, fixed CC0 source, no forwarded cookies or arbitrary URLs. */
export async function searchMusic(request: Request, fetcher: typeof fetch = fetch) {
  const params = new URL(request.url).searchParams, terms = params.getAll('q');
  if (terms.length !== 1 || [...params.keys()].some(key => key !== 'q') || !terms[0].trim() || terms[0].length > 80 || /[\x00-\x1f\x7f]/.test(terms[0])) return reply({ message: 'Enter a sound search of 1–80 characters.' }, 400);
  const term = terms[0].trim().toLowerCase(), saved = cache.get(term);
  if (saved && saved.expires > Date.now()) return reply(saved.body);
  const unavailable = { results: [], mode: 'starter', notice: 'Live music search is temporarily unavailable. The included CC0 starter tracks below are ready to preview and use.' };
  const requestId = crypto.randomUUID();
  const degraded = (reason: string, upstreamStatus?: number) => {
    console.warn('orbit.music.search', {requestId, reason, ...(upstreamStatus === undefined ? {} : {upstreamStatus})});
    return reply({...unavailable, reason, requestId}, 200, false);
  };
  if (active >= 4) return degraded('capacity');
  let reason = 'network', upstreamStatus: number | undefined;
  const signal = AbortSignal.timeout(8000);
  active++;
  try {
    const url = new URL(ENDPOINT); url.search = new URLSearchParams({ q: term, license: 'cc0', source: 'freesound', page_size: '40' }).toString();
    const token = await catalogueToken({clientId: process.env.OPENVERSE_CLIENT_ID, clientSecret: process.env.OPENVERSE_CLIENT_SECRET}, fetcher, signal);
    const response = await fetcher(url.href, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal, headers: { Accept: 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {}) } });
    if (!response.ok) { if (response.status === 401 && token) catalogueToken.invalidate(token); upstreamStatus = response.status; reason = response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'access_denied' : 'upstream'; await response.body?.cancel(); throw Error('Catalogue unavailable'); }
    reason = 'invalid_response';
    const tracks = librarySounds(await json(response));
    const body = { mode: 'live', results: tracks.map(track => ({ id: track.id, title: track.title, creator: track.creator, url: track.url, foreign_landing_url: track.source, license: 'cc0', license_url: track.license, source: 'freesound', mature: false })) };
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    cache.set(term, { expires: Date.now() + 60000, body }); return reply(body);
  } catch (error) { return degraded(signal.aborted ? 'timeout' : error instanceof OpenverseAuthError ? error.reason : reason, upstreamStatus); }
  finally { active--; }
}
