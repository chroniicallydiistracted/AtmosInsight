import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../nexrad.js';

describe('nexrad provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds object key', () => {
    const datetime = new Date(Date.UTC(2025, 7, 29, 0, 26, 12));
    const url = buildRequest({ station: 'KABR', datetime });
    expect(url).toMatchInlineSnapshot(
      '"https://noaa-nexrad-level2.s3.amazonaws.com/2025/08/29/KABR/KABR20250829_002612_V06"'
    );
  });

  it('fetches array buffer', async () => {
    const mock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
    });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ station: 'KABR', datetime: new Date(0) });
    await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
