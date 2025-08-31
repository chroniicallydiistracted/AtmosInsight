export const slug = 'rainviewer';
export const baseUrl = 'https://api.rainviewer.com';
export async function buildRequest({ ts, size, z, x, y, color, options, }) {
    const indexUrl = `${baseUrl}/public/weather-maps.json`;
    const res = await fetch(indexUrl);
    const data = await res.json();
    const frames = [...(data.radar?.past || []), ...(data.radar?.nowcast || [])];
    const frame = frames.find((f) => f.time === ts);
    if (!frame)
        throw new Error('Timestamp not found');
    return `${data.host}${frame.path}/${size}/${z}/${x}/${y}/${color}/${options}.png`;
}
export async function fetchTile(url) {
    const res = await fetch(url);
    return res.arrayBuffer();
}
