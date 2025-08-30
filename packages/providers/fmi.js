export const slug = 'fmi-opendata';
export const baseUrl = 'https://opendata.fmi.fi';
export function buildRequest({ path }) {
    return `${baseUrl}/${path}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
