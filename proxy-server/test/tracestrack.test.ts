import request from 'supertest';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { app } from '../src/app.js';

const originalKey = process.env.TRACESTRACK_API_KEY;

afterEach(() => {
  if (originalKey) {
    process.env.TRACESTRACK_API_KEY = originalKey;
  } else {
    delete process.env.TRACESTRACK_API_KEY;
  }
  vi.restoreAllMocks();
});

describe('Tracestrack tile proxy', () => {
  it('returns 503 when key is missing', async () => {
    delete process.env.TRACESTRACK_API_KEY;
    const res = await request(app).get('/api/tracestrack/basic/1/2/3.webp');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/API key not configured/i);
  });

  it('requests tile with interpolated coordinates when key present', async () => {
    process.env.TRACESTRACK_API_KEY = 'test-key';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'image/webp' },
        }) as any
      );

    const res = await request(app).get('/api/tracestrack/topo/4/5/6.webp');
    expect(res.status).toBe(200);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe(
      'https://tile.tracestrack.com/topo/4/5/6.webp?key=test-key'
    );
  });
});
