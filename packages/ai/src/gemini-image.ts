import { AiProviderError, aiProviderResponseError, readBoundedAiJson } from './huggingface.js';
import { validateImageEdit } from './huggingface-image.js';
/** REST schema: https://ai.google.dev/api/interactions-api (v1beta, 2026-10-19). */
export const GEMINI_IMAGE_MODEL = 'gemini-nano-banana-2.1';
export const GEMINI_IMAGE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_OUTPUT = 4 * 1024 * 1024;
const MAX_RESPONSE = Math.ceil(MAX_OUTPUT / 3) * 4 + 65536;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function imageMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP') return 'image/webp';
}
export function parseGeminiImageResponse(value: unknown): { bytes: Uint8Array; contentType: string } {
  if (!object(value) || value.status !== 'completed' || !Array.isArray(value.steps)) throw new AiProviderError('invalid_response');
  const images: Record<string, unknown>[] = [];
  for (const step of value.steps) {
    if (!object(step) || step.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (const content of step.content) if (object(content) && content.type === 'image') images.push(content);
  }
  // The adapter requests a single image. Ambiguous/multiple results never silently replace the editor.
  if (images.length !== 1) throw new AiProviderError('invalid_response');
  const image = images[0], data = image.data;
  if (typeof data !== 'string' || !data.length || data.length > Math.ceil(MAX_OUTPUT / 3) * 4 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new AiProviderError('invalid_response');
  const bytes = Buffer.from(data, 'base64'), contentType = imageMime(bytes);
  if (bytes.length > MAX_OUTPUT || bytes.toString('base64') !== data || !contentType || contentType !== image.mime_type) throw new AiProviderError('invalid_response');
  return { bytes, contentType };
}
export class GeminiImageEditor {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}
  async edit(value: unknown) {
    const input = validateImageEdit(value);
    if (!this.apiKey.trim() || /[\r\n]/.test(this.apiKey)) throw new AiProviderError('unconfigured');
    const [, mimeType, data] = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(input.imageDataUrl)!;
    try {
      const response = await this.fetcher(GEMINI_IMAGE_ENDPOINT, {
        method: 'POST', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(45000),
        headers: { 'x-goog-api-key': this.apiKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: GEMINI_IMAGE_MODEL, input: [{ type: 'image', mime_type: mimeType, data }, { type: 'text', text: input.prompt }], response_format: { type: 'image', mime_type: 'image/jpeg', image_size: '1K', delivery: 'inline' }, store: false }),
      });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); throw aiProviderResponseError(response.status); }
      if (!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '') || Number(response.headers.get('content-length')) > MAX_RESPONSE) { await response.body?.cancel().catch(() => {}); throw new AiProviderError('invalid_response'); }
      return parseGeminiImageResponse(await readBoundedAiJson(response, MAX_RESPONSE));
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new AiProviderError('timeout');
      throw new AiProviderError('unavailable');
    }
  }
}
