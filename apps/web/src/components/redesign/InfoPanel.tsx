"use client";
import React, { useEffect, useState } from "react";

interface InfoPanelProps {
  location?: { lat: number; lon: number };
  onDetailsClick?: (section: string) => void;
}

export function InfoPanel({ location, onDetailsClick }: InfoPanelProps) {
  const [conditions, setConditions] = useState({
    temperature: 72,
    humidity: 65,
    windSpeed: 12,
    airQuality: "Good",
    location: "Phoenix, AZ",
  });
  const [astronomy, setAstronomy] = useState({
    sun: { azimuth: 245, elevation: 35 },
    moon: { azimuth: 120, elevation: 45, phase: 67 },
  });
  const [alerts, setAlerts] = useState([
    { id: "1", type: "severe", title: "Heat Advisory", description: "Until 8:00 PM MST" },
    { id: "2", type: "moderate", title: "Air Quality Alert", description: "Moderate - Sensitive Groups" },
  ]);

  useEffect(() => {
    if (location) {
      // TODO: Integrate with proxy API for actual data (e.g., NWS alerts, NOAA MLRG)
      // Left as a placeholder – wired later when providers are hooked up.
      // console.log("Fetch conditions for", location);
      setConditions((c) => ({ ...c, location: `${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}` }));
    }
  }, [location]);

  const colorFor = (t: string) =>
    t === "extreme"
      ? "bg-red-500/10 border-red-500/20 text-red-400"
      : t === "severe"
      ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
      : t === "moderate"
      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
      : "bg-blue-500/10 border-blue-500/20 text-blue-400";

  return (
    <aside className="absolute right-4 top-20 w-80 z-20 slide-in-right hidden lg:block space-y-4">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Current Conditions</h3>
          <span className="text-xs text-gray-400">{conditions.location}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-sky-400">{conditions.temperature}°</p>
            <p className="text-xs text-gray-400">Temperature</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-blue-400">{conditions.humidity}%</p>
            <p className="text-xs text-gray-400">Humidity</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-lg font-bold text-green-400">{conditions.windSpeed}mph</p>
            <p className="text-xs text-gray-400">Wind Speed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-lg font-bold text-purple-400">{conditions.airQuality}</p>
            <p className="text-xs text-gray-400">Air Quality</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Astronomy</h3>
          <button onClick={() => onDetailsClick?.("astronomy")} className="text-xs text-sky-400 hover:text-sky-300">
            Details
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">☀️</span>
              <span className="text-xs">Sun</span>
            </div>
            <span className="text-xs text-gray-400">Az: {astronomy.sun.azimuth}°, El: {astronomy.sun.elevation}°</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center space-x-2">
              <span>🌙</span>
              <span className="text-xs">Moon</span>
            </div>
            <span className="text-xs text-gray-400">Phase: {astronomy.moon.phase}%</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Active Alerts</h3>
          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">{alerts.length} Active</span>
        </div>
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`p-3 rounded-lg border ${colorFor(a.type)}`}>
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default InfoPanel;

