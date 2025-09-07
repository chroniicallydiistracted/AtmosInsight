import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../msc.js';

describe('msc provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds path URL', () => {
    const url = buildRequest({ path: 'wms' });
    expect(url).toBe('https://geo.weather.gc.ca/geomet/wms');
  });

  it('fetches JSON', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ path: 'wms' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
