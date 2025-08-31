export const slug = 'tomorrowio-v4';
export const baseUrl = 'https://api.tomorrow.io/v4';
export function buildRequest({ location, fields, timesteps }) {
    return `${baseUrl}/weather/forecast?location=${encodeURIComponent(location)}&fields=${encodeURIComponent(fields)}&timesteps=${encodeURIComponent(timesteps)}`;
}
export async function fetchJson(url) {
    const apikey = process.env.TOMORROW_API_KEY;
    if (!apikey)
        throw new Error('TOMORROW_API_KEY missing');
    const res = await fetch(url, {
        headers: {
            apikey,
        },
    });
    return res.json();
}
