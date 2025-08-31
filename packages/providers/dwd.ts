import { fetchWithRetry } from '@atmos/fetch-client';
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
