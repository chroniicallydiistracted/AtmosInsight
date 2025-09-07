import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildRequest, fetchJson } from '../wfigs.js';

describe('nifc-wfigs provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds query URL', () => {
    const url = buildRequest({
      layerId: 0,
      where: '1=1',
      outFields: '*',
      f: 'geojson',
    });
    expect(url).toBe(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Incident_Locations/FeatureServer/0/query?f=geojson&outFields=%2A&where=1%3D1'
    );
  });

  it('calls fetch without headers', async () => {
    const mock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) });
    // @ts-ignore
    global.fetch = mock;
    const url = buildRequest({
      layerId: 0,
      where: '1=1',
      outFields: '*',
      f: 'geojson',
    });
    await fetchJson(url);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });
});
