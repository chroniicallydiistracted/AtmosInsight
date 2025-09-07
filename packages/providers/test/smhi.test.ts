import { describe, it, expect } from 'vitest';
import { buildRequest } from '../smhi.js';

describe('smhi provider', () => {
  it('builds point forecast URL', () => {
    const url = buildRequest({ lon: 18.06, lat: 59.33 });
    expect(url).toBe('https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/18.06/lat/59.33/data.json');
  });
});