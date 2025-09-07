import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../cmr-stac.js';

describe('cmr-stac provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EARTHDATA_TOKEN;
  });

  it('builds search request body', () => {
    const req = buildRequest({
      catalog: 'LANCE',
      bbox: [1, 2, 3, 4],
      datetime: '2024-01-01/2024-01-02',
      collections: ['MODIS'],
    });
    expect(req.url).toBe('https://cmr.earthdata.nasa.gov/stac/LANCE/search');
    expect(req.body).toEqual({
      bbox: [1, 2, 3, 4],
      datetime: '2024-01-01/2024-01-02',
      collections: ['MODIS'],
    });
  });

  it('adds Authorization header when token present', async () => {
    process.env.EARTHDATA_TOKEN = 'token';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const { url, body } = buildRequest({
      catalog: 'LANCE',
      bbox: [1, 2, 3, 4],
    });
    await fetchJson(url, body);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ bbox: [1, 2, 3, 4] }),
      signal: expect.any(AbortSignal)
    }));
  });

  it('omits Authorization header when token missing', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const { url, body } = buildRequest({
      catalog: 'LANCE',
      bbox: [1, 2, 3, 4],
    });
    await fetchJson(url, body);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bbox: [1, 2, 3, 4] }),
      signal: expect.any(AbortSignal)
    }));
  });
});
