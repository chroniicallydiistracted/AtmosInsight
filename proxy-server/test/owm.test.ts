import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/app.js';

describe('OWM tiles proxy', () => {
  beforeAll(() => {
    // Leave OWM_API_KEY as-is from env; tests will skip if missing
  });

  it('rejects unknown layer', async () => {
    const res = await request(app).get('/api/owm/not_a_layer/3/2/1.png');
    expect(res.status).toBe(400);
  });

  it.skipIf(!process.env.OWM_API_KEY)(
    'returns 200 for clouds_new when key is set',
    async () => {
      const res = await request(app).get('/api/owm/clouds_new/3/2/1.png');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/png/);
      expect(res.headers['cache-control']).toBe('public, max-age=60');
    },
    20000
  );
});
