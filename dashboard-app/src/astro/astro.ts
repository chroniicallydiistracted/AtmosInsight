import SunCalc from 'suncalc';

export interface AstroInput {
  date: Date;
  lat: number; // degrees
  lon: number; // degrees
}

export interface AstroOutput {
  sun: {
    azimuth_rad: number;
    elevation_rad: number;
  };
  moon: {
    azimuth_rad: number;
    elevation_rad: number;
    distance_m: number;
    phase_fraction: number; // 0..1 (0=new, 0.5=full)
  };
}

export function computeAstro({ date, lat, lon }: AstroInput): AstroOutput {
  const sunPos = SunCalc.getPosition(date, lat, lon);
  const moonPos = SunCalc.getMoonPosition(date, lat, lon);
  const moonIllum = SunCalc.getMoonIllumination(date);
  return {
    sun: {
      azimuth_rad: sunPos.azimuth, // radians
      elevation_rad: sunPos.altitude, // radians
    },
    moon: {
      azimuth_rad: moonPos.azimuth,
      elevation_rad: moonPos.altitude,
      distance_m: moonPos.distance * 1000, // km -> m
      phase_fraction: moonIllum.phase,
    },
  };
}
