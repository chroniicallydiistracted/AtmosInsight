export const slug = 'epa-airnow';
export const baseUrl = 'https://www.airnowapi.org';
export function buildRequest({ lat, lon }) {
    const apiKey = process.env.AIRNOW_API_KEY;
    if (!apiKey)
        throw new Error('AIRNOW_API_KEY missing');
    const params = new URLSearchParams({
        format: 'application/json',
        latitude: String(lat),
        longitude: String(lon),
        API_KEY: apiKey,
    });
    return `${baseUrl}/aq/observation/latLong/current?${params.toString()}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
