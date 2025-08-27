import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { PMTiles, Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

export default function App() {
  const mapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const url = 'https://protomaps.github.io/basemaps/pmtiles/protomaps_2024-07-22-v4.pmtiles'
    protocol.add(new PMTiles(url))
    const map = new maplibregl.Map({
      container: mapRef.current as HTMLDivElement,
      style: 'https://protomaps.github.io/basemaps/style.json',
      center: [0, 0],
      zoom: 1
    })
    return () => map.remove()
  }, [])

  return <div ref={mapRef} className="map-container" />
}
