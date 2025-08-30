import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../meteomatics.js';

describe('meteomatics provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds request URL', () => {
    const url = buildRequest({
      datetime: '2024-01-01T00:00:00Z',
      parameters: 'temperature',
      lat: 10,
      lon: 20,
      format: 'json',
    });
    expect(url).toBe('https://api.meteomatics.com/2024-01-01T00:00:00Z/temperature/10,20/json');
  });

  it('injects Basic auth header', async () => {
    process.env.METEOMATICS_USER = 'user';
    process.env.METEOMATICS_PASSWORD = 'pass';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      datetime: '2024-01-01T00:00:00Z',
      parameters: 'temperature',
      lat: 10,
      lon: 20,
      format: 'json',
    });
    await fetchJson(url);
    const auth = Buffer.from('user:pass').toString('base64');
    expect(mock).toHaveBeenCalledWith(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
  });
});
