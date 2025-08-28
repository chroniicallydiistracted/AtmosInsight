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

  useEffect(() => {
    if (!map) return;
    const id = layerId;
    const v = visible ? 'visible' : 'none';
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', v);
    }
  }, [map, visible, layerId]);

  return (
    <div style={{
      position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)',
      color: '#fff', padding: 10, borderRadius: 6, width: 220, fontSize: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>GLM TOE</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          <span>Visible</span>
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        {RAMP.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 16, height: 12, background: r.color, marginRight: 8 }} />
            <span>{r.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, opacity: 0.8 }}>
        Units: femtojoules (fJ), window default 5m.
      </div>
      <div style={{ marginTop: 6 }}>
        <a href="/learn/glm.txt" target="_blank" rel="noreferrer" style={{ color: '#9cf' }}>Learn</a>
      </div>
    </div>
  );
}

