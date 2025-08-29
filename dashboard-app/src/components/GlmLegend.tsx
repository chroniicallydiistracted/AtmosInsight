import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import type { RasterLayerSpecification, RasterSourceSpecification } from '@maplibre/maplibre-gl-style-spec';

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
      `${location.origin}/api/glm-toe/{z}/{x}/{y}.png?window=${windowVal}` +
      (qcStrict ? '&qc=true' : '') +
      (tISO ? `&t=${encodeURIComponent(tISO)}` : '')
    ];

    const apply = () => {
      const source = map.getSource(srcId) as unknown;
      try {
        if (source && typeof (source as { setTiles?: unknown }).setTiles === 'function') {
          (source as { setTiles: (t: string[]) => void }).setTiles(tiles);
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
          }
          return;
        }
      } catch { void 0; }
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      } catch { void 0; }
      try {
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch { void 0; }
      try {
        map.addSource(srcId, { type: 'raster', tiles, tileSize: 256, minzoom: 0, maxzoom: 10 } as RasterSourceSpecification);
        map.addLayer({ id: layerId, type: 'raster', source: srcId, paint: { 'raster-opacity': 0.85, 'raster-resampling': 'linear' } } as RasterLayerSpecification);
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      } catch { void 0; }
    };

    if (typeof (map as unknown as { isStyleLoaded?: () => boolean }).isStyleLoaded === 'function' && !map.isStyleLoaded()) {
      map.once('load', apply);
      return;
    }
    apply();
  }, [map, windowVal, qcStrict, tISO, layerId, visible]);

  return (
    <div style={{
      position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)',
      color: '#fff', padding: 10, borderRadius: 8, width: collapsed ? 140 : 280, fontSize: 12,
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', transition: 'width 180ms ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong title="Total Optical Energy (fJ)">GLM TOE</strong>
        <span title="Color ramp thresholds and units" style={{ opacity: 0.8 }}>ⓘ</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          <span>Visible</span>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand' : 'Collapse'} style={{background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',borderRadius: 6, padding: '4px 8px', cursor: 'pointer'}}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        <a href="/learn/glm.md" target="_blank" rel="noreferrer" style={{ color: '#9cf', textDecoration: 'none' }}>Learn</a>
      </div>
      {collapsed ? null : (
        <>
          <div style={{ marginTop: 8 }}>
            {RAMP.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 16, height: 12, background: r.color, marginRight: 8, borderRadius: 2 }} />
                <span>{r.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Units: femtojoules (fJ), window default 5m.
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <label>
                Window:
                <select value={windowVal} onChange={(e) => setWindowVal(e.target.value)} style={{ marginLeft: 6 }}>
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="10m">10m</option>
                </select>
              </label>
              <label title="Apply strict QC filtering when available" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={qcStrict} onChange={(e) => setQcStrict(e.target.checked)} />
                <span>QC</span>
              </label>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="ISO8601 end time; leave empty for now">
              Time (t):
              <input value={tISO} onChange={(e) => setTISO(e.target.value)} placeholder="2025-08-28T12:34:00Z" style={{ width: 150 }} />
              <button onClick={() => setTISO(new Date().toISOString().slice(0,19)+'Z')}>Now</button>
              <button onClick={() => setTISO('')}>Clear</button>
            </label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={() => setTISO(new Date().toISOString().slice(0,19)+'Z')}>End=Now</button>
              <button onClick={() => setTISO(new Date(Date.now()-60_000).toISOString().slice(0,19)+'Z')}>Now-1m</button>
              <button onClick={() => setTISO(new Date(Date.now()-5*60_000).toISOString().slice(0,19)+'Z')}>Now-5m</button>
              <button onClick={() => setTISO(new Date(Date.now()-10*60_000).toISOString().slice(0,19)+'Z')}>Now-10m</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
