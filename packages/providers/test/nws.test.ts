import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../nws.js';

describe('nws provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds points URL', () => {
    const url = buildRequest({ lat: 33.45, lon: -112.07 });
    expect(url).toBe('https://api.weather.gov/points/33.45,-112.07');
  });

  it('injects User-Agent header', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lat: 33.45, lon: -112.07 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, {
      headers: { 'User-Agent': process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)' },
    });
  });
});
