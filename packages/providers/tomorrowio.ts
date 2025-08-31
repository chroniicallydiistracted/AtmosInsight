import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'tomorrowio-v4';
export const baseUrl = 'https://api.tomorrow.io/v4';

export interface Params {
  location: string;
  fields: string;
  timesteps: string;
}

export function buildRequest({ location, fields, timesteps }: Params): string {
  return `${baseUrl}/weather/forecast?location=${encodeURIComponent(location)}&fields=${encodeURIComponent(fields)}&timesteps=${encodeURIComponent(timesteps)}`;
}

export async function fetchJson(url: string): Promise<any> {
  const apikey = process.env.TOMORROW_API_KEY;
  if (!apikey) throw new Error('TOMORROW_API_KEY missing');
  const res = await fetchWithRetry(url, {
    headers: {
      apikey,
    },
  });
  return res.json();
}
