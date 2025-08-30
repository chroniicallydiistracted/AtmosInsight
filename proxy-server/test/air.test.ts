import request from 'supertest';
import nock from 'nock';
import { describe, it, beforeAll, afterEach, expect } from 'vitest';
import { app } from '../src/app.js';

describe('Air quality proxies', () => {
  beforeAll(() => {
    process.env.AIRNOW_API_KEY = 'test-key';
    process.env.AIRNOW_ENABLED = 'true';
    process.env.OPENAQ_ENABLED = 'true';
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('proxies AirNow requests and appends API key', async () => {
    const scope = nock('https://www.airnowapi.org')
      .get('/aq/data')
      .query((q) => q.API_KEY === 'test-key')
      .reply(200, [{ AQI: 50 }]);

    const res = await request(app).get(
      '/api/air/airnow/aq/data?latitude=37&longitude=-122&distance=25'
    );
    scope.done();
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body[0].AQI).toBe(50);
  });

  it('proxies OpenAQ requests', async () => {
    const scope = nock('https://api.openaq.org')
      .get('/v2/latest')
      .query((q) => q.coordinates === '37,-122')
      .reply(200, { results: [{ location: 'test' }] });

    const res = await request(app).get(
      '/api/air/openaq/latest?coordinates=37,-122'
    );
    scope.done();
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.results[0].location).toBe('test');
  });
});
