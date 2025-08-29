import { describe, it, expect, beforeAll } from 'vitest';
import type { Express } from 'express';
import type { GlmEvent } from '../src/services/glm-toe/ingest.js';
import request from 'supertest';

// Ensure flag is set before importing app
beforeAll(() => {
  process.env.GLM_TOE_ENABLED = 'true';
});

// Dynamic import after env is set
let app: Express;
beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
});

describe('GLM TOE API (feature-flagged)', () => {
  it('ingests synthetic events and serves a non-empty PNG tile', async () => {
    const now = Date.now();
    const events: GlmEvent[] = [];
    for (let i = 0; i < 25; i++) {
      events.push({
        lon: -110.97 + (i % 5) * 0.01,
        lat: 32.22 + Math.floor(i / 5) * 0.01,
        energy_fj: 500,
        timeMs: now - 60_000
      });
    }
    const ingest = await request(app)
      .post('/api/glm-toe/ingest')
      .send(events)
      .set('Content-Type', 'application/json');
    expect(ingest.status).toBe(200);

    // Choose a tile over the cluster
    const z = 6, x = 11, y = 27;
    const res = await request(app).get(`/api/glm-toe/${z}/${x}/${y}.png`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.body.length).toBeGreaterThan(200);
  }, 10000);
});

