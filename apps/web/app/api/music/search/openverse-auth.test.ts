import { afterEach, expect, it, vi } from 'vitest';
import { createOpenverseAuth } from './openverse-auth';
const credentials = { clientId: 'orbit-client', clientSecret: 'private-secret' };
afterEach(() => vi.useRealTimers());
it('leaves anonymous catalogue access available without requesting a token', async () => {
 const fetcher = vi.fn(); expect(await createOpenverseAuth()({}, fetcher, new AbortController().signal)).toBeUndefined(); expect(fetcher).not.toHaveBeenCalled();
});
it('uses fixed server-to-server form credentials and refreshes before expiry', async () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22'));
 const auth = createOpenverseAuth(), fetcher = vi.fn().mockImplementation(async () => Response.json({access_token:'catalogue-token',token_type:'Bearer',expires_in:3600}));
 const signal = new AbortController().signal;
 expect(await auth(credentials,fetcher,signal)).toBe('catalogue-token');
 const [url,init] = fetcher.mock.calls[0]; expect(url).toBe('https://api.openverse.org/v1/auth_tokens/token/');
 expect(init).toMatchObject({method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal});
 expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
 expect(new URLSearchParams(init.body).get('client_secret')).toBe(credentials.clientSecret);
 expect(await auth(credentials,fetcher,signal)).toBe('catalogue-token'); expect(fetcher).toHaveBeenCalledTimes(1);
 vi.advanceTimersByTime(3541_000); await auth(credentials,fetcher,signal); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('shares an in-flight token request and invalidates its cache when credentials rotate', async () => {
 const auth = createOpenverseAuth(), signal = new AbortController().signal;
 const fetcher = vi.fn().mockImplementation(async () => Response.json({access_token:'token',token_type:'Bearer',expires_in:3600}));
 await Promise.all([auth(credentials,fetcher,signal),auth(credentials,fetcher,signal)]); expect(fetcher).toHaveBeenCalledTimes(1);
 await auth({...credentials,clientSecret:'rotated-secret'},fetcher,signal); expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each([{clientId:'one'}, {clientSecret:'one'}, {...credentials,clientSecret:'bad\r\nheader'}])('rejects partial or unsafe credentials before dispatch',async config=>{
 const fetcher=vi.fn(); await expect(createOpenverseAuth()(config,fetcher,new AbortController().signal)).rejects.toMatchObject({reason:'auth_configuration'}); expect(fetcher).not.toHaveBeenCalled();
});
it.each([
 {access_token:'bad\r\nheader',token_type:'Bearer',expires_in:3600},
 {access_token:'valid',token_type:'Basic',expires_in:3600},
 {access_token:'valid',token_type:'Bearer',expires_in:0},
 {access_token:'valid',token_type:'Bearer',expires_in:'3600'},
])('rejects unsafe or malformed tokens without exposing credentials',async body=>{
 const fetcher=vi.fn().mockImplementation(async()=>Response.json(body));
 await expect(createOpenverseAuth()(credentials,fetcher,new AbortController().signal)).rejects.toMatchObject({message:'Music catalogue authentication unavailable',reason:'auth_unavailable'});
});
it('bounds token response and retries only on a later explicit search',async()=>{
 const auth=createOpenverseAuth(),cancel=vi.fn();
 const fetcher=vi.fn().mockImplementationOnce(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(16385));},cancel}),{headers:{'Content-Type':'application/json'}})).mockImplementationOnce(async()=>Response.json({access_token:'recovered',token_type:'Bearer',expires_in:3600}));
 await expect(auth(credentials,fetcher,new AbortController().signal)).rejects.toMatchObject({reason:'auth_unavailable'}); expect(cancel).toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
 expect(await auth(credentials,fetcher,new AbortController().signal)).toBe('recovered');
});
it('invalidates only a rejected matching token for the next explicit search',async()=>{
 const auth=createOpenverseAuth(),signal=new AbortController().signal;
 const fetcher=vi.fn().mockImplementation(async()=>Response.json({access_token:'current-token',token_type:'Bearer',expires_in:3600}));
 await auth(credentials,fetcher,signal);auth.invalidate('old-unrelated-token');await auth(credentials,fetcher,signal);expect(fetcher).toHaveBeenCalledTimes(1);
 auth.invalidate('current-token');await auth(credentials,fetcher,signal);expect(fetcher).toHaveBeenCalledTimes(2);
});
