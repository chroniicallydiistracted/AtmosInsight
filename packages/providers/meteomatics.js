export const slug = 'meteomatics';
export const baseUrl = 'https://api.meteomatics.com';
export function buildRequest({ datetime, parameters, lat, lon, format }) {
  return `${baseUrl}/${datetime}/${parameters}/${lat},${lon}/${format}`;
}
export async function fetchJson(url) {
  const user = process.env.METEOMATICS_USER;
  const password = process.env.METEOMATICS_PASSWORD;
  if (!user || !password)
    throw new Error('METEOMATICS_USER or METEOMATICS_PASSWORD missing');
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  return res.json();
}
