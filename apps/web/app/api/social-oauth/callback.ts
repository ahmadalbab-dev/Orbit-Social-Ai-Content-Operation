import { apiOrigin } from '../../orbit/api-origin';
const noncePattern = /^[A-Za-z0-9_-]{43}$/;
async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw Error('Empty callback response');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > 8192) throw Error('Callback response too large'); chunks.push(next.value); }
    const all = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(all));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
/** Provider codes and browser binding stay on the servers, never in client JavaScript. */
export async function socialOAuthCallback(request: Request, family: string, fetcher: typeof fetch = fetch) {
  if (family !== 'meta' && family !== 'threads' && family !== 'tiktok') return new Response(null, {status:404});
  const cookieName = `orbit_oauth_${family}`;
  const nonce = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const query = new URL(request.url).searchParams;
  let status = 'failed', provider = family === 'meta' ? 'facebook' : family;
  const base = apiOrigin(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV === 'production');
  try {
    const state = query.get('state'), code = query.get('code'), error = query.get('error');
    if (!base || !nonce || !noncePattern.test(nonce) || !state || !noncePattern.test(state) || query.getAll('state').length !== 1 || query.getAll('code').length > 1 || query.getAll('error').length > 1 || (code ? code.length > 2048 || Boolean(error) : !error || error.length > 200)) throw Error('Invalid callback');
    const response = await fetcher(`${base}/v1/oauth/${family}/callback`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({state, ...(code ? {code} : {error}), browserNonce:nonce}), cache:'no-store', redirect:'error', credentials:'omit', signal:AbortSignal.timeout(45000)});
    if (!response.ok) {await response.body?.cancel(); throw Error('OAuth failed');}
    const data = await boundedJson(response) as {provider?:unknown;status?:unknown};
    if ((family === 'tiktok' && data.provider === 'tiktok') || (family === 'threads' && data.provider === 'threads') || (family === 'meta' && (data.provider === 'facebook' || data.provider === 'instagram'))) {provider = data.provider; if (data.status === 'connected') status = 'connected';}
  } catch { /* The fixed redirect carries no provider error text, codes, or tokens. */ }
  return new Response(null,{status:303,headers:{Location:`/?oauth=${status}&provider=${provider}`,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Set-Cookie':`${cookieName}=; Path=/api/social-oauth; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`}});
}
