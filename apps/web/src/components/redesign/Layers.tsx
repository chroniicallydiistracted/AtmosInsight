"use client";
import React, { useState } from 'react';

interface Layer {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  active: boolean;
  hasSettings?: boolean;
  settings?: LayerSettings;
}

interface LayerSettings {
  timeWindow?: string;
  opacity?: number;
}

interface LayersPanelProps {
  onLayerToggle?: (layerId: string, active: boolean) => void;
  onLayerSettingsChange?: (layerId: string, settings: LayerSettings) => void;
  onAddCustomLayer?: () => void;
  lightningEnabled?: boolean;
}

export function LayersPanel({ onLayerToggle, onLayerSettingsChange, onAddCustomLayer, lightningEnabled = false }: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['lightning']));
  
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'alerts',
      name: 'Weather Alerts',
      description: 'NWS Active Warnings',
      icon: (
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBgColor: 'bg-red-500/20',
      active: true,
      hasSettings: false
    },
  lightningEnabled ? {
      id: 'lightning',
      name: 'Lightning (GLM)',
      description: 'Total Optical Energy',
      icon: (
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      iconBgColor: 'bg-yellow-500/20',
      active: true,
      hasSettings: true,
      settings: {
        timeWindow: '5m',
        opacity: 85
    }
  } : undefined as unknown as Layer,
    {
      id: 'radar',
      name: 'Radar (Precip)',
      description: 'Global precipitation overlay',
      icon: (
        <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      iconBgColor: 'bg-sky-500/20',
      active: false,
      hasSettings: true,
      settings: {
        opacity: 70
      }
    },
    {
      id: 'satellite',
      name: 'GOES Satellite',
      description: 'Visible/IR Imagery',
      icon: (
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBgColor: 'bg-purple-500/20',
      active: false,
      hasSettings: false
    }
  ].filter(Boolean) as Layer[]);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        const newActive = !layer.active;
        onLayerToggle?.(layerId, newActive);
        return { ...layer, active: newActive };
      }
      return layer;
    }));
  };

  const updateLayerSettings = (layerId: string, settings: Partial<LayerSettings>) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId && layer.settings) {
        const newSettings = { ...layer.settings, ...settings };
        onLayerSettingsChange?.(layerId, newSettings);
        return { ...layer, settings: newSettings };
      }
      return layer;
    }));
  };

  const toggleExpanded = (layerId: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const filteredLayers = layers.filter(layer => 
    layer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    layer.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="absolute left-4 top-20 bottom-24 w-80 z-20 animate-slide-in-left hidden md:block">
      <div className="glass rounded-xl h-full flex flex-col">
        {/* Header */}
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

        {/* Layers List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {filteredLayers.map(layer => (
            <div key={layer.id} className="layer-card">
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 smooth-transition cursor-pointer"
                onClick={() => layer.hasSettings && toggleExpanded(layer.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${layer.iconBgColor} flex items-center justify-center`}>
                    {layer.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{layer.name}</p>
                    <p className="text-xs text-gray-400">{layer.description}</p>
                  </div>
                  <ToggleSwitch 
                    active={layer.active} 
                    onChange={() => toggleLayer(layer.id)}
                  />
                </div>
              </div>

              {/* Layer Settings */}
              {layer.hasSettings && layer.settings && expandedLayers.has(layer.id) && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 space-y-2 animate-slide-in-bottom">
                  {layer.settings.timeWindow !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Time Window</span>
                      <select 
                        value={layer.settings.timeWindow}
                        onChange={(e) => updateLayerSettings(layer.id, { timeWindow: e.target.value })}
                        className="px-2 py-1 rounded bg-white/10 text-xs focus:outline-none"
                      >
                        <option value="1m">1 min</option>
                        <option value="5m">5 min</option>
                        <option value="10m">10 min</option>
                      </select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Opacity</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={layer.settings.opacity}
                      onChange={(e) => updateLayerSettings(layer.id, { opacity: parseInt(e.target.value) })}
                      className="w-24"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={onAddCustomLayer}
            className="w-full px-4 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium smooth-transition"
          >
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
      className={`relative w-11 h-6 rounded-full transition-colors ${
        active ? 'bg-sky-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default LayersPanel;