export const slug = 'dwd-opendata';
export const baseUrl = 'https://opendata.dwd.de';

export interface KvpParams {
  [key: string]: string | number | boolean;
}

export function buildKvp(params: KvpParams): string {
  return Object.entries(params)
    .map(([k, v]) => [k.toUpperCase(), String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

export function buildWmsParams(params: KvpParams): string {
  return buildKvp(params);
}

export function buildWfsParams(params: KvpParams): string {
  return buildKvp(params);
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}
