export const slug = 'nasa-firms';
export const baseUrl = 'https://firms.modaps.eosdis.nasa.gov';
export function buildRequest(p) {
  if (p.mode === 'csv') {
    return `${baseUrl}/api/area/csv/${p.path}`;
  }
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) throw new Error('FIRMS_MAP_KEY missing');
  const search = new URLSearchParams(p.params);
  search.set('MAP_KEY', mapKey);
  return `${baseUrl}/${p.mode}/${p.dataset}?${search.toString()}`;
}
export async function fetchTile(url) {
  const res = await fetch(url);
  if (url.includes('/api/area/csv/')) {
    return res.text();
  }
  return res.arrayBuffer();
}
