export const slug = 'nws-radar-tiles';
export const baseUrl = 'https://tiles.weather.gov';
export function buildRequest({ layer, z, x, y }) {
    return `${baseUrl}/tiles/radar/${layer}/${z}/${x}/${y}.png`;
}
export async function fetchTile(url) {
    const res = await fetch(url);
    return res.arrayBuffer();
}
