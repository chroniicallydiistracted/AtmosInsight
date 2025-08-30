export const slug = 'noaa-mrms';
export const baseUrl = 'https://noaa-mrms-pds.s3.amazonaws.com';
function pad(n) {
    return String(n).padStart(2, '0');
}
export function buildRequest({ product, datetime }) {
    const y = datetime.getUTCFullYear();
    const m = pad(datetime.getUTCMonth() + 1);
    const d = pad(datetime.getUTCDate());
    const hh = pad(datetime.getUTCHours());
    const mm = pad(datetime.getUTCMinutes());
    const ymd = `${y}${m}${d}`;
    const time = `${ymd}-${hh}${mm}`;
    return `${baseUrl}/${product}/${ymd}/${product}_${time}_GEO.tif`;
}
export async function fetchTile(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    return res.arrayBuffer();
}
