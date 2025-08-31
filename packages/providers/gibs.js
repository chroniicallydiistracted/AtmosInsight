export const slug = 'nasa-gibs';
export const baseUrl = 'https://gibs.earthdata.nasa.gov';
export function buildRequest(params) {
  if (params.type === 'kvp') {
    const {
      epsg,
      layer,
      tileMatrixSet,
      tileMatrix,
      tileRow,
      tileCol,
      format,
      time,
    } = params;
    const timePart = time ? `&time=${time}` : '';
    return `${baseUrl}/wmts/epsg${epsg}/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=&TILEMATRIXSET=${tileMatrixSet}&TILEMATRIX=${tileMatrix}&TILEROW=${tileRow}&TILECOL=${tileCol}&FORMAT=${encodeURIComponent(format)}${timePart}`;
  }
  if (params.type === 'xyz') {
    const { z, y, x } = params;
    const layer = 'MODIS_Terra_CorrectedReflectance_TrueColor';
    const time = '2020-06-01';
    const tms = `GoogleMapsCompatible_Level${z}`;
    return `${baseUrl}/wmts/epsg3857/best/${layer}/default/${time}/${tms}/${z}/${y}/${x}.jpg`;
  }
  const { epsg, layer, tms, z, y, x, ext, time } = params;
  const timePart = time ? `${time}/` : '';
  return `${baseUrl}/wmts/epsg${epsg}/best/${layer}/default/${timePart}${tms}/${z}/${y}/${x}.${ext}`;
}
export function buildDomainsRequest({ epsg, layer, tms, range }) {
  return `${baseUrl}/wmts/epsg${epsg}/best/1.0.0/${layer}/default/${tms}/all/${range}.xml`;
}
export async function fetchTile(url) {
  const token = process.env.EARTHDATA_TOKEN;
  const fullUrl = token
    ? `${url}${url.includes('?') ? '&' : '?'}token=${token}`
    : url;
  const res = await fetch(fullUrl);
  return res.arrayBuffer();
}
