import { describe, expect, it, vi } from 'vitest';
import { GEMINI_IMAGE_ENDPOINT, GEMINI_IMAGE_MODEL, GeminiImageEditor, parseGeminiImageResponse } from './gemini-image';
const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
const input = { imageDataUrl: `data:image/png;base64,${png.toString('base64')}`, prompt: 'Keep this product. Create a natural studio background.' };
const image = { type: 'image', mime_type: 'image/png', data: png.toString('base64') };
const result = (content: unknown[] = [image]) => ({ id: 'interaction-fixture', object: 'interaction', status: 'completed', steps: [{ type: 'model_output', content }] });
describe('Gemini image Interactions REST adapter', () => {
  it('sends fixed endpoint/model, inline source and prompt; parses model_output image blocks rather than SDK convenience properties', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result([{ type: 'text', text: 'Here is your image.' }, image])));
    const output = await new GeminiImageEditor('gemini_fixture', fetcher).edit(input);
    expect(Buffer.from(output.bytes)).toEqual(png); expect(output.contentType).toBe('image/png'); expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0]; expect(url).toBe(GEMINI_IMAGE_ENDPOINT); expect(request.redirect).toBe('error'); expect(request.headers['x-goog-api-key']).toBe('gemini_fixture');
    expect(JSON.parse(request.body)).toEqual({ model: GEMINI_IMAGE_MODEL, input: [{ type: 'image', mime_type: 'image/png', data: png.toString('base64') }, { type: 'text', text: input.prompt }], response_format: { type: 'image', mime_type: 'image/jpeg', image_size: '1K', delivery: 'inline' }, store: false }); expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([[401,'access_denied'],[403,'access_denied'],[402,'credits_unavailable'],[429,'rate_limited'],[400,'request_rejected'],[503,'unavailable']] as const)('classifies HTTP %s without leaking provider bodies or retrying', async (status, code) => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret upstream response', { status }));
    await expect(new GeminiImageEditor('key_fixture', fetcher).edit(input)).rejects.toMatchObject({ code }); expect(fetcher).toHaveBeenCalledOnce();
  });
  it('rejects remote output URLs, incomplete results, SDK-only fields, incorrect MIME and ambiguous image counts', () => {
    for (const value of [{ ...result(), status: 'incomplete' }, { output_image: image }, result([{ type: 'image', mime_type: 'image/png', uri: 'https://example.com/image' }]), result([{ ...image, mime_type: 'image/jpeg' }]), result([image,image]), result([{ type: 'text', text: 'Cannot comply' }]), result([{ ...image, data: '%%%%' }])]) expect(() => parseGeminiImageResponse(value)).toThrow();
  });
  it('bounds decoded output and streamed JSON bytes, regardless of content length', async () => {
    expect(() => parseGeminiImageResponse(result([{ ...image, data: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }]))).toThrow();
    const chunk = new Uint8Array(1024 * 1024), cancel = vi.fn();
    const body = new ReadableStream({ start(controller) { for (let i = 0; i < 7; i++) controller.enqueue(chunk); }, cancel });
    const fetcher = vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/json' } }));
    await expect(new GeminiImageEditor('key_fixture', fetcher).edit(input)).rejects.toMatchObject({ code: 'invalid_response' }); expect(cancel).toHaveBeenCalled();
  });
  it('validates key and source before any remote dispatch', async () => {
    const fetcher = vi.fn(); await expect(new GeminiImageEditor('key\nfixture', fetcher).edit(input)).rejects.toMatchObject({ code: 'unconfigured' });
    await expect(new GeminiImageEditor('key_fixture', fetcher).edit({ ...input, imageDataUrl: 'https://example.com/photo.png' })).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('maps timeout and network failures to safe errors', async () => {
    for (const [error, code] of [[new DOMException('secret timeout', 'TimeoutError'),'timeout'],[Error('secret network config'),'unavailable']] as const) await expect(new GeminiImageEditor('key_fixture', vi.fn().mockRejectedValue(error)).edit(input)).rejects.toMatchObject({ code });
  });
});
