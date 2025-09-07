import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchTile } from '../iem.js';

describe('iowastate-iem provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds tile URL', () => {
    const url = buildRequest({ layer: 'n0q', z: 4, x: 2, y: 1 });
    expect(url).toBe(
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/n0q/4/2/1.png'
    );
  });

  it('fetches binary tile', async () => {
    const mock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ layer: 'n0q', z: 4, x: 2, y: 1 });
    const buf = await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(0);
  });
});
