import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../xweather.js';

describe('xweather provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.XWEATHER_CLIENT_ID;
    delete process.env.XWEATHER_CLIENT_SECRET;
  });

  it('builds URL with canonical query ordering and auth', () => {
    process.env.XWEATHER_CLIENT_ID = 'id';
    process.env.XWEATHER_CLIENT_SECRET = 'secret';
    const url = buildRequest({
      endpoint: 'observations',
      params: { c: '3', a: '1', b: '2' },
    });
    expect(url).toBe(
      'https://api.aerisapi.com/observations?a=1&b=2&c=3&client_id=id&client_secret=secret'
    );
  });

  it('calls fetch without headers', async () => {
    process.env.XWEATHER_CLIENT_ID = 'id';
    process.env.XWEATHER_CLIENT_SECRET = 'secret';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ endpoint: 'observations', params: {} });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
