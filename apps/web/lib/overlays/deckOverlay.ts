import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from 'deck.gl';
import type { Map as MapLibreMap } from 'maplibre-gl';

export function mountDeck(map: MapLibreMap) {
  const overlay = new MapboxOverlay({ layers: [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (overlay as any).setMap(map as any);
  return overlay;
}

export class WindParticlesLayer extends ScatterplotLayer<unknown> {}
export class PointDensityLayer extends ScatterplotLayer<unknown> {}
