import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'openweather-air';
export const baseUrl = 'https://api.openweathermap.org';

export interface Params {
  lat: number;
  lon: number;
}

export function buildRequest({ lat, lon }: Params): string {
  const appid = process.env.OPENWEATHER_API_KEY;
  if (!appid) throw new Error('OPENWEATHER_API_KEY missing');
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid,
  });
  return `${baseUrl}/data/2.5/air_pollution?${params.toString()}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetchWithRetry(url);
  return res.json();
}
