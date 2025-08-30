export const slug = 'dwd-opendata';
export const baseUrl = 'https://opendata.dwd.de';
export function buildKvp(params) {
    return Object.entries(params)
        .map(([k, v]) => [k.toUpperCase(), String(v)])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
}
export function buildWmsParams(params) {
    return buildKvp(params);
export function buildWfsParams(params) {
export async function fetchTile(url) {
    const res = await fetch(url);
    return res.arrayBuffer();
export function buildRequest({ path }) {
    return `${baseUrl}/${path}`;
export async function fetchJson(url) {
    return res.json();
