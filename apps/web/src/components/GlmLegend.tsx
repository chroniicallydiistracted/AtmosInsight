'use client';
import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';

interface GlmLegendProps {
  map: maplibregl.Map | null;
  layerId?: string;
}

export function GlmLegend({ map, layerId = 'glm_toe_layer' }: GlmLegendProps) {
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!map || !map.getLayer(layerId)) return;

      const visibility = visible ? 'visible' : 'none';
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }

    if (map.loaded()) {
      apply();
    } else {
      map.once('load', apply);
      return;
    }
  }, [map, layerId, visible]);

  return (
    <div
      className={`panel absolute bottom-4 right-4 p-3 text-sm transition-all duration-200 ${
        collapsed ? 'w-36' : 'w-72'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <strong title="Total Optical Energy (fJ)">GLM TOE</strong>
        <span title="Color ramp thresholds and units" className="opacity-80">
          ⓘ
        </span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={visible}
            onChange={e => setVisible(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-xs">Visible</span>
        </label>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span>Intensity (fJ)</span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-blue-300 hover:text-blue-200"
            >
              Collapse
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-900 to-blue-500 rounded-sm"></div>
              <span className="text-xs">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-600 to-yellow-500 rounded-sm"></div>
              <span className="text-xs">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-sm"></div>
              <span className="text-xs">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-700 to-purple-800 rounded-sm"></div>
              <span className="text-xs">Extreme</span>
            </div>
          </div>

          <div className="text-xs opacity-70 mt-2">
            <p>Total Optical Energy from GOES-R GLM</p>
            <p>2×2 km grid resolution</p>
            <p>Units: femtojoules (fJ)</p>
          </div>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="text-blue-300 hover:text-blue-200 text-xs"
        >
          Expand
        </button>
      )}
    </div>
  );
}
