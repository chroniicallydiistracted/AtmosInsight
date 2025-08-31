export const slug = 'msc-geomet';
export const baseUrl = 'https://geo.weather.gc.ca/geomet';

export interface Params {
  path: string;
}

export function buildRequest({ path }: Params): string {
  return `${baseUrl}/${path}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
