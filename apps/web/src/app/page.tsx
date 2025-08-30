'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type {
  StyleSpecification,
  GeoJSONSourceSpecification,
  RasterSourceSpecification,
  RasterLayerSpecification,
} from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Timeline } from '@/components/Timeline';
import { GlmLegend } from '@/components/GlmLegend';
import { AstroPanel } from '@/components/AstroPanel';
import { AlertsLegend } from '@/components/AlertsLegend';
import { RainviewerLayer } from '@/components/RainviewerLayer';

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    // Create a custom style with Tracestrack basemap via proxy
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const style: StyleSpecification = {
      version: 8,
      sources: {
        'tracestrack-topo': {
          type: 'raster',
          tiles: [`/tile.tracestrack.com/topo_en/{z}/{x}/{y}.webp?key=${apiBase}&style=outrun`],
          tileSize: 256,
          attribution: '© Tracestrack',
        },
      },
      layers: [
        {
          id: 'tracestrack-topo-layer',
          type: 'raster',
          source: 'tracestrack-topo',
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapRef.current as HTMLDivElement,
      style: style,
      center: [-112.074037, 33.448376], // Phoenix, AZ coordinates
      zoom: 8,
      maxZoom: 18,
      minZoom: 0,
    });

    // Store map reference globally for debugging
    (window as { __map?: maplibregl.Map }).__map = map;
    setMapObj(map);

    function addAlertsLayer() {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      fetch(`${apiBase}/api/nws/alerts/active`)
        .then(r => r.json())
        .then(geojson => {
          if (!map.getSource('nws-alerts')) {
            map.addSource('nws-alerts', {
              type: 'geojson',
              data: geojson as unknown as GeoJSON.GeoJSON,
            } as GeoJSONSourceSpecification);

            // Fill polygons by severity
            map.addLayer({
              id: 'nws-alerts-fill',
              type: 'fill',
              source: 'nws-alerts',
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: {
                'fill-color': [
                  'match',
                  ['get', 'severity'],
                  'Extreme',
                  'var(--color-alert-extreme)',
                  'Severe',
                  'var(--color-alert-severe)',
                  'Moderate',
                  'var(--color-alert-moderate)',
                  'Minor',
                  'var(--color-alert-minor)',
                  /* other */ 'var(--color-alert-unknown)',
                ],
                'fill-opacity': 0.35,
              },
            });

            // Outline
            map.addLayer({
              id: 'nws-alerts-line',
              type: 'line',
              source: 'nws-alerts',
              filter: [
                'any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'LineString'],
              ],
              paint: {
                'line-color': 'var(--color-alert-outline)',
                'line-width': 1,
              },
            });

            // Points (if any)
            map.addLayer({
              id: 'nws-alerts-point',
              type: 'circle',
              source: 'nws-alerts',
              filter: ['==', ['geometry-type'], 'Point'],
              paint: {
                'circle-color': 'var(--color-alert-point)',
                'circle-radius': 4,
                'circle-stroke-color': 'var(--color-text-base)',
                'circle-stroke-width': 1,
              },
            });

            const clickTargets = [
              'nws-alerts-fill',
              'nws-alerts-line',
              'nws-alerts-point',
            ];
            clickTargets.forEach(id => {
              map.on('click', id, e => {
                const f = e.features?.[0];
                if (!f) return;

                type AlertProps = {
                  event?: string;
                  severity?: string;
                  headline?: string;
                  areaDesc?: string;
                };

                const p = f.properties as unknown as AlertProps;
                const html = `
                  <strong>${p?.event ?? 'Alert'}</strong><br/>
                  Severity: ${p?.severity ?? 'Unknown'}<br/>
                  ${p?.headline ? `<em>${p.headline}</em><br/>` : ''}
                  ${p?.areaDesc ?? ''}
                `;

                new maplibregl.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(html)
                  .addTo(map);
              });

              map.on(
                'mouseenter',
                id,
                () => (map.getCanvas().style.cursor = 'pointer')
              );
              map.on(
                'mouseleave',
                id,
                () => (map.getCanvas().style.cursor = '')
              );
            });
          } else {
            const src = map.getSource('nws-alerts') as
              | GeoJSONSource
              | undefined;
            src?.setData(geojson as unknown as GeoJSON.GeoJSON);
          }
        })
        .catch(() => {});
    }

    map.on('load', () => {
      addAlertsLayer();

      // GLM TOE raster tiles (from proxy)
      const glmSourceId = 'glm_toe';
      if (!map.getSource(glmSourceId)) {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        map.addSource(glmSourceId, {
          type: 'raster',
          tiles: [`${apiBase}/api/glm-toe/{z}/{x}/{y}.png?window=5m`],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 10,
        } as RasterSourceSpecification);

        map.addLayer({
          id: 'glm_toe_layer',
          type: 'raster',
          source: glmSourceId,
          paint: {
            'raster-opacity': 0.85,
            'raster-resampling': 'linear',
          },
        } as RasterLayerSpecification);
      }
    });

    const interval = window.setInterval(addAlertsLayer, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      map.remove();
    };
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <div ref={mapRef} className="absolute inset-0" />
      <Timeline layerId="goes-east" />
      <AstroPanel />
      <GlmLegend map={mapObj} />
      <AlertsLegend />
      <RainviewerLayer map={mapObj} />
    </div>
  );
}
