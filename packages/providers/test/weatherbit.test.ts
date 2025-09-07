import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../weatherbit.js';

describe('weatherbit provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds endpoint URL', () => {
    process.env.WEATHERBIT_API_KEY = 'test';
    const url = buildRequest({ endpoint: 'current', lat: 10, lon: 20 });
    expect(url).toBe(
      'https://api.weatherbit.io/v2.0/current?lat=10&lon=20&key=test'
    );
  });

  it('calls fetch without headers', async () => {
    process.env.WEATHERBIT_API_KEY = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ endpoint: 'current', lat: 10, lon: 20 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
