import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { socialOAuthCallback } from './callback';
const state='s'.repeat(43),nonce='n'.repeat(43);
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_API_URL','https://api.orbit.test');vi.stubEnv('NODE_ENV','production');});
afterEach(()=>vi.unstubAllEnvs());
function request(query=`state=${state}&code=private-code`,cookie=`orbit_oauth_meta=${nonce}`){return new Request(`https://web.orbit.test/api/social-oauth/meta/callback?${query}`,{headers:{Cookie:cookie}});}
it('exchanges the provider code server-side bound to the HttpOnly browser cookie',async()=>{
 const fetcher=vi.fn(async()=>Response.json({provider:'instagram',status:'connected'}));
 const response=await socialOAuthCallback(request(),'meta',fetcher);
 expect(fetcher).toHaveBeenCalledOnce();const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('https://api.orbit.test/v1/oauth/meta/callback');expect(JSON.parse(init.body as string)).toEqual({state,code:'private-code',browserNonce:nonce});expect(init.redirect).toBe('error');expect(new Headers(init.headers).get('cookie')).toBeNull();
 expect(response.headers.get('location')).toBe('/?oauth=connected&provider=instagram');expect(response.headers.get('set-cookie')).toContain('Max-Age=0');expect(response.headers.get('set-cookie')).toContain('Secure');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
});
it('rejects missing browser binding, duplicate state and external destinations without dispatch',async()=>{
 const fetcher=vi.fn();for(const req of [request(undefined,''),request(`state=${state}&state=${state}&code=x`),request('state=https://evil.test&code=x')])expect((await socialOAuthCallback(req,'meta',fetcher)).headers.get('location')).toBe('/?oauth=failed&provider=facebook');expect(fetcher).not.toHaveBeenCalled();
});
it('does not leak provider diagnostics or tokens into redirect URLs',async()=>{
 const fetcher=vi.fn(async()=>new Response('secret-token',{status:500}));const response=await socialOAuthCallback(request(),'meta',fetcher);expect(response.headers.get('location')).toBe('/?oauth=failed&provider=facebook');expect(await response.text()).toBe('');
});
it('bounds upstream output and requires a matching provider family',async()=>{
 for(const body of ['x'.repeat(8193),JSON.stringify({provider:'threads',status:'connected'})]){const response=await socialOAuthCallback(request(),'meta',vi.fn(async()=>new Response(body)));expect(response.headers.get('location')).toContain('oauth=failed');}
});
it('binds TikTok callback to its browser cookie and matching provider',async()=>{
 const req=new Request(`https://web.orbit.test/api/social-oauth/tiktok/callback?state=${state}&code=private-code`,{headers:{cookie:`orbit_oauth_tiktok=${nonce}`}}),fetcher=vi.fn(async()=>Response.json({provider:'tiktok',status:'connected'}));
 const result=await socialOAuthCallback(req,'tiktok',fetcher);expect(result.headers.get('location')).toBe('/?oauth=connected&provider=tiktok');expect(result.headers.get('set-cookie')).toContain('orbit_oauth_tiktok=;');expect((fetcher.mock.calls[0] as unknown as [string,RequestInit])[0]).toBe('https://api.orbit.test/v1/oauth/tiktok/callback');
 const wrong=await socialOAuthCallback(req,'tiktok',vi.fn(async()=>Response.json({provider:'threads',status:'connected'})));expect(wrong.headers.get('location')).toBe('/?oauth=failed&provider=tiktok');
 const noCookie=await socialOAuthCallback(request(),'tiktok',fetcher);expect(noCookie.headers.get('location')).toBe('/?oauth=failed&provider=tiktok');expect(fetcher).toHaveBeenCalledOnce();
});
