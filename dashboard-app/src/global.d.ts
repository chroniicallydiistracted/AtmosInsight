import type maplibregl from 'maplibre-gl';

declare global {
  interface Window {
    __map?: maplibregl.Map;
  }
}

export {};
