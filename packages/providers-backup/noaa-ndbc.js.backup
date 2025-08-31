export const slug = 'noaa-ndbc';
export const baseUrl = 'https://www.ndbc.noaa.gov';
export function buildRequest({ station, format }) {
    return `${baseUrl}/data/realtime2/${station}.${format}`;
}
export async function fetch(url, format) {
    const res = await globalThis.fetch(url);
    return format === 'json' ? res.json() : res.text();
}
