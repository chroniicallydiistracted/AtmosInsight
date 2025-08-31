export const slug = 'noaa-ndbc';
export const baseUrl = 'https://www.ndbc.noaa.gov';

export interface Params {
  station: string;
  format: 'txt' | 'json';
}

export function buildRequest({ station, format }: Params): string {
  return `${baseUrl}/data/realtime2/${station}.${format}`;
}

export async function fetch(
  url: string,
  format: Params['format']
): Promise<any> {
  const res = await globalThis.fetch(url);
  return format === 'json' ? res.json() : res.text();
}
