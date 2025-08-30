export const slug = 'dwd-opendata';
export const baseUrl = 'https://opendata.dwd.de';
export function buildRequest({ path }) {
    return `${baseUrl}/${path}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
