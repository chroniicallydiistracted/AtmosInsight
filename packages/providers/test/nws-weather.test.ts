import nock from 'nock';
import { describe, it, expect, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../nws.js';

describe('nws provider', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('builds points URL', () => {
    const url = buildRequest({ lat: 33.45, lon: -112.07 });
    expect(url).toBe('https://api.weather.gov/points/33.45,-112.07');
  });

  it('injects User-Agent header', async () => {
    const ua =
      process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)';
    const scope = nock('https://api.weather.gov')
      .get('/points/33.45,-112.07')
      .matchHeader('User-Agent', ua)
      .reply(200, {});
    const url = buildRequest({ lat: 33.45, lon: -112.07 });
    await fetchJson(url);
    scope.done();
  });
});
