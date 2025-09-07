import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildRequest, fetchJson } from '../airnow.js';

describe('airnow provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AIRNOW_API_KEY;
  });

  it('builds observation URL with API key', () => {
    process.env.AIRNOW_API_KEY = 'test';
    const url = buildRequest({ lat: 10, lon: 20 });
    expect(url).toBe(
      'https://www.airnowapi.org/aq/observation/latLong/current?format=application%2Fjson&latitude=10&longitude=20&API_KEY=test'
    );
  });

  it('throws if API key missing', () => {
    expect(() => buildRequest({ lat: 10, lon: 20 })).toThrow(
      'AIRNOW_API_KEY missing'
    );
  });

  it('calls fetch without headers', async () => {
    process.env.AIRNOW_API_KEY = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lat: 10, lon: 20 });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
