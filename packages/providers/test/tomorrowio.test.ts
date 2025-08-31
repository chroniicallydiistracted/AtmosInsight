import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../tomorrowio.js';

describe('tomorrowio provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds forecast URL', () => {
    const url = buildRequest({
      location: '12.3,45.6',
      fields: 'temperature,precipitation',
      timesteps: 'hourly',
    });
    expect(url).toBe(
      'https://api.tomorrow.io/v4/weather/forecast?location=12.3%2C45.6&fields=temperature%2Cprecipitation&timesteps=hourly'
    );
  });

  it('injects apikey header', async () => {
    process.env.TOMORROW_API_KEY = 'test-key';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      location: '12.3,45.6',
      fields: 'temperature,precipitation',
      timesteps: 'hourly',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, { headers: { apikey: 'test-key' } });
  });
});
