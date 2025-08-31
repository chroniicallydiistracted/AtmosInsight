import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openaq.js';

describe('openaq provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAQ_API_KEY;
  });

  it('builds latest URL', () => {
    const url = buildRequest({
      coordinates: '10,20',
      radius: 1000,
      parameter: 'pm25',
    });
    expect(url).toBe(
      'https://api.openaq.org/v3/latest?coordinates=10,20&radius=1000&parameter=pm25'
    );
  });

  it('injects API key header when present', async () => {
    process.env.OPENAQ_API_KEY = 'key';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      coordinates: '10,20',
      radius: 1000,
      parameter: 'pm25',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, { headers: { 'X-API-Key': 'key' } });
  });

  it('omits API key header when absent', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      coordinates: '10,20',
      radius: 1000,
      parameter: 'pm25',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, { headers: {} });
  });
});
