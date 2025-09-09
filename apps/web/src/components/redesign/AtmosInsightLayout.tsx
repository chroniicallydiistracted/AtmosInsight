"use client";
import React, { useState, useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

// Import your components
import { Navigation } from './Navigation';
import { LayersPanel } from './Layers';
import { InfoPanel } from './InfoPanel';
import { TimelineControl } from './TimelineControl';
import { OwmPrecipLayer } from '@/components/OwmPrecipLayer';
import { ProvidersPanel } from '@/components/ProvidersPanel';

export function AtmosInsightLayout() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [precipVisible, setPrecipVisible] = useState(false);
  const [precipOpacity, setPrecipOpacity] = useState(70);
  const [showProviders, setShowProviders] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

  // Build basemap tile URL: use Tracestrack via our proxy (relative path works behind CloudFront)
  const basemapTileUrl = (apiBase ? `${apiBase}` : '') + '/api/tracestrack/topo_en/{z}/{x}/{y}.webp';

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          'tracestrack-topo': {
            type: 'raster',
      // Always go through our proxy API (relative works in production via CloudFront path routing)
      tiles: [basemapTileUrl],
            tileSize: 256,
            attribution: '© Tracestrack, © OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'tracestrack-topo-layer',
          type: 'raster',
          source: 'tracestrack-topo',
          minzoom: 0,
          maxzoom: 20
        }]
      },
      center: [-112.074037, 33.448376], // Phoenix, AZ
      zoom: 8,
      attributionControl: false
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: false
    }), 'top-right');

    map.addControl(new maplibregl.AttributionControl({
      compact: true
    }), 'bottom-right');

    map.on('load', () => {
      setLoading(false);
    });

    // Handle map clicks
    map.on('click', (e) => {
      setCurrentLocation({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });

    setMapObj(map);

    return () => {
      map.remove();
    };
  }, []);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  const handleLayerToggle = (layerId: string, active: boolean) => {
    if (!mapObj) return;
    // Map UI IDs to actual map layer IDs (lightning removed until implemented)
    const mapLayerId = layerId === 'radar' ? 'owm-precip-layer' : layerId;

    if (layerId === 'radar') {
      setPrecipVisible(active);
    }

    if (mapObj.getLayer(mapLayerId)) {
      mapObj.setLayoutProperty(mapLayerId, 'visibility', active ? 'visible' : 'none');
    }
  };

  const handleLayerSettingsChange = (layerId: string, settings: { opacity?: number }) => {
    if (layerId === 'radar' && typeof settings.opacity === 'number') {
      setPrecipOpacity(settings.opacity);
    }
  };

  const handleModeChange = (mode: 'live' | 'forecast' | 'historical') => {
    console.log('Mode changed to:', mode);
    // Handle mode change logic
  };

  const handleTimeChange = (time: Date) => {
    console.log('Time changed to:', time);
    // Handle time change logic
  };

  const handleMyLocation = () => {
    if (currentLocation && mapObj) {
      mapObj.flyTo({
        center: [currentLocation.lon, currentLocation.lat],
        zoom: 12,
        duration: 1000
      });
    }
  };

  const handleZoomIn = () => {
    if (mapObj) {
      mapObj.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapObj) {
      mapObj.zoomOut();
    }
  };

  return (
    <div className="relative w-screen h-screen min-h-[100svh] bg-slate-900">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

  {/* Data Layers mounted to map */}

  {/* OWM precipitation layer */}
  <OwmPrecipLayer map={mapObj} visible={precipVisible} opacity={precipOpacity} />

      {/* Top Navigation */}
      <Navigation 
        onModeChange={handleModeChange}
        onSearchClick={() => console.log('Search clicked')}
        onSettingsClick={() => console.log('Settings clicked')}
      />

      {/* Left Sidebar - Layers Panel */}
  <LayersPanel 
        onLayerToggle={handleLayerToggle}
        onLayerSettingsChange={handleLayerSettingsChange}
        onAddCustomLayer={() => setShowProviders(true)}
      />

      {/* Right Sidebar - Info Panel */}
      <InfoPanel 
        location={currentLocation ?? undefined}
        onDetailsClick={(section) => console.log('Details clicked:', section)}
      />

      {/* Bottom Timeline Control */}
      <TimelineControl 
        onTimeChange={handleTimeChange}
        onPlaybackSpeedChange={(speed) => console.log('Speed changed:', speed)}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 z-30 glass md:hidden">
        <div className="flex items-center justify-around py-2">
          <button className="p-3 rounded-lg hover:bg-white/10 smooth-transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          <button className="p-3 rounded-lg hover:bg-white/10 smooth-transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-3 rounded-lg hover:bg-white/10 smooth-transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-3 rounded-lg hover:bg-white/10 smooth-transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Floating Quick Actions */}
      <div className="absolute bottom-32 right-4 z-20 space-y-2 md:bottom-24">
        {/* Location Button */}
        <button 
          onClick={handleMyLocation}
          className="w-12 h-12 rounded-full glass flex items-center justify-center hover:scale-110 smooth-transition group"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="absolute right-14 px-2 py-1 rounded bg-gray-900 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 smooth-transition">
            My Location
          </span>
        </button>

        {/* Zoom Controls */}
        <div className="glass rounded-full p-1">
          <button 
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-full hover:bg-white/10 smooth-transition flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-full hover:bg-white/10 smooth-transition flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-xl p-8 flex flex-col items-center space-y-4">
            <div className="spinner"></div>
            <p className="text-sm">Loading weather data...</p>
          </div>
        </div>
      )}
      {showProviders && (
        <ProvidersPanel onClose={() => setShowProviders(false)} />
      )}
    </div>
  );
}

export default AtmosInsightLayout;