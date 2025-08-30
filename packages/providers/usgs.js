export const slug = 'usgs-water';
export const baseUrl = 'https://waterservices.usgs.gov/nwis';
export function buildRequest({ service, sites, parameterCd, startDT, endDT }) {
    const params = new URLSearchParams({
        format: 'json',
        sites,
        parameterCd,
        startDT,
        endDT,
    });
    return `${baseUrl}/${service}/?${params.toString()}`;
}
export async function fetchJson(url) {
    const apiKey = process.env.USGS_API_KEY;
    const init = apiKey ? { headers: { 'X-Api-Key': apiKey } } : undefined;
    const res = init ? await fetch(url, init) : await fetch(url);
    return res.json();
}
