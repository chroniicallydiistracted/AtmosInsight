import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../fmi.js';

describe('fmi provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds path URL', () => {
    const url = buildRequest({ path: 'test' });
    expect(url).toBe('https://opendata.fmi.fi/test');
  });

  it('fetches JSON', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ path: 'test' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
