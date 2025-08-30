export const slug = 'openweather-air';
export const baseUrl = 'https://api.openweathermap.org';
export function buildRequest({ lat, lon }) {
    const appid = process.env.OPENWEATHER_API_KEY;
    if (!appid)
        throw new Error('OPENWEATHER_API_KEY missing');
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        appid,
    });
    return `${baseUrl}/data/2.5/air_pollution?${params.toString()}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
