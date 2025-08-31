import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'nasa-firms';
export const baseUrl = 'https://firms.modaps.eosdis.nasa.gov';

export type Params =
  | { mode: 'csv'; path: string }
  | { mode: 'wms' | 'wfs'; dataset: string; params: Record<string, string> };

export function buildRequest(p: Params): string {
  if (p.mode === 'csv') {
    return `${baseUrl}/api/area/csv/${p.path}`;
  }
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) throw new Error('FIRMS_MAP_KEY missing');
  const search = new URLSearchParams(p.params);
  search.set('MAP_KEY', mapKey);
  return `${baseUrl}/${p.mode}/${p.dataset}?${search.toString()}`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer | string> {
  const res = await fetchWithRetry(url);
  if (url.includes('/api/area/csv/')) {
    return res.text();
  }
  return res.arrayBuffer();
}
