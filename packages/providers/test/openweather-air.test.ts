import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openweather-air.js';

describe('openweather-air provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds air pollution URL', () => {
    process.env.OPENWEATHER_API_KEY = 'test';
    const url = buildRequest({ lat: 10, lon: 20 });
    expect(url).toBe('https://api.openweathermap.org/data/2.5/air_pollution?lat=10&lon=20&appid=test');
  });

  it('calls fetch without headers', async () => {
    process.env.OPENWEATHER_API_KEY = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lat: 10, lon: 20 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
