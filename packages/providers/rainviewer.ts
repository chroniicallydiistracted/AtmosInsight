export const slug = 'rainviewer';
export const baseUrl = 'https://api.rainviewer.com';

export interface Params {
  ts: number;
  size: number;
  z: number;
  x: number;
  y: number;
  color: number;
  options: string;
}

export async function buildRequest({
  ts,
  size,
  z,
  x,
  y,
  color,
  options,
}: Params): Promise<string> {
  const indexUrl = `${baseUrl}/public/weather-maps.json`;
  const res = await fetch(indexUrl);
  const data = await res.json();
  const frames = [...(data.radar?.past || []), ...(data.radar?.nowcast || [])];
  const frame = frames.find((f: any) => f.time === ts);
  if (!frame) throw new Error('Timestamp not found');
  return `${data.host}${frame.path}/${size}/${z}/${x}/${y}/${color}/${options}.png`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

