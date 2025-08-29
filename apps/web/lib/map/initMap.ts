import maplibregl from 'maplibre-gl';

export function initMap(container: string | HTMLElement) {
  const map = new maplibregl.Map({
    container,
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 2,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addRasterLayer(id: string, source: any, layer: any) {
    map.addSource(id, source);
    map.addLayer({ id, type: 'raster', source: id, ...layer });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addVectorLayer(id: string, source: any, layer: any) {
    map.addSource(id, source);
    map.addLayer({ id, type: 'fill', source: id, ...layer });
  }

  function toggleLayer(id: string) {
    const vis = map.getLayoutProperty(id, 'visibility');
    map.setLayoutProperty(id, 'visibility', vis === 'none' ? 'visible' : 'none');
  }

  function setOpacity(id: string, v: number) {
    if (map.getLayer(id)) {
      map.setPaintProperty(id, 'raster-opacity', v);
      map.setPaintProperty(id, 'fill-opacity', v);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setTimeParam(sourceId: string, iso: string) {
    const src = map.getSource(sourceId)  as unknown as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (src && typeof src.setTiles === 'function') {
      src.setTiles(src.tiles.map((t: string) => t.replace('{time}', iso)));
    }
  }

  return { map, addRasterLayer, addVectorLayer, toggleLayer, setOpacity, setTimeParam };
}
