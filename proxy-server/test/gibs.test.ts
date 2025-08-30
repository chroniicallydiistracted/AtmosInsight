import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';
import { buildGibsTileUrl, buildGibsDomainsUrl } from '../src/gibs.js';

describe('GIBS URL builders', () => {
  it('builds tile URL with time', () => {
    const url = buildGibsTileUrl({
      epsg: '3857',
      layer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
      time: '2025-08-27',
      tms: 'GoogleMapsCompatible_Level9',
      z: '3',
      y: '1',
      x: '2',
      ext: 'jpeg',
    });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/2025-08-27/GoogleMapsCompatible_Level9/3/1/2.jpeg'
    );
  });

  it('builds tile URL without time', () => {
    const url = buildGibsTileUrl({
      epsg: '3857',
      layer: 'BlueMarble_ShadedRelief',
      tms: 'GoogleMapsCompatible_Level8',
      z: '3',
      y: '1',
      x: '2',
      ext: 'jpeg',
    });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/GoogleMapsCompatible_Level8/3/1/2.jpeg'
    );
  });

  it('builds domains URL', () => {
    const url = buildGibsDomainsUrl({
      epsg: '3857',
      layer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
      tms: 'GoogleMapsCompatible_Level9',
      range: '2025-08-01--2025-08-27',
    });
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/MODIS_Aqua_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/all/2025-08-01--2025-08-27.xml'
    );
  });
});

describe('GIBS tile proxy', () => {
  it('serves BlueMarble tile', async () => {
    const res = await request(app).get(
      '/api/gibs/tile/3857/BlueMarble_ShadedRelief/GoogleMapsCompatible_Level8/3/1/2.jpeg'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  }, 20000);

  it('serves BlueMarble bathymetry tile', async () => {
    const res = await request(app).get(
      '/api/gibs/tile/3857/BlueMarble_ShadedRelief_Bathymetry/GoogleMapsCompatible_Level8/3/1/2.jpeg'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
  }, 20000);

  it('serves AMSRE brightness temp tile', async () => {
    const res = await request(app).get(
      '/api/gibs/tile/3857/AMSRE_Brightness_Temp_89H_Day/2011-10-04/GoogleMapsCompatible_Level6/3/1/2.png'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
  }, 20000);
});

describe('GIBS domains proxy', () => {
  it('passes through domains request', async () => {
    const res = await request(app).get(
      '/api/gibs/domains/3857/MODIS_Aqua_CorrectedReflectance_TrueColor/GoogleMapsCompatible_Level9/2025-08-01--2025-08-27.xml'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  }, 20000);
});

describe('GIBS redirect helper', () => {
  it('redirects to canonical REST URL', async () => {
    const res = await request(app).get('/api/gibs/redirect').query({
      layer: 'BlueMarble_ShadedRelief',
      epsg: '3857',
      tms: 'GoogleMapsCompatible_Level8',
      z: '3',
      y: '1',
      x: '2',
      ext: 'jpeg',
    });
    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/GoogleMapsCompatible_Level8/3/1/2.jpeg'
    );
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });
});

describe('GIBS env gating', () => {
  it('returns 503 when disabled', async () => {
    const prev = process.env.GIBS_ENABLED;
    process.env.GIBS_ENABLED = 'false';
    const res = await request(app).get(
      '/api/gibs/tile/3857/BlueMarble_ShadedRelief/GoogleMapsCompatible_Level8/3/1/2.jpeg'
    );
    expect(res.status).toBe(503);
    process.env.GIBS_ENABLED = prev;
  });
});
