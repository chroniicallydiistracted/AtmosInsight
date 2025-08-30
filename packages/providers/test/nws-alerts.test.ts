import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../nws-alerts.js';

describe('nws alerts provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds alerts URL with filters', () => {
    const url = buildRequest({ status: 'actual', area: 'AZ', urgency: 'Immediate' });
    expect(url).toBe('https://api.weather.gov/alerts?status=actual&area=AZ&urgency=Immediate');
  });

  it('injects headers', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ area: 'AZ' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, {
      headers: {
        'User-Agent': process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)',
        Accept: 'application/geo+json',
      },
    });
  });
});
