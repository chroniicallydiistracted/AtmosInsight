import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../noaa-coops.js';

describe('noaa-coops provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds request URL with canonical query order', () => {
    const url = buildRequest({
      product: 'water_level',
      station: '8724580',
      begin_date: '20200101',
      end_date: '20200102',
      units: 'metric',
      time_zone: 'gmt',
      format: 'json',
    });
    expect(url).toBe(
      'https://api.tidesandcurrents.noaa.gov/api/prod?product=water_level&station=8724580&begin_date=20200101&end_date=20200102&units=metric&time_zone=gmt&format=json'
    );
  });

  it('calls fetch without headers', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      product: 'water_level',
      station: '8724580',
      begin_date: '20200101',
      end_date: '20200102',
      units: 'metric',
      time_zone: 'gmt',
      format: 'json',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
