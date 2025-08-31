export const slug = 'open-meteo';
export const baseUrl = 'https://api.open-meteo.com';
export function buildRequest({ latitude, longitude, hourly }) {
  return `${baseUrl}/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${encodeURIComponent(hourly)}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
