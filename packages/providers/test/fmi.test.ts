import { describe, it, expect } from 'vitest';
import { buildRequest } from '../fmi.js';

describe('fmi-open-data provider', () => {
  it('builds stored query URL with latlon', () => {
    const url = buildRequest({
      storedquery_id: 'fmi::forecast::weather::point::simple',
      latlon: [60, 25],
    });
    expect(url).toBe(
      'https://opendata.fmi.fi/wfs?service=WFS&request=getFeature&storedquery_id=fmi::forecast::weather::point::simple&latlon=60,25'
    );
  });
  it('builds stored query URL with bbox', () => {
      storedquery_id: 'test',
      bbox: [1, 2, 3, 4],
      'https://opendata.fmi.fi/wfs?service=WFS&request=getFeature&storedquery_id=test&bbox=1,2,3,4'
});
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../fmi.js';
describe('fmi provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  it('builds path URL', () => {
    const url = buildRequest({ path: 'test' });
    expect(url).toBe('https://opendata.fmi.fi/test');
  it('fetches JSON', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
