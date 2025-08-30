export const slug = 'fmi-opendata';
export const baseUrl = 'https://opendata.fmi.fi';

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
