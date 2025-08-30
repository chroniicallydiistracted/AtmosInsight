import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../metno.js';

describe('met norway provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds locationforecast URL', () => {
    const url = buildRequest({ lat: 59.91, lon: 10.75, format: 'compact' });
    expect(url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75');
  });

  it('injects User-Agent header', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ lat: 59.91, lon: 10.75, format: 'compact' });
    await fetchJson(url);
    const ua = process.env.METNO_USER_AGENT || process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)';
    expect(mock).toHaveBeenCalledWith(url, { headers: { 'User-Agent': ua } });
  });
});
