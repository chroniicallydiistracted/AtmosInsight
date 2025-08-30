export const slug = 'met-norway';
export const baseUrl = 'https://api.met.no/weatherapi';

export interface Params {
  lat: number;
  lon: number;
  format: 'compact' | 'complete';
}

export function buildRequest({ lat, lon, format }: Params): string {
  return `${baseUrl}/locationforecast/2.0/${format}?lat=${lat}&lon=${lon}`;
}

export async function fetchJson(url: string): Promise<any> {
  const ua = process.env.METNO_USER_AGENT || process.env.NWS_USER_AGENT || '(AtmosInsight, contact@atmosinsight.com)';
  const res = await fetch(url, {
    headers: {
      'User-Agent': ua,
    },
  });
  return res.json();
}
