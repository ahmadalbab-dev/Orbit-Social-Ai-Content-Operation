/** Server-only, low-level Meta APIs. Not registered in ConnectorRegistry.
 * OAuth, App Review, secret storage, approval and scheduling belong to the caller.
 * Persist each container ID before continuing. Meta mutations have no guaranteed
 * idempotency: never blindly retry a timeout, failed publish, or missing response ID.
 * Check/reconcile uncertain outcomes first. No method automatically reposts.
 * Endpoint references (Meta's own documentation/collections):
 * https://developers.facebook.com/documentation/pages-api/posts
 * https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
 * https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
 * HTTPS validation is syntactic; caller must provide its trusted public media
 * origin. This module does not verify DNS, file codecs, size or public reachability.
 */
export type MetaPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'THREADS';
export type MetaContent = { text: string; media?: { type: 'IMAGE' | 'VIDEO'; url: string } };
export type MetaAccount =
  | { platform: 'FACEBOOK'; kind: 'PAGE'; id: string }
  | { platform: 'INSTAGRAM'; kind: 'PROFESSIONAL'; id: string }
  | { platform: 'THREADS'; kind: 'USER'; id: string };
export type MetaContainerState = 'READY' | 'PENDING' | 'PUBLISHED' | 'FAILED' | 'UNKNOWN';
export class MetaApiError extends Error {
  constructor(readonly code: 'HTTP' | 'TRANSPORT' | 'INVALID_RESPONSE', readonly outcomeUncertain: boolean, readonly httpStatus?: number) {
    super(`Meta API ${code}${httpStatus === undefined ? '' : ` (${httpStatus})`}`);
    this.name = 'MetaApiError';
  }
}
export interface MetaPublisherOptions {
  account: MetaAccount;
  /** Inject from a server secret store, never browser input or public env vars. */
  accessToken: string;
  /** Explicit supported version, e.g. vNN.0; no moving default. */
  apiVersion: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}
const validId = (id: string) => /^[0-9]+(?:_[0-9]+)?$/.test(id);
function assertId(id: string) { if (!validId(id)) throw new Error('Invalid Meta identifier'); }
function assertMedia(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('Media must use a public HTTPS URL'); }
  const host = parsed.hostname.toLowerCase();
  // Conservative: public DNS names only. Provider must also be able to fetch the URL.
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port ||
      !host.includes('.') || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error('Media must use a public HTTPS URL');
  }
}
export class MetaPublisher {
  private readonly account: MetaAccount;
  private readonly token: string;
  private readonly base: string;
  private readonly transport: typeof fetch;
  private readonly timeoutMs: number;
  constructor(options: MetaPublisherOptions) {
    if (typeof window !== 'undefined') throw new Error('MetaPublisher must run on the server');
    const kinds = { FACEBOOK: 'PAGE', INSTAGRAM: 'PROFESSIONAL', THREADS: 'USER' };
    if (!options.account || kinds[options.account.platform] !== options.account.kind) throw new Error('Invalid Meta account platform or kind');
    assertId(options.account.id);
    if (!options.accessToken?.trim() || /[\r\n]/.test(options.accessToken)) throw new Error('A server access token is required');
    if (!/^v\d+\.\d+$/.test(options.apiVersion)) throw new Error('Explicit Meta API version required');
    this.account = { ...options.account };
    this.token = options.accessToken;
    // Instagram uses the Facebook Login route, not Instagram Login token types.
    this.base = `https://${this.account.platform === 'THREADS' ? 'graph.threads.net' : 'graph.facebook.com'}/${options.apiVersion}`;
    this.transport = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error('Invalid request timeout');
  }
  private validate(content: MetaContent) {
    if (typeof content.text !== 'string') throw new Error('Text required');
    if (content.media) {
      if (!['IMAGE', 'VIDEO'].includes(content.media.type)) throw new Error('Unsupported media');
      assertMedia(content.media.url);
    }
    if (!content.text.trim() && !content.media) throw new Error('Content required');
  }
  private async request(path: string, method: 'GET' | 'POST', values: Record<string, string>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const params = new URLSearchParams(values);
    const url = `${this.base}/${path}${method === 'GET' ? `?${params}` : ''}`;
    const operation = (async () => {
      const response = await this.transport(url, {
        method, signal: controller.signal, redirect: 'error',
        headers: { Authorization: `Bearer ${this.token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(method === 'POST' ? { body: params.toString() } : {}),
      });
      if (!response.ok) throw new MetaApiError('HTTP', method === 'POST' && response.status >= 500, response.status);
      let result: unknown;
      try { result = await response.json(); } catch { throw new MetaApiError('INVALID_RESPONSE', method === 'POST'); }
      if (!result || typeof result !== 'object' || Array.isArray(result) || 'error' in result) throw new MetaApiError('INVALID_RESPONSE', method === 'POST');
      return result as Record<string, unknown>;
    })();
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new MetaApiError('TRANSPORT', method === 'POST')); }, this.timeoutMs);
      })]);
    } catch (error) {
      if (error instanceof MetaApiError) throw error;
      // Never expose provider body, fetch error/cause, URLs, or credentials.
      throw new MetaApiError('TRANSPORT', method === 'POST');
    } finally { if (timer) clearTimeout(timer); }
  }
  private responseId(result: Record<string, unknown>): string {
    if (typeof result.id !== 'string' || !validId(result.id)) throw new MetaApiError('INVALID_RESPONSE', true);
    return result.id;
  }
  /** Publishes immediately. Caller must enforce approval, lock and persist outcome. */
  async publishFacebook(content: MetaContent): Promise<{ externalId: string }> {
    if (this.account.platform !== 'FACEBOOK') throw new Error('Facebook Page account required');
    this.validate(content);
    if (content.media?.type === 'VIDEO') throw new Error('Facebook video publishing not implemented');
    const result = await this.request(`${this.account.id}/${content.media ? 'photos' : 'feed'}`, 'POST', content.media
      ? { url: content.media.url, caption: content.text, published: 'true' }
      : { message: content.text });
    return { externalId: this.responseId(result) };
  }
  /** Persist returned ID before status checks or publication. */
  async createContainer(content: MetaContent): Promise<{ containerId: string }> {
    if (this.account.platform === 'FACEBOOK') throw new Error('Containers require Instagram or Threads');
    this.validate(content);
    if (this.account.platform === 'INSTAGRAM' && !content.media) throw new Error('Instagram requires media');
    const isThreads = this.account.platform === 'THREADS';
    const values: Record<string, string> = isThreads ? { text: content.text, media_type: content.media?.type ?? 'TEXT' } : { caption: content.text };
    if (isThreads && !content.media) values.auto_publish_text = 'false';
    if (content.media) {
      values[content.media.type === 'IMAGE' ? 'image_url' : 'video_url'] = content.media.url;
      if (!isThreads && content.media.type === 'VIDEO') values.media_type = 'REELS';
    }
    return { containerId: this.responseId(await this.request(`${this.account.id}/${isThreads ? 'threads' : 'media'}`, 'POST', values)) };
  }
  async checkContainer(containerId: string): Promise<{ containerId: string; state: MetaContainerState }> {
    if (this.account.platform === 'FACEBOOK') throw new Error('Containers require Instagram or Threads');
    assertId(containerId);
    const field = this.account.platform === 'THREADS' ? 'status' : 'status_code';
    const result = await this.request(containerId, 'GET', { fields: field });
    const state: MetaContainerState = result[field] === 'FINISHED' ? 'READY' : result[field] === 'IN_PROGRESS' ? 'PENDING'
      : result[field] === 'PUBLISHED' ? 'PUBLISHED' : ['ERROR', 'EXPIRED'].includes(String(result[field])) ? 'FAILED' : 'UNKNOWN';
    return { containerId, state };
  }
  /** Checks once. PENDING/UNKNOWN/PUBLISHED never trigger another publish call.
   * Caller must persist publish-attempt state BEFORE calling, and reconcile any
   * uncertain response before deciding whether a later attempt is safe.
   */
  async publishContainer(containerId: string): Promise<{ state: MetaContainerState; containerId: string; externalId?: string }> {
    const checked = await this.checkContainer(containerId);
    if (checked.state !== 'READY') return checked;
    const result = await this.request(`${this.account.id}/${this.account.platform === 'THREADS' ? 'threads_publish' : 'media_publish'}`, 'POST', { creation_id: containerId });
    return { containerId, state: 'PUBLISHED', externalId: this.responseId(result) };
  }
}
