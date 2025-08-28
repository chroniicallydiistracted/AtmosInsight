import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/app.js';

describe('NWS alerts proxy', () => {
  beforeAll(() => {
    process.env.NWS_USER_AGENT = '(Vortexa, contact@example.com)';
  });

  it('returns alerts for area AZ', async () => {
    const res = await request(app).get('/api/nws/alerts/active?area=AZ');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(Array.isArray(body.features)).toBe(true);
  }, 20000);
});
