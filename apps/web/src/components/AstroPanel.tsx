'use client';
import { useEffect, useMemo, useState } from 'react';
import { computeAstro } from '@/lib/astro/astro';

export function AstroPanel() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos =>
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setCoords({ lat: 0, lon: 0 }),
        { enableHighAccuracy: false, maximumAge: 600_000 }
      );
    } else {
      setCoords({ lat: 0, lon: 0 });
    }
  }, [mounted]);

  const astro = useMemo(() => {
    if (!now) return null;
    const lat = coords?.lat ?? 0;
    const lon = coords?.lon ?? 0;
    return computeAstro({ date: now, lat, lon });
  }, [coords, now]);

  const deg = (rad: number) => (rad * 180) / Math.PI;

  if (!mounted || !astro) {
    return (
      <div className="panel absolute top-4 left-4 p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <strong>Astronomy</strong>
          <a
            href="/learn/astro"
            aria-label="Learn about Sun/Moon"
            className="text-blue-300 hover:text-blue-200 text-xs"
          >
            Learn
          </a>
        </div>
        <div className="space-y-1 text-xs">
          <div>Loading astronomical data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel absolute top-4 left-4 p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <strong>Astronomy</strong>
        <a
          href="/learn/astro"
          aria-label="Learn about Sun/Moon"
          className="text-blue-300 hover:text-blue-200 text-xs"
        >
          Learn
        </a>
      </div>
      <div className="space-y-1 text-xs">
        <div>
          Sun: az {deg(astro.sun.azimuth_rad).toFixed(1)}°, el{' '}
          {deg(astro.sun.elevation_rad).toFixed(1)}°
        </div>
        <div>
          Moon: az {deg(astro.moon.azimuth_rad).toFixed(1)}°, el{' '}
          {deg(astro.moon.elevation_rad).toFixed(1)}°, dist{' '}
          {(astro.moon.distance_m / 1000).toFixed(0)} km, phase{' '}
          {Math.round(astro.moon.phase_fraction * 100)}%
        </div>
      </div>
    </div>
  );
}
