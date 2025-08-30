import { describe, it, expect } from 'vitest';
import { buildRequest } from '../fmi.js';

describe('fmi-open-data provider', () => {
  it('builds stored query URL with latlon', () => {
    const url = buildRequest({
      storedquery_id: 'fmi::forecast::weather::point::simple',
      latlon: [60, 25],
    });
    expect(url).toBe(
      'https://opendata.fmi.fi/wfs?service=WFS&request=getFeature&storedquery_id=fmi::forecast::weather::point::simple&latlon=60,25'
    );
  });

  it('builds stored query URL with bbox', () => {
    const url = buildRequest({
      storedquery_id: 'test',
      bbox: [1, 2, 3, 4],
    });
    expect(url).toBe(
      'https://opendata.fmi.fi/wfs?service=WFS&request=getFeature&storedquery_id=test&bbox=1,2,3,4'
    );
  });
});
