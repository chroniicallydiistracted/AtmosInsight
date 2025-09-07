import { describe, it, expect, vi, afterEach } from 'vitest';
import * as weatherkit from '../weatherkit.js';

const { buildRequest, fetchJson } = weatherkit;

describe('weatherkit provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds weather URL', () => {
    const url = buildRequest({
      lang: 'en',
      lat: 10,
      lon: 20,
      dataSets: ['currentWeather', 'forecastDaily'],
    });
    expect(url).toBe(
      'https://weatherkit.apple.com/api/v1/weather/en/10/20?dataSets=currentWeather,forecastDaily'
    );
  });

  it('injects Authorization header', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mockFetch;
    const url = buildRequest({
      lang: 'en',
      lat: 10,
      lon: 20,
      dataSets: ['currentWeather'],
    });
    await fetchJson(url, 'mock');
    expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining({
      headers: { Authorization: 'Bearer mock' },
      signal: expect.any(AbortSignal)
    }));
  });
});
