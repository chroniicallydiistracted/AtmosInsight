export const slug = 'noaa-nwm';
export const baseUrl = 'https://noaa-nwm-pds.s3.amazonaws.com';

export interface Params {
  product: string;
  datetime: Date;
}

function formatDate(dt: Date): string {
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const hour = String(dt.getUTCHours()).padStart(2, '0');
  return `${year}${month}${day}${hour}`;
}

export function buildRequest({ product, datetime }: Params): string {
  const stamp = formatDate(datetime);
  return `${baseUrl}/${product}/${stamp}/`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}
