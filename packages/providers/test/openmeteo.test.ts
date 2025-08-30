import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openmeteo.js';

describe('open-meteo provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds forecast URL', () => {
    const url = buildRequest({ latitude: 1, longitude: 2, hourly: 'temperature_2m' });
    expect(url).toBe('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2&hourly=temperature_2m');
  });

  it('calls fetch without headers', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ latitude: 1, longitude: 2, hourly: 'temperature_2m' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
