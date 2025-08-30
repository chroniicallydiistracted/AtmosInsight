import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../nws-radar-tiles.js';

describe('nws radar tiles provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds canonical tile path', () => {
    const url = buildRequest({ layer: 'conus', z: 3, x: 2, y: 1 });
    expect(url).toBe('https://tiles.weather.gov/tiles/radar/conus/3/2/1.png');
  });

  it('fetches tile as arrayBuffer', async () => {
    const mockBuffer = new ArrayBuffer(8);
    const mock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(mockBuffer) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ layer: 'conus', z: 3, x: 2, y: 1 });
    const data = await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(url);
    expect(data).toBe(mockBuffer);
  });
});
