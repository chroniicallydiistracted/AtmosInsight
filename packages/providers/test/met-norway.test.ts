import nock from 'nock';
import { describe, it, expect, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../metno.js';

describe('met norway provider', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('builds locationforecast URL', () => {
    const url = buildRequest({ lat: 59.91, lon: 10.75, format: 'compact' });
    expect(url).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75'
    );
  });

  it('injects User-Agent header', async () => {
    const ua =
      process.env.METNO_USER_AGENT ||
      process.env.NWS_USER_AGENT ||
      '(AtmosInsight, contact@atmosinsight.com)';
    const scope = nock('https://api.met.no')
      .get('/weatherapi/locationforecast/2.0/compact')
      .query({ lat: '59.91', lon: '10.75' })
      .matchHeader('User-Agent', ua)
      .reply(200, {});
    const url = buildRequest({ lat: 59.91, lon: 10.75, format: 'compact' });
    await fetchJson(url);
    scope.done();
  });
});
