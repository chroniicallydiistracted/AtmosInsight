import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'openaq-v3';
export const baseUrl = 'https://api.openaq.org/v3';

export interface Params {
  coordinates: string;
  radius: number;
  parameter: string;
}

export function buildRequest({
  coordinates,
  radius,
  parameter,
}: Params): string {
  return `${baseUrl}/latest?coordinates=${coordinates}&radius=${radius}&parameter=${parameter}`;
}

export async function fetchJson(url: string): Promise<any> {
  const headers: Record<string, string> = {};
  const key = process.env.OPENAQ_API_KEY;
  if (key) headers['X-API-Key'] = key;
  const res = await fetchWithRetry(url, { headers });
  return res.json();
}
