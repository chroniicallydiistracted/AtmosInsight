import { useEffect, useState } from 'react';

interface TimelineProps {
  layerId: string;
}

export function Timeline({ layerId }: TimelineProps) {
  const [times, setTimes] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

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

  useEffect(() => {
    let frame: number;
    function tick() {
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const prefetch = (i: number) => {
      for (let offset = -2; offset <= 2; offset++) {
        const t = times[i + offset];
        if (t) {
          const url = `/tiles/${layerId}/${t}.png`;
          const img = new Image();
          img.src = url;
        }
      }
    };
    if (times.length > 0) {
      prefetch(index);
    }
  }, [index, times, layerId]);

  if (times.length === 0) return null;

  return (
    <input
      aria-label="timeline"
      type="range"
      min={0}
      max={times.length - 1}
      value={index}
      onChange={(e) => setIndex(Number(e.target.value))}
    />
  );
}
