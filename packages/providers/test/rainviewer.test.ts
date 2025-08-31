import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../rainviewer.js';

describe('rainviewer provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds tile URL from index', async () => {
    const index = {
      host: 'https://tile.test',
      radar: { past: [{ time: 1, path: '/v2/radar/1' }], nowcast: [] },
    };
    const json = vi.fn().mockResolvedValue(index);
    const mock = vi.fn().mockResolvedValue({ json });
    // @ts-ignore
    global.fetch = mock;
    const url = await buildRequest({
      ts: 1,
      size: 256,
      z: 2,
      x: 3,
      y: 4,
      color: 5,
      options: '0_0',
    });
    expect(mock).toHaveBeenCalledWith(
      'https://api.rainviewer.com/public/weather-maps.json'
    );
    expect(url).toBe('https://tile.test/v2/radar/1/256/2/3/4/5/0_0.png');
  });

  it('fetches binary tile', async () => {
    const arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    const mock = vi.fn().mockResolvedValue({ arrayBuffer });
    // @ts-ignore
    global.fetch = mock;
    await fetchTile('https://tile.test/tile.png');
    expect(mock).toHaveBeenCalledWith('https://tile.test/tile.png');
  });
});
