# GLM Lightning — Total Optical Energy (TOE)

- Definition: Sum of optical energy observed by the GOES-R Geostationary Lightning Mapper (GLM) within each grid cell over a time window; units are femtojoules (fJ).
- Update cadence: GLM Level-2 events arrive roughly every ~20 seconds; tiles render accumulated TOE over a chosen window (e.g., 5–30 minutes).
- Limitations: Near the limb and under bright clouds detection can vary; gridding approach aims to match the ABI fixed 2×2 km grid.
- Source: GOES-R GLM L2 NetCDF (AWS Open Data). Server renders an XYZ tile endpoint at `/api/glm-toe/{z}/{x}/{y}.png` with `window`, `t`, and `qc=true` (optional).
