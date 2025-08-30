import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clampFps,
  frameDelayMs,
  isPlayable,
  nextIndex,
  prefetchSchedule,
  DEFAULT_FPS,
} from '../utils/playback';
import { createTileCache, loadImage } from '../utils/tileCache';

interface TimelineProps {
  layerId: string;
}

export function Timeline({ layerId }: TimelineProps) {
  const [times, setTimes] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const fps = useMemo(
    () => clampFps(Number(import.meta.env.VITE_PLAYBACK_FPS) || DEFAULT_FPS),
    []
  );
  const delay = useMemo(() => frameDelayMs(fps), [fps]);
  const cache = useMemo(
    () =>
      createTileCache({
        enabled:
          String(import.meta.env.VITE_ENABLE_TILE_CACHE || '').toLowerCase() ===
          'true',
        max: Math.max(8, Number(import.meta.env.VITE_TILE_CACHE_SIZE) || 64),
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/catalog/layers/${layerId}/times?limit=10`);
      const json: string[] = await res.json();
      if (!cancelled) setTimes(json);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [layerId]);

  // Playback ticker
  useEffect(() => {
    if (!playing) return;
    if (!isPlayable(times, lastError)) return;
    timerRef.current = window.setInterval(() => {
      setIndex(i => nextIndex(i, times.length));
    }, delay) as unknown as number;
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, times, lastError, delay]);

  // Prefetch next frame
  useEffect(() => {
    if (times.length === 0) return;
    const toPrefetch = prefetchSchedule(times.length, index);
    for (const idx of toPrefetch) {
      const t = times[idx];
      const url = `/tiles/${layerId}/${t}.png`;
      loadImage(url, cache).catch(e => setLastError(String(e)));
    }
  }, [index, times, layerId, cache]);

  if (times.length === 0) return null;

  const playable = isPlayable(times, lastError);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        aria-label={playing ? 'pause' : 'play'}
        onClick={() => setPlaying(p => !p)}
        disabled={!playable}
      >
        {playing ? 'Pause' : `Play (${fps} fps)`}
      </button>
      <input
        aria-label="timeline"
        type="range"
        min={0}
        max={times.length - 1}
        value={index}
        onChange={e => setIndex(Number(e.target.value))}
        style={{ flex: 1 }}
      />
    </div>
  );
}
