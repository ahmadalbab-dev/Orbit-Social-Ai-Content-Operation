import { describe, expect, it, vi } from 'vitest';
import { MetaApiError, MetaPublisher, type MetaAccount } from './meta';
const account = (platform: MetaAccount['platform']): MetaAccount => platform === 'FACEBOOK'
  ? { platform, kind: 'PAGE', id: '123' } : platform === 'INSTAGRAM'
  ? { platform, kind: 'PROFESSIONAL', id: '123' } : { platform, kind: 'USER', id: '123' };
function setup(platform: MetaAccount['platform'], bodies: unknown[]) {
  const fetcher = vi.fn<typeof fetch>();
  for (const body of bodies) fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));
  return { api: new MetaPublisher({ account: account(platform), apiVersion: platform === 'THREADS' ? 'v1.0' : 'v23.0', accessToken: 'secret-test-token', fetch: fetcher }), fetcher };
}
const bodyAt = (fetcher: ReturnType<typeof setup>['fetcher'], index = 0) => new URLSearchParams(String(fetcher.mock.calls[index]?.[1]?.body));
describe('server-only Meta publishing primitives', () => {
  it('sends Page text via feed with credentials only in headers', async () => {
    const { api, fetcher } = setup('FACEBOOK', [{ id: '123_456' }]);
    expect(await api.publishFacebook({ text: 'Hello KL' })).toEqual({ externalId: '123_456' });
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://graph.facebook.com/v23.0/123/feed');
    expect(bodyAt(fetcher).get('message')).toBe('Hello KL');
    expect(bodyAt(fetcher).has('access_token')).toBe(false);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer secret-test-token' });
  });
  it('publishes single Page photo without attempting Facebook video', async () => {
    const { api, fetcher } = setup('FACEBOOK', [{ id: '456' }]);
    await api.publishFacebook({ text: 'KL', media: { type: 'IMAGE', url: 'https://cdn.example.com/kl.jpg' } });
    expect(fetcher.mock.calls[0]?.[0]).toContain('/123/photos');
    expect(bodyAt(fetcher).get('url')).toBe('https://cdn.example.com/kl.jpg');
    expect(bodyAt(fetcher).get('caption')).toBe('KL');
    await expect(api.publishFacebook({ text: 'KL', media: { type: 'VIDEO', url: 'https://cdn.example.com/kl.mp4' } })).rejects.toThrow('not implemented');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['IMAGE', 'VIDEO'] as const)('creates Instagram %s container and requires explicit ready check', async type => {
    const { api, fetcher } = setup('INSTAGRAM', [{ id: '456' }, { status_code: 'FINISHED' }, { id: '789' }]);
    expect(await api.createContainer({ text: 'KL', media: { type, url: 'https://cdn.example.com/media' } })).toEqual({ containerId: '456' });
    expect(bodyAt(fetcher).get(type === 'IMAGE' ? 'image_url' : 'video_url')).toBe('https://cdn.example.com/media');
    expect(bodyAt(fetcher).get('media_type')).toBe(type === 'VIDEO' ? 'REELS' : null);
    expect(await api.publishContainer('456')).toEqual({ state: 'PUBLISHED', containerId: '456', externalId: '789' });
    expect(fetcher.mock.calls[1]?.[0]).toContain('/456?fields=status_code');
    expect(fetcher.mock.calls[2]?.[0]).toContain('/123/media_publish');
    expect(bodyAt(fetcher, 2).get('creation_id')).toBe('456');
  });
  it.each(['TEXT', 'IMAGE', 'VIDEO'] as const)('creates Threads %s and uses Threads publication endpoint', async type => {
    const { api, fetcher } = setup('THREADS', [{ id: '456' }, { status: 'FINISHED' }, { id: '789' }]);
    await api.createContainer({ text: 'KL', ...(type === 'TEXT' ? {} : { media: { type, url: 'https://cdn.example.com/media' } }) });
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://graph.threads.net/v1.0/123/threads');
    expect(bodyAt(fetcher).get('media_type')).toBe(type);
    if (type === 'TEXT') expect(bodyAt(fetcher).get('auto_publish_text')).toBe('false');
    await api.publishContainer('456');
    expect(fetcher.mock.calls[1]?.[0]).toContain('fields=status');
    expect(fetcher.mock.calls[2]?.[0]).toContain('/threads_publish');
  });
  it.each([['IN_PROGRESS', 'PENDING'], ['PUBLISHED', 'PUBLISHED'], ['ERROR', 'FAILED'], ['EXPIRED', 'FAILED'], ['OTHER', 'UNKNOWN']] as const)('does not republish when container is %s', async (providerState, state) => {
    const { api, fetcher } = setup('INSTAGRAM', [{ status_code: providerState }]);
    expect(await api.publishContainer('456')).toEqual({ containerId: '456', state });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['http://cdn.example.com/a', 'https://localhost/a', 'https://127.0.0.1/a', 'https://[::1]/a', 'https://host.internal/a', 'https://user:password@example.com/a'])('rejects non-public URL %s before requests', async url => {
    const { api, fetcher } = setup('INSTAGRAM', []);
    await expect(api.createContainer({ text: 'KL', media: { type: 'IMAGE', url } })).rejects.toThrow('public HTTPS');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects invalid account, missing version, unsupported platform flow and missing Instagram media', async () => {
    expect(() => new MetaPublisher({ account: { platform: 'FACEBOOK', kind: 'USER', id: '123' } as unknown as MetaAccount, apiVersion: 'v23.0', accessToken: 'x' })).toThrow('account');
    expect(() => new MetaPublisher({ account: account('FACEBOOK'), apiVersion: '', accessToken: 'x' })).toThrow('version');
    const { api, fetcher } = setup('INSTAGRAM', []);
    await expect(api.publishFacebook({ text: 'KL' })).rejects.toThrow('Page');
    await expect(api.createContainer({ text: 'KL' })).rejects.toThrow('requires media');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('missing mutation response ID has uncertain outcome and no retry', async () => {
    const { api, fetcher } = setup('FACEBOOK', [{}]);
    await expect(api.publishFacebook({ text: 'KL' })).rejects.toMatchObject({ code: 'INVALID_RESPONSE', outcomeUncertain: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('sanitizes provider response and fetch exceptions with no token/cause leakage', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('secret-test-token provider private details', { status: 500 })).mockRejectedValueOnce(new Error('secret-test-token'));
    const api = new MetaPublisher({ account: account('FACEBOOK'), apiVersion: 'v23.0', accessToken: 'secret-test-token', fetch: fetcher });
    for (let i = 0; i < 2; i++) {
      try { await api.publishFacebook({ text: 'KL' }); throw new Error('expected rejection'); }
      catch (error) {
        expect(error).toBeInstanceOf(MetaApiError);
        expect(String(error)).not.toContain('secret-test-token');
        expect(JSON.stringify(error)).not.toContain('private');
        expect(error).toMatchObject({ outcomeUncertain: true });
      }
    }
  });
  it('bounds stuck transport with timeout, marks mutation uncertain and aborts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const api = new MetaPublisher({ account: account('FACEBOOK'), apiVersion: 'v23.0', accessToken: 'secret-test-token', fetch: fetcher, timeoutMs: 10 });
    await expect(api.publishFacebook({ text: 'KL' })).rejects.toMatchObject({ code: 'TRANSPORT', outcomeUncertain: true });
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
