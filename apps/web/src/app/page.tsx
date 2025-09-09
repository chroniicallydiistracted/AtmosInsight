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
import { ForecastPopover } from '@/components/ForecastPopover';
import { RainviewerLayer } from '@/components/RainviewerLayer';

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const style: StyleSpecification = {
      version: 8,
      sources: {
        // Use working OSM standard tiles as primary
        osm: {
          type: 'raster',
          tiles: [`${apiBase}/api/basemap/osm/{z}/{x}/{y}.png`],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
        // Use Carto as reliable fallback
        carto: {
          type: 'raster',
          tiles: [`${apiBase}/api/basemap/carto/light_all/{z}/{x}/{y}.png`],
          tileSize: 256,
          attribution: '© CARTO, © OpenStreetMap contributors',
        },
        // Keep Tracestrack as option but fix the endpoint issue
        'tracestrack-topo': {
          type: 'raster',
          tiles: [`${apiBase}/api/tracestrack/topo_en/{z}/{x}/{y}.webp`],
          tileSize: 256,
          attribution: '© Tracestrack',
        },
      },
      layers: [
        {
          id: 'basemap-osm',
          type: 'raster',
          source: 'osm',
          // Show OSM by default - it's working reliably
          minzoom: 0,
          maxzoom: 18,
        },
        {
          id: 'basemap-carto',
          type: 'raster',
          source: 'carto',
          layout: { visibility: 'none' },
          minzoom: 0,
          maxzoom: 18,
        },
        {
          id: 'basemap-tracestrack',
          type: 'raster',
          source: 'tracestrack-topo',
          layout: { visibility: 'none' },
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapRef.current as HTMLDivElement,
      style,
      center: [-112.074037, 33.448376], // Phoenix, AZ coordinates
      zoom: 8,
      maxZoom: 18,
      minZoom: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    // Keep map sized to container: observe container and window resizes
    const handleWindowResize = () => {
      try {
        map.resize();
      } catch {
        /* noop */
      }
    };
    window.addEventListener('resize', handleWindowResize);
    const ro = new ResizeObserver(() => handleWindowResize());
    if (mapRef.current) ro.observe(mapRef.current);

    // Robust basemap fallback: if OSM emits any load errors,
    // immediately switch to Carto to avoid a blank canvas.
    let baseSwitched = false;
    const switchToCarto = () => {
      if (baseSwitched) return;
      try {
        map.setLayoutProperty('basemap-osm', 'visibility', 'none');
        map.setLayoutProperty('basemap-carto', 'visibility', 'visible');
        baseSwitched = true;
        // eslint-disable-next-line no-console
        console.debug('Basemap fallback: OSM → Carto');
      } catch {
        /* noop */
      }
    };

    // General map error handler (covers a wide net of failures)
    map.on('error', (_e: maplibregl.ErrorEvent) => {
      // If OSM is the active layer and errors are bubbling, fall back.
      const vis = map.getLayoutProperty('basemap-osm', 'visibility');
      if (vis !== 'none') switchToCarto();
    });

    // Source-specific errors (when available)
    map.on('source.error' as any, (e: { sourceId?: string }) => {
      if (e && e.sourceId === 'osm') switchToCarto();
    });

    // Store map reference globally for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      (window as { __map?: maplibregl.Map }).__map = map;
    }
    setMapObj(map);

    function addAlertsLayer() {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      fetch(`${apiBase}/api/nws/alerts/active`)
        .then(r => {
          if (!r.ok) {
            throw new Error(`Failed to fetch alerts: ${r.status} ${r.statusText}`);
          }
          return r.json();
        })
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
        .catch((error) => {
          console.error('Failed to load NWS alerts:', error);
          // Could show user notification here in the future
        });
    }

    // Health check for GLM service
    async function checkGlmHealth(): Promise<boolean> {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiBase}/api/glm-toe/0/0/0.png`, { method: 'HEAD' });
        return response.status !== 503; // 503 means GLM TOE disabled
      } catch {
        return false;
      }
    }

    // Add GLM layer if service is available
    async function addGlmLayer() {
      const isGlmAvailable = await checkGlmHealth();
      if (!isGlmAvailable) {
        console.debug('GLM TOE service not available, skipping layer');
        return;
      }

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

        console.debug('GLM TOE layer added successfully');
      }
    }

    map.on('load', () => {
      addAlertsLayer();
      addGlmLayer(); // Only add if service is available
    });

    const interval = window.setInterval(addAlertsLayer, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      try {
        window.removeEventListener('resize', handleWindowResize);
        ro.disconnect();
      } catch {
        /* noop */
      }
      map.remove();
    };
  }, []);

  return (
  <div className="relative w-screen h-screen min-h-[100svh]">
      <div ref={mapRef} className="absolute inset-0" />
      <ForecastPopover />
      <Timeline layerId="goes-east" />
      <AstroPanel />
      <GlmLegend map={mapObj} />
      <AlertsLegend />
      <RainviewerLayer map={mapObj} />
    </div>
  );
}
