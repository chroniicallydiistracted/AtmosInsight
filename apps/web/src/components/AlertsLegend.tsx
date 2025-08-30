'use client';

export function AlertsLegend() {
  return (
    <div className="panel absolute top-4 right-4 p-3 text-sm">
      <div className="flex justify-between items-center gap-2 mb-2">
        <strong>NWS Alerts</strong>
        <a
          href="/learn/alerts.md"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 hover:text-blue-200 text-xs"
        >
          Learn
        </a>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-800 rounded-sm"></span>
          <span className="text-xs">Extreme</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
          <span className="text-xs">Severe</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
          <span className="text-xs">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-300 rounded-sm"></span>
          <span className="text-xs">Minor</span>
        </div>
      </div>
    </div>
  );
}
