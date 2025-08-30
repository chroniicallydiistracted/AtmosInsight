import { useEffect, useMemo, useState } from 'react';
import { computeAstro } from '../astro/astro';

export function AstroPanel() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos =>
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setCoords({ lat: 0, lon: 0 }),
        { enableHighAccuracy: false, maximumAge: 600_000 }
      );
    } else {
      setCoords({ lat: 0, lon: 0 });
    }
  }, []);

  const astro = useMemo(() => {
    const lat = coords?.lat ?? 0;
    const lon = coords?.lon ?? 0;
    return computeAstro({ date: now, lat, lon });
  }, [coords, now]);

  const deg = (rad: number) => (rad * 180) / Math.PI;

  return (
    <div style={{ padding: 8, fontSize: 12, lineHeight: 1.4 }}>
      <strong>Astronomy</strong> ·{' '}
      <a href="/learn/astro" aria-label="Learn about Sun/Moon">
        Learn
      </a>
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
  );
}
