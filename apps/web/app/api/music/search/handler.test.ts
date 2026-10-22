import { expect, it, vi } from 'vitest';
import { searchMusic } from './handler';
const row = { id: 'music', title: 'CC0 loop', creator: 'Artist', license: 'cc0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'freesound', mature: false, url: 'https://cdn.freesound.org/previews/155/155139_2098884-hq.mp3', foreign_landing_url: 'https://freesound.org/people/artist/sounds/155139/' };
const request = (query: string) => new Request(`https://orbit.test/api/music/search?${query}`, { headers: { cookie: 'private', authorization: 'Bearer private' } });
it('uses a fixed CC0 catalog destination without browser credentials and sanitizes results', async () => {
 const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [row, { ...row, license: 'by-nc', id: 'restricted' }] }));
 const response = await searchMusic(request('q=route-music'), fetcher); const body = await response.json();
 expect(body.mode).toBe('live'); expect(body.results).toHaveLength(1); expect(body.results[0].license).toBe('cc0');
 const [raw, init] = fetcher.mock.calls[0], url = new URL(raw); expect(url.origin + url.pathname).toBe('https://api.openverse.org/v1/audio/'); expect(url.searchParams.get('license')).toBe('cc0'); expect(url.searchParams.get('source')).toBe('freesound'); expect(init).toMatchObject({ credentials: 'omit', redirect: 'error' }); expect(new Headers(init.headers).has('authorization')).toBe(false); expect(new Headers(init.headers).has('cookie')).toBe(false);
 const second = vi.fn(); await searchMusic(request('q=route-music'), second); expect(second).not.toHaveBeenCalled();
});
it.each(['q=', 'q=a&q=b', 'q=a&url=https://evil.test', 'q=%00', 'q='+'a'.repeat(81)])('rejects invalid or arbitrary proxy input %s before dispatch', async query => {
 const fetcher = vi.fn(); expect((await searchMusic(request(query), fetcher)).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it.each([403, 429, 500])('reports catalog %s honestly while keeping local starter music usable', async status => {
 const fetcher = vi.fn().mockResolvedValue(new Response('secret upstream html', { status })); const body = await (await searchMusic(request(`q=error-${status}`), fetcher)).json();
 expect(body).toMatchObject({ mode: 'starter', results: [] }); expect(body.notice).toContain('temporarily unavailable'); expect(JSON.stringify(body)).not.toContain('secret');
});
it('bounds response bytes and cancels oversized catalog input', async () => {
 const cancel = vi.fn(), body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(524289)); }, cancel });
 const fetcher = vi.fn().mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
 expect(await (await searchMusic(request('q=oversized'), fetcher)).json()).toMatchObject({ mode: 'starter' }); expect(cancel).toHaveBeenCalled();
});
it('handles timeout or invalid upstream body without inventing search results', async () => {
 for (const [term, response] of [['html', new Response('<html>challenge</html>', { headers: { 'Content-Type': 'text/html' } })], ['broken', new Response('{', { headers: { 'Content-Type': 'application/json' } })]] as const) expect(await (await searchMusic(request(`q=${term}`), vi.fn().mockResolvedValue(response))).json()).toMatchObject({ mode: 'starter', results: [] });
 expect(await (await searchMusic(request('q=timeout'), vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')))).json()).toMatchObject({ mode: 'starter', results: [] });
});
it.each([[403,'access_denied'],[429,'rate_limited'],[500,'upstream']])('does not cache degraded %s responses or log private payloads',async(status,reason)=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 try{
  const response=await searchMusic(request(`q=private-input-${status}`),vi.fn().mockResolvedValue(new Response('secret-provider-body',{status:Number(status)})));
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toMatchObject({mode:'starter',reason,requestId:expect.any(String)});
  expect(warn).toHaveBeenCalledWith('orbit.music.search',{reason,upstreamStatus:status,requestId:expect.any(String)});
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private-input|secret-provider-body|Bearer/);
 }finally{warn.mockRestore();}
});
