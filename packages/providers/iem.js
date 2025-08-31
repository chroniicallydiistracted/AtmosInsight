export const slug = 'iowastate-iem';
export const baseUrl = 'https://mesonet.agron.iastate.edu';
export function buildRequest({ layer, z, x, y }) {
  return `${baseUrl}/cache/tile.py/1.0.0/${layer}/${z}/${x}/${y}.png`;
}
export async function fetchTile(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
