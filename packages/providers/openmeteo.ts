export const slug = 'open-meteo';
export const baseUrl = 'https://api.open-meteo.com';

export interface Params {
  latitude: number;
  longitude: number;
  hourly: string;
}

export function buildRequest({ latitude, longitude, hourly }: Params): string {
  return `${baseUrl}/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${encodeURIComponent(hourly)}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
