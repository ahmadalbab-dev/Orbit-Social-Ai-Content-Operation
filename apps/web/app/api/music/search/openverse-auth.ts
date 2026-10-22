const TOKEN_ENDPOINT = 'https://api.openverse.org/v1/auth_tokens/token/';
const MAX_TOKEN_RESPONSE = 16 * 1024;
type Credentials = { clientId?: string; clientSecret?: string };
export class OpenverseAuthError extends Error {
  constructor(readonly reason: 'auth_configuration' | 'auth_unavailable') { super('Music catalogue authentication unavailable'); }
}
/** One server-side token cache per handler; never accepts credentials from the browser. */
export function createOpenverseAuth() {
  let saved: { id: string; secret: string; token: string; expires: number } | undefined;
  let pending: { id: string; secret: string; promise: Promise<string> } | undefined;
  const resolve = async (credentials: Credentials, fetcher: typeof fetch, signal: AbortSignal): Promise<string | undefined> => {
    const { clientId, clientSecret } = credentials;
    if (!clientId && !clientSecret) return undefined;
    if (!clientId || !clientSecret || clientId.length > 512 || clientSecret.length > 2048 || /[\x00-\x20\x7f]/.test(clientId + clientSecret)) throw new OpenverseAuthError('auth_configuration');
    if (saved?.id === clientId && saved.secret === clientSecret && saved.expires > Date.now()) return saved.token;
    if (pending?.id === clientId && pending.secret === clientSecret) return pending.promise;
    const promise = (async () => {
      try {
        const response = await fetcher(TOKEN_ENDPOINT, {
          method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal,
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
        });
        if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json')) { await response.body?.cancel(); throw new Error(); }
        const reader = response.body?.getReader(); if (!reader) throw new Error();
        const chunks: Uint8Array[] = []; let size = 0;
        try {
          for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > MAX_TOKEN_RESPONSE) throw new Error(); chunks.push(chunk.value); }
        } finally { await reader.cancel().catch(() => {}); }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!data || typeof data !== 'object') throw new Error();
        const { access_token: token, token_type: tokenType, expires_in: expires } = data as Record<string, unknown>;
        if (typeof token !== 'string' || !/^[A-Za-z0-9._~+\/-]{1,4096}={0,2}$/.test(token) || typeof tokenType !== 'string' || tokenType.toLowerCase() !== 'bearer' || typeof expires !== 'number' || !Number.isFinite(expires) || expires <= 60) throw new Error();
        saved = { id: clientId, secret: clientSecret, token, expires: Date.now() + (Math.min(expires, 86400) - 60) * 1000 };
        return token;
      } catch { throw new OpenverseAuthError('auth_unavailable'); }
    })();
    const entry = { id: clientId, secret: clientSecret, promise }; pending = entry;
    try { return await promise; } finally { if (pending === entry) pending = undefined; }
  };
  return Object.assign(resolve, {invalidate(token: string) { if (saved?.token === token) saved = undefined; }});
}
