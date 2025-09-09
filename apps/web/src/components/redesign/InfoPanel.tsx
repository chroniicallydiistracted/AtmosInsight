"use client";
import React, { useState, useEffect } from 'react';

interface WeatherConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  airQuality: 'Good' | 'Moderate' | 'Poor';
  location: string;
}

interface AstronomyData {
  sun: { azimuth: number; elevation: number };
  moon: { azimuth: number; elevation: number; phase: number };
}

interface Alert {
  id: string;
  type: 'extreme' | 'severe' | 'moderate' | 'minor';
  title: string;
  description: string;
  endTime?: string;
}

interface InfoPanelProps {
  location?: { lat: number; lon: number };
  onDetailsClick?: (section: string) => void;
}

export function InfoPanel({ location, onDetailsClick }: InfoPanelProps) {
  const [conditions, setConditions] = useState<WeatherConditions>({
    temperature: 72,
    humidity: 65,
    windSpeed: 12,
    airQuality: 'Good',
    location: 'Phoenix, AZ'
  });

  const [astronomy, setAstronomy] = useState<AstronomyData>({
    sun: { azimuth: 245, elevation: 35 },
    moon: { azimuth: 120, elevation: 45, phase: 67 }
  });

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'severe',
      title: 'Heat Advisory',
      description: 'Until 8:00 PM MST'
    },
    {
      id: '2',
      type: 'moderate',
      title: 'Air Quality Alert',
      description: 'Moderate - Sensitive Groups'
    }
  ]);

  // Update data based on location
  useEffect(() => {
    if (location) {
      // In a real app, fetch actual data based on location
      console.log('Fetching data for location:', location);
    }
  }, [location]);

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'extreme': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'severe': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'moderate': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'minor': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    if (type === 'extreme' || type === 'severe') {
      return (
        <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <aside className="absolute right-4 top-20 w-80 z-20 animate-slide-in-right hidden lg:block space-y-4">
      {/* Current Conditions Card */}
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

      {/* Astronomy Card */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Astronomy</h3>
          <button 
            onClick={() => onDetailsClick?.('astronomy')}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            Details
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">☀️</span>
              <span className="text-xs">Sun</span>
            </div>
            <span className="text-xs text-gray-400">
              Az: {astronomy.sun.azimuth}°, El: {astronomy.sun.elevation}°
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center space-x-2">
              <span>🌙</span>
              <span className="text-xs">Moon</span>
            </div>
            <span className="text-xs text-gray-400">
              Phase: {astronomy.moon.phase}%
            </span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Active Alerts</h3>
          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            {alerts.length} Active
          </span>
        </div>
        <div className="space-y-2">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start space-x-2">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <p className="text-xs font-medium">{alert.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.description}</p>
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