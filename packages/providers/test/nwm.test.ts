import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../nwm.js';

describe('noaa-nwm provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds key path for analysis_assim', () => {
    const dt = new Date(Date.UTC(2025, 0, 1, 12));
    const url = buildRequest({ product: 'analysis_assim', datetime: dt });
    expect(url).toBe(
      'https://noaa-nwm-pds.s3.amazonaws.com/analysis_assim/2025010112/'
    );
  });

  it('fetches binary tile', async () => {
    const mock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      product: 'analysis_assim',
      datetime: new Date(Date.UTC(2025, 0, 1, 12)),
    });
    await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
