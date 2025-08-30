import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildWmsParams, buildWfsParams, fetchTile } from '../dwd.js';

describe('dwd-opendata provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('builds WMS params in sorted uppercase order', () => {
    const params = buildWmsParams({ version: '1.3.0', service: 'WMS', request: 'GetMap' });
    expect(params).toBe('REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0');
  it('builds WFS params in sorted uppercase order', () => {
    const params = buildWfsParams({ request: 'GetFeature', service: 'WFS', version: '2.0.0' });
    expect(params).toBe('REQUEST=GetFeature&SERVICE=WFS&VERSION=2.0.0');
  it('fetches binary tile', async () => {
    const mockBuffer = new ArrayBuffer(2);
    const mock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(mockBuffer) });
    // @ts-ignore
    global.fetch = mock;
    const buf = await fetchTile('https://example.com/tile');
    expect(mock).toHaveBeenCalledWith('https://example.com/tile');
    expect(buf).toBeInstanceOf(ArrayBuffer);
});
import { buildRequest, fetchJson } from '../dwd.js';
describe('dwd provider', () => {
  it('builds path URL', () => {
    const url = buildRequest({ path: 'test' });
    expect(url).toBe('https://opendata.dwd.de/test');
  it('fetches JSON', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url);
