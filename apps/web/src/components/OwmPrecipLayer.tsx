'use client';
import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

interface OwmPrecipLayerProps {
  map: maplibregl.Map | null;
  visible?: boolean;
  opacity?: number; // 0..100
}

export function OwmPrecipLayer({ map, visible = true, opacity = 70 }: OwmPrecipLayerProps) {
  useEffect(() => {
    if (!map) return;

  const sourceId = 'owm-precip';
  const layerId = 'owm-precip-layer';
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const tilesBase = (apiBase ? `${apiBase}` : '') + '/api/owm/precipitation_new/{z}/{x}/{y}.png';

    // Ensure source exists
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [tilesBase],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
        attribution: '© OpenWeatherMap',
      } as RasterSourceSpecification);
    }

    // Ensure layer exists
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': Math.max(0, Math.min(100, opacity)) / 100,
          'raster-resampling': 'linear',
        },
      } as RasterLayerSpecification);
    }

    // Apply visibility and opacity
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    map.setPaintProperty(layerId, 'raster-opacity', Math.max(0, Math.min(100, opacity)) / 100);

    return () => {
      // Do not remove on unmount to allow re-toggling quickly; only hide
    };
  }, [map, visible, opacity]);

  return null;
}

export default OwmPrecipLayer;
