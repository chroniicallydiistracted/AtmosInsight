export const slug = 'erddap';
export function buildRequest({ dataset, query }) {
    const base = process.env.ERDDAP_BASE_URL;
    if (!base)
        throw new Error('ERDDAP_BASE_URL missing');
    return `${base}/griddap/${dataset}.json?${query}`;
}
export async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
}
