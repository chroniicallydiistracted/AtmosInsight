import { describe, it, expect } from 'vitest';
import { buildGibsTileUrl, buildGibsDomainsUrl } from '../index.js';

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
