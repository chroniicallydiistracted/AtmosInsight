import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'iowastate-iem';
export const baseUrl = 'https://mesonet.agron.iastate.edu';

export interface Params {
  layer: string;
  z: number;
  x: number;
  y: number;
}

export function buildRequest({ layer, z, x, y }: Params): string {
  return `${baseUrl}/cache/tile.py/1.0.0/${layer}/${z}/${x}/${y}.png`;
}

export async function fetchTile(url: string): Promise<Buffer> {
  const res = await fetchWithRetry(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
