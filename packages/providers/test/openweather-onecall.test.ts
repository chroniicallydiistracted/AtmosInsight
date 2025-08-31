import nock from 'nock';
import { describe, it, expect, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openweather.js';

describe('openweather provider', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('builds onecall URL', () => {
    process.env.OPENWEATHER_API_KEY = 'test';
    const url = buildRequest({ lat: 10, lon: 20 });
    expect(url).toBe(
      'https://api.openweathermap.org/data/3.0/onecall?lat=10&lon=20&appid=test'
    );
  });

  it('calls fetch without headers', async () => {
    process.env.OPENWEATHER_API_KEY = 'test';
    const scope = nock('https://api.openweathermap.org')
      .get('/data/3.0/onecall')
      .query({ lat: '10', lon: '20', appid: 'test' })
      .reply(200, {});
    const url = buildRequest({ lat: 10, lon: 20 });
    await fetchJson(url);
    scope.done();
  });
});
