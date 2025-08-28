# Weather Radar (Composite)

- Definition: Reflectivity mosaics from ground‑based weather radar, visualized as time‑sequenced tiles for playback.
- Update cadence: Typically every 5–10 minutes depending on provider and processing.
- Limitations: Beam blockage, bright banding, and ground clutter can affect returns; coverage gaps exist in complex terrain or remote areas.
- Source: RainViewer Weather Maps API provides time index and tile host/path; tiles constructed as `{host}{path}/{size}/{z}/{x}/{y}/{color}/{options}.png`.

Notes:
- Playback clamps to 2–8 FPS (default 4) and prefetches the next frame to keep animation smooth.
