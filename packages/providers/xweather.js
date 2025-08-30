export const slug = 'xweather';
export const baseUrl = 'https://api.aerisapi.com';
export function buildRequest({ endpoint, params }) {
  const clientId = process.env.XWEATHER_CLIENT_ID;
  if (!clientId)
    throw new Error('XWEATHER_CLIENT_ID missing');
  const clientSecret = process.env.XWEATHER_CLIENT_SECRET;
  if (!clientSecret)
    throw new Error('XWEATHER_CLIENT_SECRET missing');
  const merged = { ...params, client_id: clientId, client_secret: clientSecret };
  const searchParams = new URLSearchParams();
  Object.keys(merged)
    .sort()
    .forEach((key) => {
      searchParams.append(key, merged[key]);
    });
  return `${baseUrl}/${endpoint}?${searchParams.toString()}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
