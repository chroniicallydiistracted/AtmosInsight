import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../visualcrossing.js';

describe('visual-crossing provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds service URL', () => {
    process.env.VISUAL_CROSSING_API_KEY = 'test';
    const url = buildRequest({ endpoint: 'timeline', location: 'Austin,TX' });
    expect(url).toBe(
      'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline?location=Austin%2CTX&key=test'
    );
  });

  it('calls fetch without headers', async () => {
    process.env.VISUAL_CROSSING_API_KEY = 'test';
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({ endpoint: 'timeline', location: 'Austin,TX' });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
  });
});
