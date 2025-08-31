import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'noaa-goes';
export const baseUrl = 'https://noaa-goes16.s3.amazonaws.com';

export interface Params {
  satellite: string;
  product: string;
  datetime: Date;
}

export function buildRequest({ satellite, product, datetime }: Params): string {
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

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetchWithRetry(url);
  return res.arrayBuffer();
}
