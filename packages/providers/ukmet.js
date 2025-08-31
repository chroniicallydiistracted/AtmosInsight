export const slug = 'ukmet-datahub';
export const baseUrl =
  'https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0';
export function buildRequest({ path, ...query }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    params.append(k, String(v));
  }
  return `${baseUrl}${path}?${params.toString()}`;
}
export async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      apikey: process.env.UKMET_API_KEY,
    },
  });
  return res.json();
}
