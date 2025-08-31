import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, buildDomainsRequest, fetchTile } from '../gibs.js';

describe('nasa gibs provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EARTHDATA_TOKEN;
  });

  it('builds EPSG:4326 WMTS REST URL', () => {
    const url = buildRequest({
      epsg: '4326',
      layer: 'BlueMarble_ShadedRelief',
      tms: '250m',
      z: '3',
      y: '1',
      x: '2',
      ext: 'png',
    });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief/default/250m/3/1/2.png'
    );
  });

  it('builds XYZ alias URL for EPSG:3857', () => {
    const url = buildRequest({ type: 'xyz', z: '3', y: '1', x: '2' });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2020-06-01/GoogleMapsCompatible_Level3/3/1/2.jpg'
    );
  });

  it('builds DescribeDomains URL', () => {
    const url = buildDomainsRequest({
      epsg: '4326',
      layer: 'BlueMarble_ShadedRelief',
      tms: '250m',
      range: '2000-01-01--2020-01-01',
    });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/BlueMarble_ShadedRelief/default/250m/all/2000-01-01--2020-01-01.xml'
    );
  });

  it('appends EARTHDATA token when fetching tile', async () => {
    process.env.EARTHDATA_TOKEN = 'secret';
    const mock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      epsg: '4326',
      layer: 'BlueMarble_ShadedRelief',
      tms: '250m',
      z: '3',
      y: '1',
      x: '2',
      ext: 'png',
    });
    await fetchTile(url);
    expect(mock).toHaveBeenCalledWith(`${url}?token=secret`);
  });
});
