'use client';
import { useState, useEffect } from 'react';

interface ForecastData {
  current: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    description?: string;
    icon?: string;
  };
  hourly: Array<{
    time: number;
    temperature?: number;
    description?: string;
    icon?: string;
  }>;
  daily: Array<{
    time: number;
    temperatureMax?: number;
    temperatureMin?: number;
    description?: string;
    icon?: string;
  }>;
}

export function ForecastPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get user's location
  useEffect(() => {
    if (isOpen && !location) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Fallback to a default location (e.g., center of US)
            setLocation({ lat: 39.8283, lon: -98.5795 });
          }
        );
      } else {
        // Fallback to a default location
        setLocation({ lat: 39.8283, lon: -98.5795 });
      }
    }
  }, [isOpen, location]);

  // Fetch forecast when location is available
  useEffect(() => {
    if (location && isOpen && !forecast) {
      fetchForecast();
    }
  }, [location, isOpen, forecast]);

  const fetchForecast = async () => {
    if (!location) return;

    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const units = 'metric'; // TODO: Make configurable
      const source = 'openmeteo'; // Default to Open-Meteo
      
      const response = await fetch(
        `${apiBase}/api/forecast?lat=${location.lat}&lon=${location.lon}&units=${units}&source=${source}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ForecastData = await response.json();
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  };

  const formatTemperature = (temp?: number) => {
    if (temp === undefined) return 'N/A';
    return `${Math.round(temp)}°C`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatHour = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
      hour: 'numeric',
      hour12: true 
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="panel absolute top-4 left-4 p-2 text-sm hover:bg-white/10 transition-colors"
        aria-label="Open weather forecast"
      >
        🌤️ Forecast
      </button>
    );
  }

  return (
    <div className="panel absolute top-4 left-4 p-4 text-sm min-w-80 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-base">Weather Forecast</h2>
        <button
          onClick={() => {
            setIsOpen(false);
            setForecast(null); // Reset forecast for next time
          }}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close forecast"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-pulse">Loading forecast...</div>
        </div>
      )}

      {error && (
        <div className="text-red-400 py-2">
          <p>Error: {error}</p>
          <button
            onClick={fetchForecast}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {forecast && (
        <div className="space-y-4">
          {/* Current Weather */}
          <div className="border-b border-gray-600 pb-3">
            <h3 className="font-medium text-gray-300 mb-2">Current</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Temperature: {formatTemperature(forecast.current.temperature)}</div>
              <div>Humidity: {forecast.current.humidity || 'N/A'}%</div>
              <div>Wind: {forecast.current.windSpeed || 'N/A'} km/h</div>
              <div className="col-span-2 text-gray-400 mt-1">
                {forecast.current.description || 'No description'}
              </div>
            </div>
          </div>

          {/* Hourly Forecast (next 6 hours) */}
          {forecast.hourly.length > 0 && (
            <div className="border-b border-gray-600 pb-3">
              <h3 className="font-medium text-gray-300 mb-2">Next 6 Hours</h3>
              <div className="space-y-1">
                {forecast.hourly.slice(0, 6).map((hour, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{formatHour(hour.time)}</span>
                    <span>{formatTemperature(hour.temperature)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Forecast */}
          {forecast.daily.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Next 5 Days</h3>
              <div className="space-y-1">
                {forecast.daily.slice(0, 5).map((day, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{formatTime(day.time)}</span>
                    <span>
                      {formatTemperature(day.temperatureMax)} / {formatTemperature(day.temperatureMin)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-600">
            Location: {location?.lat.toFixed(2)}, {location?.lon.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}