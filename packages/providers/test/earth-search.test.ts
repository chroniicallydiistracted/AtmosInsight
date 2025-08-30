import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../earth-search.js';

describe('earth-search provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds search request', () => {
    const req = buildRequest({
      bbox: [1, 2, 3, 4],
      datetime: '2020-01-01/2020-02-01',
      collections: ['sentinel-2'],
    });
    expect(req).toEqual({
      url: 'https://earth-search.aws.element84.com/v1/search',
      body: {
        bbox: [1, 2, 3, 4],
        datetime: '2020-01-01/2020-02-01',
        collections: ['sentinel-2'],
      },
    });
  });

  it('posts JSON body', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const req = buildRequest({
      bbox: [1, 2, 3, 4],
      datetime: '2020-01-01/2020-02-01',
      collections: ['sentinel-2'],
    });
    await fetchJson(req);
    expect(mock).toHaveBeenCalledWith(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
  });
});
