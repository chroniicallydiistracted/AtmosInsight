import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'jma-himawari8';
export const baseUrl = 'https://himawari8.s3.amazonaws.com';

export interface Params {
  product: string;
  datetime: Date;
  region: string;
}

export function buildRequest({ product, datetime, region }: Params): string {
  const YYYY = datetime.getUTCFullYear().toString();
  const MM = String(datetime.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(datetime.getUTCDate()).padStart(2, '0');
  const HH = String(datetime.getUTCHours()).padStart(2, '0');
  const mm = String(datetime.getUTCMinutes()).padStart(2, '0');
  const SS = String(datetime.getUTCSeconds()).padStart(2, '0');
  const cleanRegion = region.replace(/^\/+/, '');
  return `${baseUrl}/${product}/${YYYY}/${MM}/${DD}/${HH}${mm}${SS}/${cleanRegion}`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetchWithRetry(url);
  return res.arrayBuffer();
}
