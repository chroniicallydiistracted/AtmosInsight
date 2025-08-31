'use client';
import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';

interface GlmLegendProps {
  map: maplibregl.Map | null;
  layerId?: string;
}

const RAMP = [
  { label: '< 50 fJ', color: 'rgb(65,182,196)' },
  { label: '< 200 fJ', color: 'rgb(44,127,184)' },
  { label: '< 500 fJ', color: 'rgb(37,52,148)' },
  { label: '< 1000 fJ', color: 'rgb(255,255,0)' },
  { label: '< 2000 fJ', color: 'rgb(255,140,0)' },
  { label: '≥ 2000 fJ', color: 'rgb(220,20,60)' },
];

export function GlmLegend({ map, layerId = 'glm_toe_layer' }: GlmLegendProps) {
  const [visible, setVisible] = useState(true);
  const [windowVal, setWindowVal] = useState('5m');
  const [qcStrict, setQcStrict] = useState(false);
  const [tISO, setTISO] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!map) return;

    const id = layerId;
    const v = visible ? 'visible' : 'none';
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', v);
    }
  }, [map, visible, layerId]);

  // When params change, update the raster source tiles template
  useEffect(() => {
    if (!map) return;

    const srcId = 'glm_toe';
    const tiles = [
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/glm-toe/{z}/{x}/{y}.png?window=${windowVal}` +
        (qcStrict ? '&qc=true' : '') +
        (tISO ? `&t=${encodeURIComponent(tISO)}` : ''),
    ];

    const apply = () => {
      const source = map.getSource(srcId) as unknown;
      try {
        if (
          source &&
          typeof (source as { setTiles?: unknown }).setTiles === 'function'
        ) {
          (source as { setTiles: (t: string[]) => void }).setTiles(tiles);
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              'visibility',
              visible ? 'visible' : 'none'
            );
          }
          return;
        }
      } catch {
        void 0;
      }

      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      } catch {
        void 0;
      }

      try {
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch {
        void 0;
      }

      try {
        map.addSource(srcId, {
          type: 'raster',
          tiles,
          tileSize: 256,
          minzoom: 0,
          maxzoom: 10,
        });

        map.addLayer({
          id: layerId,
          type: 'raster',
          source: srcId,
          paint: { 'raster-opacity': 0.85, 'raster-resampling': 'linear' },
        });

        map.setLayoutProperty(
          layerId,
          'visibility',
          visible ? 'visible' : 'none'
        );
      } catch {
        void 0;
      }
    };

    if (
      typeof (map as unknown as { isStyleLoaded?: () => boolean })
        .isStyleLoaded === 'function' &&
      !map.isStyleLoaded()
    ) {
      map.once('load', apply);
      return;
    }

    apply();
  }, [map, windowVal, qcStrict, tISO, layerId, visible]);

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
            {RAMP.map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: r.color }}
                />
                <span className="text-xs">{r.label}</span>
              </div>
            ))}
          </div>

          <div className="text-xs opacity-70 mt-2">
            <p>Total Optical Energy from GOES-R GLM</p>
            <p>2×2 km grid resolution</p>
            <p>Units: femtojoules (fJ)</p>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs">Window:</label>
              <select
                value={windowVal}
                onChange={e => setWindowVal(e.target.value)}
                className="text-xs bg-gray-700 rounded px-2 py-1"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="10m">10m</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={qcStrict}
                onChange={e => setQcStrict(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Apply strict QC filtering</span>
            </label>

            <div className="space-y-1">
              <label className="text-xs">Time (t):</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tISO}
                  onChange={e => setTISO(e.target.value)}
                  placeholder="2025-08-28T12:34:00Z"
                  className="text-xs bg-gray-700 rounded px-2 py-1 flex-1"
                />
                <button
                  onClick={() =>
                    setTISO(new Date().toISOString().slice(0, 19) + 'Z')
                  }
                  className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
                >
                  Now
                </button>
                <button
                  onClick={() => setTISO('')}
                  className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() =>
                  setTISO(new Date().toISOString().slice(0, 19) + 'Z')
                }
                className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              >
                End=Now
              </button>
              <button
                onClick={() =>
                  setTISO(
                    new Date(Date.now() - 60_000).toISOString().slice(0, 19) +
                      'Z'
                  )
                }
                className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              >
                Now-1m
              </button>
              <button
                onClick={() =>
                  setTISO(
                    new Date(Date.now() - 5 * 60_000)
                      .toISOString()
                      .slice(0, 19) + 'Z'
                  )
                }
                className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              >
                Now-5m
              </button>
              <button
                onClick={() =>
                  setTISO(
                    new Date(Date.now() - 10 * 60_000)
                      .toISOString()
                      .slice(0, 19) + 'Z'
                  )
                }
                className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              >
                Now-10m
              </button>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="text-blue-300 hover:text-blue-200 text-xs w-full text-left"
        >
          Expand
        </button>
      )}
    </div>
  );
}
