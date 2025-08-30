export const slug = 'smhi-opendata';
export const baseUrl = 'https://opendata-download-metfcst.smhi.se';
export function buildRequest({ path }) {
    return `${baseUrl}/${path}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
