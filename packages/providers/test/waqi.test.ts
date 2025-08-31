import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, buildTileUrl, fetchJson } from '../waqi.js';

describe('waqi provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds feed URL', () => {
    process.env.WAQI_TOKEN = 'test';
    const url = buildRequest({ lat: 10, lon: 20 });
    expect(url).toBe('https://api.waqi.info/feed/geo:10;20/?token=test');
  });

  it('builds tile URL', () => {
    process.env.WAQI_TOKEN = 'test';
    const url = buildTileUrl({
      host: 'https://tiles.waqi.info',
      z: 1,
      x: 2,
      y: 3,
    });
    expect(url).toBe('https://tiles.waqi.info/tile/1/2/3.png?token=test');
  });

  it('calls fetch without headers', async () => {
    process.env.WAQI_TOKEN = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lat: 10, lon: 20 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
