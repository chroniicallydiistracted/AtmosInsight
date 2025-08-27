import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import './App.css'

function App() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: mapContainer.current as HTMLDivElement,
      style: '/protomaps.json',
      center: [-122.447303, 37.753574],
      zoom: 11
    })

    return () => {
      map.remove()
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  return <div ref={mapContainer} className="map-container" />
}

export default App
