export const slug = 'visual-crossing';
export const baseUrl = 'https://weather.visualcrossing.com';
export function buildRequest({ endpoint, location }) {
  const key = process.env.VISUAL_CROSSING_API_KEY;
  if (!key) throw new Error('VISUAL_CROSSING_API_KEY missing');
  const loc = encodeURIComponent(location);
  return `${baseUrl}/VisualCrossingWebServices/rest/services/${endpoint}?location=${loc}&key=${key}`;
}
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
