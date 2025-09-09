"use client";
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapCanvasProps {
  onClickLocation?: (lngLat: { lon: number; lat: number }) => void;
}

export function MapCanvas({ onClickLocation }: MapCanvasProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current as HTMLDivElement,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© CARTO",
          },
        },
        layers: [
          { id: "carto-dark-layer", type: "raster", source: "carto-dark", minzoom: 0, maxzoom: 20 },
        ],
      },
      center: [-112.074037, 33.448376],
      zoom: 8,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", () => setLoading(false));
    map.on("click", (e) => onClickLocation?.({ lon: e.lngLat.lng, lat: e.lngLat.lat }));
    mapRef.current = map;
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
    };
  }, [onClickLocation]);

  const zoomIn = () => mapRef.current?.zoomIn({ duration: 200 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 200 });

  return (
    <>
      <div ref={ref} className="absolute inset-0" />

      {/* Floating Quick Actions */}
      <div className="absolute bottom-32 right-4 z-20 space-y-2 md:bottom-24">
        <button className="w-12 h-12 rounded-full glass flex items-center justify-center hover:scale-110 smooth-transition group" onClick={() => navigator.geolocation?.getCurrentPosition((p) => mapRef.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: Math.max((mapRef.current?.getZoom() ?? 8), 10), duration: 600 }))}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span className="absolute right-14 px-2 py-1 rounded bg-gray-900 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 smooth-transition">My Location</span>
        </button>
        <div className="glass rounded-full p-1">
          <button className="w-10 h-10 rounded-full hover:bg-white/10 smooth-transition flex items-center justify-center" onClick={zoomIn}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6"></path></svg>
          </button>
          <button className="w-10 h-10 rounded-full hover:bg-white/10 smooth-transition flex items-center justify-center" onClick={zoomOut}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6"></path></svg>
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-xl p-8 flex flex-col items-center space-y-4">
            <div className="spinner" />
            <p className="text-sm">Loading weather data...</p>
          </div>
        </div>
      )}
    </>
  );
}

export default MapCanvas;

