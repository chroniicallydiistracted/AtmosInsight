export const slug = 'dwd-opendata';
export const baseUrl = 'https://opendata.dwd.de';

export function buildKvp(params) {
  return Object.entries(params)
    .map(([k, v]) => [k.toUpperCase(), String(v)])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}
