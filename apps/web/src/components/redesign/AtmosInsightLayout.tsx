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
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'live' | 'forecast' | 'historical'>('live');
  const [basemap, setBasemap] = useState<'tracestrack' | 'carto'>('tracestrack');
  // Historical satellite overlay (GIBS) and forecast indicator
  const [gibsTime, setGibsTime] = useState<string | null>(null);
  const [gibsVisible, setGibsVisible] = useState(false);
  const [forecastHours, setForecastHours] = useState(0);
  const errorCountRef = useRef<{[k: string]: { count: number; firstAt: number }}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: number; lon: number }>>([]);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // Build GIBS GOES-East tile URL (time-aware). timeISO=null selects default latest.
  const buildGibsGoesTileUrl = (timeISO: string | null) => {
    const base = apiBase ? `${apiBase}` : '';
    if (!timeISO) {
      // No time -> "default" best layer
      return `${base}/api/gibs/tile/3857/GOES-East_ABI_GeoColor/GoogleMapsCompatible/{z}/{y}/{x}.png`;
    }
    return `${base}/api/gibs/tile/3857/GOES-East_ABI_GeoColor/${encodeURIComponent(timeISO)}/GoogleMapsCompatible/{z}/{y}/{x}.png`;
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

  // Build basemap tile URLs: primary Tracestrack via proxy; fallback Carto via proxy
  const tracesTileUrl = (apiBase ? `${apiBase}` : '') + '/api/tracestrack/topo_en/{z}/{x}/{y}.webp';
  const cartoTileUrl = (apiBase ? `${apiBase}` : '') + '/api/basemap/carto/light_all/{z}/{x}/{y}.png';

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          'tracestrack-topo': {
            type: 'raster',
            // Always go through our proxy API (relative works in production via CloudFront path routing)
            tiles: [tracesTileUrl],
            tileSize: 256,
            attribution: '© Tracestrack, © OpenStreetMap contributors'
          },
          'carto-light': {
            type: 'raster',
            tiles: [cartoTileUrl],
            tileSize: 256,
            attribution: '© CARTO, © OpenStreetMap contributors'
          },
          'gibs-goes-east': {
            type: 'raster',
            tiles: [buildGibsGoesTileUrl(gibsTime)],
            tileSize: 256,
            attribution: 'Imagery © NASA GIBS/NOAA'
          }
        },
        layers: [
          {
            id: 'tracestrack-topo-layer',
            type: 'raster',
            source: 'tracestrack-topo',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'visible' }
          },
          {
            id: 'carto-light-layer',
            type: 'raster',
            source: 'carto-light',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          {
            id: 'gibs-goes-east-layer',
            type: 'raster',
            source: 'gibs-goes-east',
            minzoom: 0,
            maxzoom: 10,
            layout: { visibility: 'none' }
          }
        ]
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

  // Count tile errors per source and fallback basemap if needed
    map.on('error', (e) => {
      // We only care about tile load errors on the tracestrack source
      const sourceId = (e as { sourceId?: string } | undefined)?.sourceId ?? '';
      if (sourceId !== 'tracestrack-topo') return;
      const now = Date.now();
      const slot = errorCountRef.current[sourceId] || { count: 0, firstAt: now };
  // Reset the window if > 3s passed
  if (now - slot.firstAt > 3000) {
        slot.count = 0;
        slot.firstAt = now;
      }
      slot.count += 1;
      errorCountRef.current[sourceId] = slot;
  if (slot.count >= 4 && basemap === 'tracestrack') {
        console.warn('[basemap] Too many tile errors for Tracestrack; switching to Carto fallback');
        setBasemap('carto');
      }
    });

    // Handle map clicks
    map.on('click', (e) => {
      setCurrentLocation({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });

    setMapObj(map);

    return () => {
      map.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to basemap changes by toggling layer visibility
  useEffect(() => {
    if (!mapObj) return;
    const showTraces = basemap === 'tracestrack' ? 'visible' : 'none';
    const showCarto = basemap === 'carto' ? 'visible' : 'none';
    if (mapObj.getLayer('tracestrack-topo-layer')) {
      mapObj.setLayoutProperty('tracestrack-topo-layer', 'visibility', showTraces);
    }
    if (mapObj.getLayer('carto-light-layer')) {
      mapObj.setLayoutProperty('carto-light-layer', 'visibility', showCarto);
    }
  }, [basemap, mapObj]);

  // Toggle GIBS overlay visibility
  useEffect(() => {
    if (!mapObj) return;
    if (mapObj.getLayer('gibs-goes-east-layer')) {
      mapObj.setLayoutProperty('gibs-goes-east-layer', 'visibility', gibsVisible ? 'visible' : 'none');
    }
  }, [gibsVisible, mapObj]);

  // Refresh GIBS tiles on time change
  const refreshGibsTiles = (timeISO: string | null) => {
    if (!mapObj) return;
    const sourceId = 'gibs-goes-east';
    const layerId = 'gibs-goes-east-layer';
    try {
      if (mapObj.getLayer(layerId)) mapObj.removeLayer(layerId);
    } catch {}
    try {
      if (mapObj.getSource(sourceId)) mapObj.removeSource(sourceId);
    } catch {}
    mapObj.addSource(
      sourceId,
      {
        type: 'raster',
        tiles: [buildGibsGoesTileUrl(timeISO)],
        tileSize: 256,
        attribution: 'Imagery © NASA GIBS/NOAA'
      } as unknown as maplibregl.RasterSourceSpecification
    );
    mapObj.addLayer({ id: layerId, type: 'raster', source: sourceId, minzoom: 0, maxzoom: 10, layout: { visibility: gibsVisible ? 'visible' : 'none' } });
  };

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

  const handleModeChange = (m: 'live' | 'forecast' | 'historical') => {
    setMode(m);
    console.log('Mode changed to:', m);
    if (m === 'historical') {
      setPrecipVisible(false);
      setGibsVisible(true);
      setGibsTime(null);
      refreshGibsTiles(null);
    } else if (m === 'forecast') {
      setGibsVisible(false);
      setPrecipVisible(true);
      setForecastHours(0);
    } else {
      // live
      setGibsVisible(false);
      setPrecipVisible(true);
    }
  };

  // Debounced search to /api/search
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const q = searchQuery.trim();
    if (!showSearch) return;
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
  setSearchActiveIndex(-1);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase ? apiBase : ''}/api/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  type SearchResult = { display_name: string; lat: number; lon: number };
  const results = Array.isArray((data as { results?: unknown })?.results) ? (data as { results: SearchResult[] }).results : [];
  const mapped: SearchResult[] = results.map((r) => ({ display_name: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }));
  setSearchResults(mapped);
  setSearchActiveIndex(mapped.length > 0 ? 0 : -1);
      } catch (e) {
        setSearchError(String(e));
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (timer) clearTimeout(timer); };
  }, [searchQuery, showSearch, apiBase]);

  const handleSelectSearch = (lat: number, lon: number) => {
    if (!mapObj) return;
    mapObj.flyTo({ center: [lon, lat], zoom: 10, duration: 900 });
  };

  const handleTimeChange = (time: Date) => {
    if (mode === 'historical') {
      const iso = time.toISOString();
      setGibsTime(iso);
      refreshGibsTiles(iso);
    } else if (mode === 'forecast') {
      const diffMs = time.getTime() - Date.now();
      const hrs = Math.round(diffMs / 3600000);
      setForecastHours(Math.max(0, hrs));
    }
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
        activeMode={mode}
        onModeChange={handleModeChange}
        onSearchClick={() => setShowSearch(true)}
        onSettingsClick={() => setShowSettings(true)}
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
        disabled={mode === 'live'}
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
      {showSearch && (
        <aside className="absolute right-4 top-24 bottom-24 w-[26rem] z-30 animate-slide-in-right">
          <div className="glass rounded-xl h-full flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 data-testid="search-header" className="text-sm font-semibold">Search</h2>
              <button onClick={() => setShowSearch(false)} className="px-2 py-1 rounded hairline hover:bg-white/10 text-xs">Close</button>
            </div>
            <div className="p-3 flex-1 flex flex-col overflow-hidden">
              <form onSubmit={(e) => {
                e.preventDefault();
                const q = searchQuery.trim();
                const m = q.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
                if (m) {
                  const lat = parseFloat(m[1]);
                  const lon = parseFloat(m[2]);
                  if (!Number.isNaN(lat) && !Number.isNaN(lon)) handleSelectSearch(lat, lon);
                } else if (searchActiveIndex >= 0 && searchResults[searchActiveIndex]) {
                  const sel = searchResults[searchActiveIndex];
                  handleSelectSearch(sel.lat, sel.lon);
                }
              }}>
                <input
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSearchActiveIndex((i) => Math.min(searchResults.length - 1, (i < 0 ? 0 : i + 1)));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSearchActiveIndex((i) => Math.max(0, (i <= 0 ? 0 : i - 1)));
                    }
                  }}
                  placeholder="Search places or enter lat,lon (33.45,-112.07)"
                  className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm focus:outline-none"
                />
              </form>
              <div className="mt-2 text-xs text-gray-400">Type to search. Enter a coordinate pair to jump directly.</div>
              <div className="mt-3 flex-1 overflow-auto custom-scrollbar">
                {searchLoading && <div className="text-xs text-gray-400">Searching…</div>}
                {searchError && <div className="text-xs text-red-400">{searchError}</div>}
                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <ul className="space-y-2">
        {searchResults.map((r, idx) => (
                      <li key={`${r.display_name}-${idx}`}>
                        <button
                          data-testid="search-result"
          className={`w-full text-left p-2 rounded hover:bg-white/10 ${idx === searchActiveIndex ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                          onClick={() => handleSelectSearch(r.lat, r.lon)}
                        >
                          <div className="text-sm">{r.display_name}</div>
                          <div className="text-[11px] text-gray-400">{r.lat.toFixed(4)}, {r.lon.toFixed(4)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchLoading && !searchError && searchQuery && searchResults.length === 0 && (
                  <div className="text-xs text-gray-500">No results</div>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
      {mode === 'forecast' && (
        <div className="absolute top-4 left-4 z-20">
          <div className="glass rounded-full px-3 py-1 text-xs">Forecast: T+{forecastHours}h</div>
        </div>
      )}
      {showSettings && (
        <aside className="absolute right-4 top-24 bottom-24 w-[26rem] z-30 animate-slide-in-right">
          <div className="glass rounded-xl h-full flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 data-testid="settings-header" className="text-sm font-semibold">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="px-2 py-1 rounded hairline hover:bg-white/10 text-xs">Close</button>
            </div>
            <div className="p-3 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span>Units</span>
                <select className="px-2 py-1 rounded bg-white/10 text-xs" defaultValue={(typeof window !== 'undefined' && localStorage.getItem('units')) || 'Imperial'} onChange={(e) => {
                  try { localStorage.setItem('units', e.target.value); } catch {}
                }}>
                  <option>Imperial</option>
                  <option>Metric</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <select className="px-2 py-1 rounded bg-white/10 text-xs" defaultValue={(typeof window !== 'undefined' && localStorage.getItem('theme')) || 'System'} onChange={(e) => {
                  try { localStorage.setItem('theme', e.target.value); } catch {}
                }}>
                  <option>System</option>
                  <option>Dark</option>
                  <option>Light</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">More settings soon.</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default AtmosInsightLayout;