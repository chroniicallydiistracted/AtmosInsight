export const slug = 'google-air-quality';
export const baseUrl = 'https://airquality.googleapis.com/v1';
export function buildRequest({ lat, lon }) {
  return {
    url: `${baseUrl}/currentConditions:lookup?key=${process.env.GOOGLE_CLOUD_KEY}`,
    body: {
      location: {
        latitude: lat,
        longitude: lon,
      },
    },
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
