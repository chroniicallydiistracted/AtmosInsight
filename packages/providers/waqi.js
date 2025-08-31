export const slug = 'waqi';
export const baseUrl = 'https://api.waqi.info';
export function buildRequest({ lat, lon }) {
  const token = process.env.WAQI_TOKEN;
  if (!token) throw new Error('WAQI_TOKEN missing');
  return `${baseUrl}/feed/geo:${lat};${lon}/?token=${token}`;
}
export function buildTileUrl({ host, z, x, y }) {
  const token = process.env.WAQI_TOKEN;
  if (!token) throw new Error('WAQI_TOKEN missing');
  return `${host}/tile/${z}/${x}/${y}.png?token=${token}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
