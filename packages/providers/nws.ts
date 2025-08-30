export const slug = 'nws-weather';
export const baseUrl = 'https://api.weather.gov';

export interface Params {
  lat: number;
  lon: number;
}

export function buildRequest({ lat, lon }: Params): string {
  return `${baseUrl}/points/${lat},${lon}`;
}

export async function fetchJson(url: string): Promise<any> {
  const ua = process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)';
  const res = await fetch(url, {
    headers: {
      'User-Agent': ua,
    },
  });
  return res.json();
}
