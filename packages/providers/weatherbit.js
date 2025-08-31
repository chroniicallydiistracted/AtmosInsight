export const slug = 'weatherbit';
export const baseUrl = 'https://api.weatherbit.io';
export function buildRequest({ endpoint, lat, lon }) {
  const key = process.env.WEATHERBIT_API_KEY;
  if (!key) throw new Error('WEATHERBIT_API_KEY missing');
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    key,
  });
  return `${baseUrl}/v2.0/${endpoint}?${params.toString()}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
