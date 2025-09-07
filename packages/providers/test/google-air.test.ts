import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../google-air.js';

describe('google air quality provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds request with key and body', () => {
    process.env.GOOGLE_CLOUD_KEY = 'test';
    const req = buildRequest({ lat: 1, lon: 2 });
    expect(req).toEqual({
      url: 'https://airquality.googleapis.com/v1/currentConditions:lookup?key=test',
      body: { location: { latitude: 1, longitude: 2 } },
    });
  });

  it('posts json body', async () => {
    process.env.GOOGLE_CLOUD_KEY = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const req = buildRequest({ lat: 1, lon: 2 });
    await fetchJson(req);
    expect(mock).toHaveBeenCalledWith(req.url, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: expect.any(AbortSignal)
    }));
  });
});
