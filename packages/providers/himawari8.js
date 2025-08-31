export const slug = 'jma-himawari8';
export const baseUrl = 'https://himawari8.s3.amazonaws.com';
export function buildRequest({ product, datetime, region }) {
  const YYYY = datetime.getUTCFullYear().toString();
  const MM = String(datetime.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(datetime.getUTCDate()).padStart(2, '0');
  const HH = String(datetime.getUTCHours()).padStart(2, '0');
  const mm = String(datetime.getUTCMinutes()).padStart(2, '0');
  const SS = String(datetime.getUTCSeconds()).padStart(2, '0');
  const cleanRegion = region.replace(/^\/+/, '');
  return `${baseUrl}/${product}/${YYYY}/${MM}/${DD}/${HH}${mm}${SS}/${cleanRegion}`;
}
export async function fetchTile(url) {
  const res = await fetch(url);
  return res.arrayBuffer();
}
