import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'nws-alerts';
export const baseUrl = 'https://api.weather.gov/alerts';

export interface Params {
  status?: string;
  area?: string;
  point?: string;
  urgency?: string;
  event?: string;
}

export function buildRequest(params: Params = {}): string {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.area) search.set('area', params.area);
  if (params.point) search.set('point', params.point);
  if (params.urgency) search.set('urgency', params.urgency);
  if (params.event) search.set('event', params.event);
  const qs = search.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

export async function fetchJson(url: string): Promise<any> {
  const ua =
    process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)';
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': ua,
      Accept: 'application/geo+json',
    },
  });
  return res.json();
}
