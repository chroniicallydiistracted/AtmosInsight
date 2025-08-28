import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/app.js';
import { getRainviewerIndex } from '../src/rainviewer.js';

describe('RainViewer proxy', () => {
  beforeAll(() => {
    process.env.RAINVIEWER_ENABLED = 'true';
  });

  it('serves a radar past frame tile and sets cache header', async () => {
    const index = await getRainviewerIndex();
    const frame = index.radar.past[index.radar.past.length - 1];
    const ts = String(frame.time);
    const res = await request(app).get(`/api/rainviewer/${ts}/256/3/2/1/3/1_0.png`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  }, 20000);
});

