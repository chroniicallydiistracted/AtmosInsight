import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../planetary-computer.js';

describe('planetary computer provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds search request', () => {
    const req = buildRequest({
      bbox: [1, 2, 3, 4],
      datetime: '2020-01-01',
      collections: ['c'],
    });
    expect(req.url).toBe(
      'https://planetarycomputer.microsoft.com/api/stac/v1/search'
    );
    expect(req.body).toEqual({
      bbox: [1, 2, 3, 4],
      datetime: '2020-01-01',
      collections: ['c'],
    });
  });

  it('posts JSON body', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const req = buildRequest({
      bbox: [1, 2, 3, 4],
      datetime: '2020-01-01',
      collections: ['c'],
    });
    await fetchJson(req);
    expect(mock).toHaveBeenCalledWith(req.url, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: expect.any(AbortSignal)
    }));
  });
});
