export const slug = 'weatherbit';
export const baseUrl = 'https://api.weatherbit.io';

export interface Params {
  endpoint: string;
  lat: number;
  lon: number;
}

export function buildRequest({ endpoint, lat, lon }: Params): string {
  const key = process.env.WEATHERBIT_API_KEY;
  if (!key) throw new Error('WEATHERBIT_API_KEY missing');
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    key,
  });
  return `${baseUrl}/v2.0/${endpoint}?${params.toString()}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
