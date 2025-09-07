import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../ukmet.js';

describe('ukmet provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).fetch;
  });

  it('builds point forecast URL', () => {
    const url = buildRequest({
      path: '/point/forecast',
      latitude: 51.5,
      longitude: -0.1,
    });
    expect(url).toBe(
      'https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0/point/forecast?latitude=51.5&longitude=-0.1'
    );
  });

  it('adds apikey header', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    (global as any).fetch = mock;
    process.env.UKMET_API_KEY = 'abc';
    const url = buildRequest({
      path: '/point/forecast',
      latitude: 51.5,
      longitude: -0.1,
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      headers: { apikey: 'abc' },
      signal: expect.any(AbortSignal)
    }));
  });
});
