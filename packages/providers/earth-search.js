export const slug = 'earth-search';
export const baseUrl = 'https://earth-search.aws.element84.com/v1';
export function buildRequest({ bbox, datetime, collections }) {
  return {
    url: `${baseUrl}/search`,
    body: { bbox, datetime, collections },
  };
}
export async function fetchJson({ url, body }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
