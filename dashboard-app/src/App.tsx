import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { PMTiles, Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import { Timeline } from './components/Timeline'
import { GlmLegend } from './components/GlmLegend'
import { AstroPanel } from './components/AstroPanel'
import { AlertsLegend } from './components/AlertsLegend'
import { RainviewerLayer } from './components/RainviewerLayer'

const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

export default function App() {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    const url = 'https://protomaps.github.io/basemaps/pmtiles/protomaps_2024-07-22-v4.pmtiles'
    protocol.add(new PMTiles(url))
    const styleE2E = {
      version: 8 as const,
      sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#111820' } }]
    }
    const styleUrlOrSpec: any = import.meta.env.VITE_E2E === '1'
      ? styleE2E
      : 'https://protomaps.github.io/basemaps/style.json'
    const map = new maplibregl.Map({
      container: mapRef.current as HTMLDivElement,
      style: styleUrlOrSpec,
      center: [0, 0],
      zoom: 1
    })
    ;(window as any).__map = map
    setMapObj(map)

    function addAlertsLayer() {
      fetch('/api/nws/alerts/active')
        .then((r) => r.json())
        .then((geojson) => {
          if (!map.getSource('nws-alerts')) {
            map.addSource('nws-alerts', {
              type: 'geojson',
              data: geojson
            } as any)

            // Fill polygons by severity
            map.addLayer({
              id: 'nws-alerts-fill',
              type: 'fill',
              source: 'nws-alerts',
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: {
                'fill-color': [
                  'match', ['get', 'severity'],
                  'Extreme', '#7f0000',
                  'Severe', '#d7301f',
                  'Moderate', '#fc8d59',
                  'Minor', '#fdcc8a',
                  /* other */ '#bdbdbd'
                ],
                'fill-opacity': 0.35
              }
            } as any)

            // Outline
            map.addLayer({
              id: 'nws-alerts-line',
              type: 'line',
              source: 'nws-alerts',
              filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'LineString']],
              paint: {
                'line-color': '#444',
                'line-width': 1
              }
            } as any)

            // Points (if any)
            map.addLayer({
              id: 'nws-alerts-point',
              type: 'circle',
              source: 'nws-alerts',
              filter: ['==', ['geometry-type'], 'Point'],
              paint: {
                'circle-color': '#08519c',
                'circle-radius': 4,
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1
              }
            } as any)

            const clickTargets = ['nws-alerts-fill', 'nws-alerts-line', 'nws-alerts-point']
            clickTargets.forEach((id) => {
              map.on('click', id, (e) => {
                const f = e.features?.[0]
                if (!f) return
                const p = f.properties as any
                const html = `
                  <strong>${p?.event ?? 'Alert'}</strong><br/>
                  Severity: ${p?.severity ?? 'Unknown'}<br/>
                  ${p?.headline ? `<em>${p.headline}</em><br/>` : ''}
                  ${p?.areaDesc ?? ''}
                `
                new maplibregl.Popup().setLngLat((e.lngLat as any)).setHTML(html).addTo(map)
              })

              map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
              map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
            })
          } else {
            const src = map.getSource('nws-alerts') as any
            src.setData(geojson)
          }
        })
        .catch(() => {})
    }

    map.on('load', () => {
      addAlertsLayer()

      // GLM TOE raster tiles (from proxy)
      const glmSourceId = 'glm_toe'
      if (!map.getSource(glmSourceId)) {
        map.addSource(glmSourceId, {
          type: 'raster',
          tiles: [
            `${location.origin}/api/glm-toe/{z}/{x}/{y}.png?window=5m`
          ],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 10
        } as any)
        map.addLayer({
          id: 'glm_toe_layer',
          type: 'raster',
          source: glmSourceId,
          paint: {
            'raster-opacity': 0.85,
            'raster-resampling': 'linear'
          }
        } as any)
      }
    })

    const interval = window.setInterval(addAlertsLayer, 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
      map.remove()
    }
  }, [])

  return (
    <div>
      <div ref={mapRef} className="map-container" />
      <Timeline layerId="goes-east" />
      <AstroPanel />
      <GlmLegend map={mapObj} />
      <AlertsLegend />
      <RainviewerLayer map={mapObj} />
    </div>
  )
}
