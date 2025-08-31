import { DEFAULT_NWS_USER_AGENT } from '@atmos/proxy-constants';
import { fetchWithRetry } from '@atmos/fetch-client';

export const slug = 'nws-weather';
export const baseUrl = 'https://api.weather.gov';
export function buildRequest({ lat, lon }) {
    return `${baseUrl}/points/${lat},${lon}`;
}
export async function fetchJson(url) {
    const ua = process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT;
    const res = await fetchWithRetry(url, {
        headers: { 'User-Agent': ua },
    });
    return res.json();
}
