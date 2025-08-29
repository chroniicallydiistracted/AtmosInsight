'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import type { RasterLayerSpecification, RasterSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import { clampFps, frameDelayMs, isPlayable, nextIndex, prefetchSchedule, DEFAULT_FPS } from '@/lib/utils/playback';
import { createTileCache, loadImage } from '@/lib/utils/tileCache';

interface RainviewerLayerProps {
  map: maplibregl.Map | null;
}

export function RainviewerLayer({ map }: RainviewerLayerProps) {
  const [frames, setFrames] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const fps = useMemo(() => clampFps(Number(process.env.NEXT_PUBLIC_PLAYBACK_FPS) || DEFAULT_FPS), []);
  const delay = useMemo(() => frameDelayMs(fps), [fps]);
  const cache = useMemo(() => createTileCache({
    enabled: String(process.env.NEXT_PUBLIC_ENABLE_TILE_CACHE || '').toLowerCase() === 'true',
    max: Math.max(8, Number(process.env.NEXT_PUBLIC_TILE_CACHE_SIZE) || 64)
  }), []);

  // Load RainViewer frames
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const res = await fetch(`${apiBase}/api/rainviewer/index.json`);
        const data = await res.json();
        if (!cancelled) {
          const pastFrames = data.radar.past?.map((f: { time: number }) => f.time) || [];
          const nowcastFrames = data.radar.nowcast?.map((f: { time: number }) => f.time) || [];
          setFrames([...pastFrames, ...nowcastFrames]);
        }
      } catch (error) {
        if (!cancelled) setLastError(String(error));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Playback ticker
  useEffect(() => {
    if (!playing) return;
    if (!isPlayable(frames, lastError)) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => nextIndex(i, frames.length));
    }, delay) as unknown as number;
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, frames, lastError, delay]);

  // Prefetch next frame
  useEffect(() => {
    if (frames.length === 0 || !map) return;
    const toPrefetch = prefetchSchedule(frames.length, index);
    for (const idx of toPrefetch) {
      const t = frames[idx];
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const url = `${apiBase}/api/rainviewer/${t}/256/${map.getZoom()}/${Math.floor(map.getCenter().lng)}/${Math.floor(map.getCenter().lat)}/0/1_0.png`;
      loadImage(url, cache).catch((e) => setLastError(String(e)));
    }
  }, [index, frames, map, cache]);

  // Add/remove RainViewer layer
  useEffect(() => {
    if (!map) return;

    const sourceId = 'rainviewer';
    const layerId = 'rainviewer-layer';

    if (visible && frames.length > 0) {
      // Add source if it doesn't exist
      if (!map.getSource(sourceId)) {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [`${apiBase}/api/rainviewer/{z}/{x}/{y}/256/0/1_0.png`],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 10
        } as RasterSourceSpecification);
      }

      // Add layer if it doesn't exist
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.7,
            'raster-resampling': 'linear'
          }
        } as RasterLayerSpecification);
      }
    } else {
      // Remove layer and source
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  }, [map, visible, frames]);

  if (frames.length === 0) return null;

  const playable = isPlayable(frames, lastError);

  return (
    <div className="panel absolute top-4 left-4 p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <strong>Radar</strong>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-xs">Visible</span>
        </label>
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={!playable}
          className="px-2 py-1 rounded hairline hover:bg-white/10 disabled:opacity-50 text-xs"
        >
          {playing ? `Pause (${fps} fps)` : 'Play'}
        </button>
        <a 
          href="/learn/radar.md" 
          target="_blank" 
          rel="noreferrer" 
          className="text-blue-300 hover:text-blue-200 text-xs"
        >
          Learn
        </a>
      </div>
      
      {!playing && (
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-full mt-2"
        />
      )}
    </div>
  );
}
