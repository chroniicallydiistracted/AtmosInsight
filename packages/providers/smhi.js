export const slug = 'smhi-open-data';
export const baseUrl = 'https://opendata-download-metfcst.smhi.se/api';

export function buildRequest({ lon, lat }) {
  return `${baseUrl}/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
}
