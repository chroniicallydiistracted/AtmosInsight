import { describe, it, expect } from 'vitest';
import { buildRequest } from '../eccc.js';

describe('eccc geomet provider', () => {
  it('canonicalizes query parameters', () => {
    const url = buildRequest({
      request: 'GetMap',
      service: 'WMS',
      layers: 'RDPS.CONUS_T',
      crs: 'EPSG:4326',
      bbox: [0, 0, 1, 1],
    });
    expect(url).toBe(
      'https://geo.weather.gc.ca/geomet?bbox=0,0,1,1&crs=EPSG:4326&layers=RDPS.CONUS_T&request=GetMap&service=WMS'
    );
  });

  it('builds wmts REST path', () => {
    const url = buildRequest({
      urlTemplate:
        'wmts/1.0.0/{layer}/{style}/{tileMatrixSet}/{tileMatrix}/{tileRow}/{tileCol}.png',
      layer: 'RDPS.CONUS_T',
      style: 'default',
      tileMatrixSet: 'EPSG4326',
      tileMatrix: 0,
      tileRow: 1,
      tileCol: 2,
    });
    expect(url).toBe(
      'https://geo.weather.gc.ca/geomet/wmts/1.0.0/RDPS.CONUS_T/default/EPSG4326/0/1/2.png'
    );
  });
});
