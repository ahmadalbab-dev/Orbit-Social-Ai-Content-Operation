import { AiProviderError, aiProviderResponseError, readBoundedAiJson } from './huggingface.js';
import { validateImageEdit } from './huggingface-image.js';

/** Workers AI REST multipart contract, checked 2026-10-22:
 * https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
 * https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/
 * The caller shares a reduced reference smaller than 512px on each edge.
 */
export const CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_OUTPUT = 4 * 1024 * 1024;
const MAX_ENCODED_OUTPUT = Math.ceil(MAX_OUTPUT / 3) * 4;
const MAX_RESPONSE = MAX_ENCODED_OUTPUT + 65536;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function imageMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP') return 'image/webp';
}

/** REST wraps the model's {image: base64} output inside result. Never fetch output URLs. */
export function parseCloudflareImageResponse(value: unknown): { bytes: Uint8Array; contentType: string } {
  if (!object(value) || (value.success !== undefined && value.success !== true) || (value.errors !== undefined && (!Array.isArray(value.errors) || value.errors.length !== 0)) || !object(value.result)) throw new AiProviderError('invalid_response');
  const data = value.result.image;
  if (typeof data !== 'string' || !data.length || data.length > MAX_ENCODED_OUTPUT || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new AiProviderError('invalid_response');
  const bytes = Buffer.from(data, 'base64'), contentType = imageMime(bytes);
  if (bytes.length > MAX_OUTPUT || bytes.toString('base64') !== data || !contentType) throw new AiProviderError('invalid_response');
  return { bytes, contentType };
}

export class CloudflareImageEditor {
  constructor(private readonly apiToken: string, private readonly accountId: string, private readonly fetcher: typeof fetch = fetch) {}
  async edit(value: unknown): Promise<{ bytes: Uint8Array; contentType: string }> {
    const input = validateImageEdit(value);
    const token = this.apiToken.trim(), accountId = this.accountId.trim();
    if (!token || token.length > 1024 || /[\r\n]/.test(this.apiToken + this.accountId) || /[^\x21-\x7e]/.test(token) || accountId.length !== 32 || !/^[a-f0-9]{32}$/i.test(accountId)) throw new AiProviderError('unconfigured');
    const [, mimeType, data] = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(input.imageDataUrl)!;
    const body = new FormData();
    body.append('prompt', input.prompt);
    body.append('input_image_0', new Blob([Buffer.from(data, 'base64')], { type: mimeType }), mimeType === 'image/png' ? 'reference.png' : 'reference.jpg');
    body.append('width', '1024');
    body.append('height', '1024');
    try {
      const response = await this.fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`, {
        method: 'POST', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(45000),
        // FormData sets its own multipart boundary. No AI Gateway/paid-provider fallback.
        headers: { Authorization: `Bearer ${token}` }, body,
      });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); throw aiProviderResponseError(response.status); }
      if (!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '') || Number(response.headers.get('content-length')) > MAX_RESPONSE) { await response.body?.cancel().catch(() => {}); throw new AiProviderError('invalid_response'); }
      return parseCloudflareImageResponse(await readBoundedAiJson(response, MAX_RESPONSE));
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new AiProviderError('timeout');
      throw new AiProviderError('unavailable');
    }
  }
}
