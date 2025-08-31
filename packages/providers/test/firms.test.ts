import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildRequest, fetchTile } from '../firms.js';

const BASE = 'https://firms.modaps.eosdis.nasa.gov';

describe('firms provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds CSV URL', () => {
    const url = buildRequest({ mode: 'csv', path: 'VIIRS_SNPP_NRT/world/24h' });
    expect(url).toBe(`${BASE}/api/area/csv/VIIRS_SNPP_NRT/world/24h`);
  });

  it('builds WMS URL with MAP_KEY', () => {
    process.env.FIRMS_MAP_KEY = 'test';
    const params = { SERVICE: 'WMS', REQUEST: 'GetMap' };
    const url = buildRequest({
      mode: 'wms',
      dataset: 'VIIRS_SNPP_NRT',
      params,
    });
    const search = new URLSearchParams(params);
    search.set('MAP_KEY', 'test');
    expect(url).toBe(`${BASE}/wms/VIIRS_SNPP_NRT?${search.toString()}`);
  });

  it('fetchTile returns text for CSV', async () => {
    const mock = vi
      .fn()
      .mockResolvedValue({ text: () => Promise.resolve('ok') });
    // @ts-ignore
    global.fetch = mock;
    const url = `${BASE}/api/area/csv/foo`;
    const res = await fetchTile(url);
    expect(res).toBe('ok');
  });

  it('fetchTile returns arrayBuffer for WMS', async () => {
    const buf = new ArrayBuffer(8);
    const mock = vi
      .fn()
      .mockResolvedValue({ arrayBuffer: () => Promise.resolve(buf) });
    // @ts-ignore
    global.fetch = mock;
    const url = `${BASE}/wms/VIIRS_SNPP_NRT?SERVICE=WMS`;
    const res = await fetchTile(url);
    expect(res).toBe(buf);
  });
});
