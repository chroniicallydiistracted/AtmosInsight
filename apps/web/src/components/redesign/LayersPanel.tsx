"use client";
import React, { useState } from "react";

type LayerId = string;

interface LayerItem {
  id: LayerId;
  name: string;
  description: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  active: boolean;
  hasSettings?: boolean;
  settings?: { timeWindow?: string; opacity?: number };
}

interface LayersPanelProps {
  initialLayers?: LayerItem[];
  onToggle?: (id: LayerId, active: boolean) => void;
  onAddCustomLayer?: () => void;
}

export function LayersPanel({ initialLayers, onToggle, onAddCustomLayer }: LayersPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>(
    initialLayers ?? [
      {
        id: "nws-alerts",
        name: "NWS Alerts",
        description: "Active weather alerts",
        iconBgColor: "bg-red-500/20",
        active: false,
      },
      {
        id: "goes-abi",
        name: "GOES ABI",
        description: "NOAA satellite imagery (S3)",
        iconBgColor: "bg-indigo-500/20",
        active: false,
        hasSettings: true,
        settings: { opacity: 80, timeWindow: "10m" },
      },
      {
        id: "rain-radar",
        name: "Radar (MRMS)",
        description: "Precipitation composite",
        iconBgColor: "bg-sky-500/20",
        active: false,
      },
    ]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set<LayerId>());

  const toggleLayer = (id: LayerId) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
    const next = layers.find((l) => l.id === id)?.active === true ? false : true;
    onToggle?.(id, next);
  };

  const updateSettings = (id: LayerId, patch: Partial<NonNullable<LayerItem["settings"]>>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, settings: { ...(l.settings ?? {}), ...patch } } : l))
    );
  };

  const toggleExpanded = (id: LayerId) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = layers.filter((l) =>
    `${l.name} ${l.description}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="absolute left-4 top-20 bottom-24 w-80 z-20 slide-in-left hidden md:block">
      <div className="glass rounded-xl h-full flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold mb-3">Data Layers</h2>
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-sky-400 smooth-transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {filtered.map((layer) => (
            <div key={layer.id} className="layer-card">
              <div
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 smooth-transition cursor-pointer"
                onClick={() => layer.hasSettings && toggleExpanded(layer.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${layer.iconBgColor ?? "bg-white/10"} flex items-center justify-center`}>
                    <span className="text-xs">⛅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{layer.name}</p>
                    <p className="text-xs text-gray-400">{layer.description}</p>
                  </div>
                  <ToggleSwitch active={layer.active} onChange={() => toggleLayer(layer.id)} />
                </div>
              </div>

              {layer.hasSettings && layer.settings && expanded.has(layer.id) && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 space-y-2 slide-in-bottom">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Time Window</span>
                    <select
                      value={layer.settings.timeWindow}
                      onChange={(e) => updateSettings(layer.id, { timeWindow: e.target.value })}
                      className="px-2 py-1 rounded bg-white/10 text-xs focus:outline-none"
                    >
                      <option value="1m">1 min</option>
                      <option value="5m">5 min</option>
                      <option value="10m">10 min</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={layer.settings.opacity}
                      onChange={(e) => updateSettings(layer.id, { opacity: parseInt(e.target.value) })}
                      className="w-24"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={onAddCustomLayer} className="w-full px-4 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium smooth-transition">
            + Add Custom Layer
          </button>
        </div>
      </div>
    </aside>
  );
}

function ToggleSwitch({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative w-11 h-6 rounded-full transition-colors ${active ? "bg-sky-500" : "bg-gray-600"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default LayersPanel;

