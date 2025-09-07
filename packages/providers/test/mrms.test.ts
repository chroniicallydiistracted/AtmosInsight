import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../mrms.js';

describe('noaa-mrms provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds tile URL', () => {
    const dt = new Date(Date.UTC(2024, 0, 2, 3, 4));
    const url = buildRequest({ product: 'PrecipRate', datetime: dt });
    expect(url).toBe(
      'https://noaa-mrms-pds.s3.amazonaws.com/PrecipRate/20240102/PrecipRate_20240102-0304_GEO.tif'
    );
  });

  it('fetches tile binary', async () => {
    const dt = new Date(Date.UTC(2024, 0, 2, 3, 4));
    const url = buildRequest({ product: 'PrecipRate', datetime: dt });
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    // @ts-ignore
    global.fetch = mock;
    await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
