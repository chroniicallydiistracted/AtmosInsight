export const slug = 'msc-geomet';
export const baseUrl = 'https://geo.weather.gc.ca/geomet';
export function buildRequest({ path }) {
  return `${baseUrl}/${path}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
