export const slug = 'noaa-goes';
export const baseUrl = 'https://noaa-goes16.s3.amazonaws.com';
export function buildRequest({ satellite, product, datetime }) {
  const year = datetime.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 0);
  const doy = Math.floor((datetime.getTime() - startOfYear) / 86400000);
  const ddd = String(doy).padStart(3, '0');
  const hh = String(datetime.getUTCHours()).padStart(2, '0');
  const mm = String(datetime.getUTCMinutes()).padStart(2, '0');
  const ss = String(datetime.getUTCSeconds()).padStart(2, '0');
  const filename = `OR_${product}_${satellite}_s${year}${ddd}${hh}${mm}${ss}.nc`;
  return `${baseUrl}/${product}/${year}/${ddd}/${hh}/${filename}`;
}
export async function fetchBinary(url) {
  const res = await fetch(url);
  return res.arrayBuffer();
}
