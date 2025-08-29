import { useEffect, useMemo, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import type { RasterLayerSpecification, RasterSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import { clampFps, frameDelayMs, isPlayable, nextIndex, prefetchSchedule, DEFAULT_FPS } from '../utils/playback';
import { createTileCache, loadImage } from '../utils/tileCache';

interface RainviewerLayerProps {
  map: maplibregl.Map | null;
}

type Frame = { time: number; path: string };
type RadarIndex = {
  host: string;
  radar: { past: Frame[]; nowcast?: Frame[] };
};

function lonLatToTile(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const xtile = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const ytile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: xtile, y: ytile };
}

export function RainviewerLayer({ map }: RainviewerLayerProps) {
  const [frames, setFrames] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const size = '256';
  const color = '3';
  const options = '1_0';
  const fps = useMemo(() => clampFps(Number(import.meta.env.VITE_PLAYBACK_FPS) || DEFAULT_FPS), []);
  const delay = useMemo(() => frameDelayMs(fps), [fps]);
  const cache = useMemo(() => createTileCache({ enabled: true, max: 64 }), []);

  // Load index
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/rainviewer/index.json');
        const json: RadarIndex = await res.json();
        const list = [...(json.radar.past || []), ...((json.radar.nowcast || []))].map((f) => f.time);
        if (!cancelled) setFrames(list);
      } catch { void 0; }
    }
    load();
    const interval = window.setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Playback ticker
  useEffect(() => {
    if (!playing) return;
    if (!isPlayable(frames, null)) return;
    timerRef.current = window.setInterval(() => setI((v) => nextIndex(v, frames.length)), delay) as unknown as number;
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [playing, frames, delay]);

  // Apply tiles for current frame (wait for style load)
  useEffect(() => {
    if (!map) return;
    if (frames.length === 0) return;
    const ts = String(frames[i]);
    const srcId = 'rainviewer';
    const layerId = 'rainviewer_layer';
    const tiles = [`${location.origin}/api/rainviewer/${ts}/${size}/{z}/{x}/{y}/${color}/${options}.png`];
    const vis = visible ? 'visible' : 'none';
    const apply = () => {
      const source = map.getSource(srcId) as unknown;
      try {
        if (source && typeof (source as { setTiles?: unknown }).setTiles === 'function') {
          (source as { setTiles: (t: string[]) => void }).setTiles(tiles);
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
          return;
        }
      } catch { void 0; }
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      } catch { void 0; }
      try {
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch { void 0; }
      try {
        map.addSource(srcId, { type: 'raster', tiles, tileSize: 256, minzoom: 0, maxzoom: 12 } as RasterSourceSpecification);
        map.addLayer({ id: layerId, type: 'raster', source: srcId, paint: { 'raster-opacity': 0.8, 'raster-resampling': 'linear' } } as RasterLayerSpecification);
        map.setLayoutProperty(layerId, 'visibility', vis);
      } catch { void 0; }
    };
    if (typeof (map as unknown as { isStyleLoaded?: () => boolean }).isStyleLoaded === 'function' && !map.isStyleLoaded()) {
      map.once('load', apply);
      return;
    }
    apply();
  }, [map, frames, i, visible]);

  // Prefetch next frame in a small neighborhood around the center tile
  useEffect(() => {
    if (!map) return;
    if (frames.length === 0) return;
    const [next] = prefetchSchedule(frames.length, i);
    if (next === undefined) return;
    const t = frames[next];
    const z = Math.round(map.getZoom());
    const center = map.getCenter();
    const { x, y } = lonLatToTile(center.lng, center.lat, z);
    const n = Math.pow(2, z);
    const radius = 1; // prefetch 3x3 neighborhood
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = (x + dx + n) % n;
        const ty = Math.min(n - 1, Math.max(0, y + dy));
        const url = `${location.origin}/api/rainviewer/${t}/${size}/${z}/${tx}/${ty}/${color}/${options}.png`;
        loadImage(url, cache).catch(() => {});
      }
    }
  }, [map, frames, i, cache]);

  if (frames.length === 0) return null;
  const playable = isPlayable(frames, null);

  return (
    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: 10, borderRadius: 8, fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Radar</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          <span>Visible</span>
        </label>
        <button onClick={() => setPlaying((p) => !p)} disabled={!playable}>
          {playing ? `Pause (${fps} fps)` : 'Play'}
        </button>
        <a href="/learn/radar.md" target="_blank" rel="noreferrer" style={{ color: '#9cf', textDecoration: 'none' }}>Learn</a>
      </div>
    </div>
  );
}
