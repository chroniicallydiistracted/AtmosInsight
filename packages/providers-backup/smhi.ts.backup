export const slug = 'smhi-open-data';
export const baseUrl = 'https://opendata-download-metfcst.smhi.se/api';

export interface Params {
  lon: number;
  lat: number;
}

export function buildRequest({ lon, lat }: Params): string {
  return `${baseUrl}/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
}
