# NWS Weather Alerts

- Definition: Official weather watches, warnings, and advisories issued by the U.S. National Weather Service (NWS). Delivered as CAP/GeoJSON with polygons/lines/points.
- Update cadence: Near real‑time; new alerts published as issued and updated/canceled as needed.
- Limitations: Spatial polygons may be generalized; alert coverage and attributes can change during the event lifecycle. Always consult local authorities for life‑safety decisions.
- Source: https://api.weather.gov/alerts (requires a User‑Agent header per NWS policy).

Severity legend used here:

- Extreme: deep red
- Severe: red‑orange
- Moderate: orange
- Minor: light orange
