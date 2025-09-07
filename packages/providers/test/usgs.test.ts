import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../usgs.js';

describe('usgs-water provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.USGS_API_KEY;
  });

  it('builds service URL with query', () => {
    const url = buildRequest({
      service: 'dv',
      sites: '09423350',
      parameterCd: '00060',
      startDT: '2024-01-01',
      endDT: '2024-01-02',
    });
    expect(url).toBe(
      'https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09423350&parameterCd=00060&startDT=2024-01-01&endDT=2024-01-02'
    );
  });

  it('injects X-Api-Key header when provided', async () => {
    process.env.USGS_API_KEY = 'test-key';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      service: 'dv',
      sites: '09423350',
      parameterCd: '00060',
      startDT: '2024-01-01',
      endDT: '2024-01-02',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      headers: { 'X-Api-Key': 'test-key' },
      signal: expect.any(AbortSignal)
    }));
  });

  it('calls fetch without header when no key', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      service: 'dv',
      sites: '09423350',
      parameterCd: '00060',
      startDT: '2024-01-01',
      endDT: '2024-01-02',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
