export const slug = 'noaa-coops';
export const baseUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod';

export interface Params {
  product: string;
  station: string;
  begin_date: string;
  end_date: string;
  units: string;
  time_zone: string;
  format: string;
}

export function buildRequest({
  product,
  station,
  begin_date,
  end_date,
  units,
  time_zone,
  format,
}: Params): string {
  const params = new URLSearchParams();
  params.append('product', product);
  params.append('station', station);
  params.append('begin_date', begin_date);
  params.append('end_date', end_date);
  params.append('units', units);
  params.append('time_zone', time_zone);
  params.append('format', format);
  return `${baseUrl}?${params.toString()}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
