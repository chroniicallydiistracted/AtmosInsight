import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../smhi.js';

describe('smhi provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds point forecast URL', () => {
    const url = buildRequest({ lon: 18.06, lat: 59.33 });
    expect(url).toBe('https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/18.06/lat/59.33/data.json');
  });

  it('fetchJson uses no extra headers', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lon: 18.06, lat: 59.33 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
