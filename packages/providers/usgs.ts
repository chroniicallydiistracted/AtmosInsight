export const slug = 'usgs-water';
export const baseUrl = 'https://waterservices.usgs.gov/nwis';

export interface Params {
  service: string;
  sites: string;
  parameterCd: string;
  startDT: string;
  endDT: string;
}

export function buildRequest({ service, sites, parameterCd, startDT, endDT }: Params): string {
  const params = new URLSearchParams({
    format: 'json',
    sites,
    parameterCd,
    startDT,
    endDT,
  });
  return `${baseUrl}/${service}/?${params.toString()}`;
}

export async function fetchJson(url: string): Promise<any> {
  const apiKey = process.env.USGS_API_KEY;
  const init = apiKey ? { headers: { 'X-Api-Key': apiKey } } : undefined;
  const res = init ? await fetch(url, init) : await fetch(url);
  return res.json();
}
