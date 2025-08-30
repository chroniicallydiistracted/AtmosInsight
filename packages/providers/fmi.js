export const slug = 'fmi-open-data';
export const baseUrl = 'https://opendata.fmi.fi';
export function buildRequest(params) {
    const parts = [
        'service=WFS',
        'request=getFeature',
        `storedquery_id=${params.storedquery_id}`,
    ];
    if ('latlon' in params) {
        const [lat, lon] = params.latlon;
        parts.push(`latlon=${lat},${lon}`);
    }
    else {
        parts.push(`bbox=${params.bbox.join(',')}`);
    return `${baseUrl}/wfs?${parts.join('&')}`;
}
export async function fetchTile(url) {
    const res = await fetch(url);
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('json')) {
        return res.json();
    return res.arrayBuffer();
export const slug = 'fmi-opendata';
export function buildRequest({ path }) {
    return `${baseUrl}/${path}`;
export async function fetchJson(url) {
    return res.json();
