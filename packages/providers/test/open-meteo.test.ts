import nock from 'nock';
import { describe, it, expect, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../openmeteo.js';

describe('open-meteo provider', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('builds forecast URL', () => {
    const url = buildRequest({
      latitude: 1,
      longitude: 2,
      hourly: 'temperature_2m',
    });
    expect(url).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2&hourly=temperature_2m'
    );
  });

  it('calls fetch without headers', async () => {
    const scope = nock('https://api.open-meteo.com')
      .get('/v1/forecast')
      .query({ latitude: '1', longitude: '2', hourly: 'temperature_2m' })
      .reply(200, {});
    const url = buildRequest({
      latitude: 1,
      longitude: 2,
      hourly: 'temperature_2m',
    });
    await fetchJson(url);
    scope.done();
  });
});
