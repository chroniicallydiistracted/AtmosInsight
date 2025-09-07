import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../erddap.js';

describe('erddap provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds dataset URL', () => {
    process.env.ERDDAP_BASE_URL = 'https://example.com';
    const url = buildRequest({ dataset: 'test-ds', query: 'var=value' });
    expect(url).toBe('https://example.com/griddap/test-ds.json?var=value');
  });

  it('calls fetch without headers', async () => {
    process.env.ERDDAP_BASE_URL = 'https://example.com';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ dataset: 'test-ds', query: 'var=value' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
