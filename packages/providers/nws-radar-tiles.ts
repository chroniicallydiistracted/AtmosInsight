export const slug = 'nws-radar-tiles';
export const baseUrl = 'https://tiles.weather.gov';

export interface Params {
  layer: string;
  z: number;
  x: number;
  y: number;
}

export function buildRequest({ layer, z, x, y }: Params): string {
  return `${baseUrl}/tiles/radar/${layer}/${z}/${x}/${y}.png`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}
