import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry } from '../index.js';

describe('fetchWithRetry', () => {
  it('retries on 429 then succeeds', async () => {
    vi.useFakeTimers();
    const res429 = new Response(null, { status: 429 });
    const res200 = new Response('ok', { status: 200 });
    const mock = vi
      .fn()
      .mockResolvedValueOnce(res429)
      .mockResolvedValueOnce(res200);
    // @ts-ignore
    global.fetch = mock;
    const promise = fetchWithRetry('http://example.com', {}, 1, 1000, 1);
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(mock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    vi.useRealTimers();
  });

  it('rejects after timeout', async () => {
    vi.useFakeTimers();
    const mock = vi.fn((_url, init) => {
      return new Promise((_, reject) => {
        const onAbort = () => {
          init.signal.removeEventListener('abort', onAbort);
          reject(new Error('aborted'));
        };
        init.signal.addEventListener('abort', onAbort, { once: true });
      });
    });
    // @ts-ignore
    global.fetch = mock;
    const promise = fetchWithRetry('http://example.com', {}, 0, 50, 1);
    const expectation = expect(promise).rejects.toThrow(/aborted/i);
    await vi.advanceTimersByTimeAsync(50);
    await expectation;
    vi.useRealTimers();
  });
});
