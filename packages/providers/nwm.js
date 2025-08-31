export const slug = 'noaa-nwm';
export const baseUrl = 'https://noaa-nwm-pds.s3.amazonaws.com';
function formatDate(dt) {
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const hour = String(dt.getUTCHours()).padStart(2, '0');
  return `${year}${month}${day}${hour}`;
}
export function buildRequest({ product, datetime }) {
  const stamp = formatDate(datetime);
  return `${baseUrl}/${product}/${stamp}/`;
}
export async function fetchTile(url) {
  const res = await fetch(url);
  return res.arrayBuffer();
}
