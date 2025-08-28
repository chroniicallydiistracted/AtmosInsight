export function AlertsLegend() {
  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)',
      color: '#fff', padding: 10, borderRadius: 8, fontSize: 12,
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>NWS Alerts</strong>
        <a href="/learn/alerts.md" target="_blank" rel="noreferrer" style={{ color: '#9cf', textDecoration: 'none' }}>Learn</a>
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#7f0000', display: 'inline-block' }}></span>
          <span>Extreme</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#d7301f', display: 'inline-block' }}></span>
          <span>Severe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#fc8d59', display: 'inline-block' }}></span>
          <span>Moderate</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#fdcc8a', display: 'inline-block' }}></span>
          <span>Minor</span>
        </div>
      </div>
    </div>
  );
}

