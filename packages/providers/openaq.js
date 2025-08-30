export const slug = 'openaq-v3';
export const baseUrl = 'https://api.openaq.org/v3';
export function buildRequest({ coordinates, radius, parameter }) {
    return `${baseUrl}/latest?coordinates=${coordinates}&radius=${radius}&parameter=${parameter}`;
}
export async function fetchJson(url) {
    const headers = {};
    const key = process.env.OPENAQ_API_KEY;
    if (key)
        headers['X-API-Key'] = key;
    const res = await fetch(url, { headers });
    return res.json();
}
