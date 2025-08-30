export const slug = 'waqi';
export const baseUrl = 'https://api.waqi.info';

export interface Params {
  lat: number;
  lon: number;
}

export function buildRequest({ lat, lon }: Params): string {
  const token = process.env.WAQI_TOKEN;
  if (!token) throw new Error('WAQI_TOKEN missing');
  return `${baseUrl}/feed/geo:${lat};${lon}/?token=${token}`;
}

export interface TileParams {
  host: string;
  z: number;
  x: number;
  y: number;
}

export function buildTileUrl({ host, z, x, y }: TileParams): string {
  const token = process.env.WAQI_TOKEN;
  if (!token) throw new Error('WAQI_TOKEN missing');
  return `${host}/tile/${z}/${x}/${y}.png?token=${token}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
