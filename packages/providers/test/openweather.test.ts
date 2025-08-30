import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openweather.js';

describe('openweather provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds onecall URL', () => {
    process.env.OPENWEATHER_API_KEY = 'test';
    const url = buildRequest({ lat: 10, lon: 20 });
    expect(url).toBe('https://api.openweathermap.org/data/3.0/onecall?lat=10&lon=20&appid=test');
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
