# GLM L2 Lightning Heatmap — End‑to‑End Guide (No Paid APIs)

**Goal:** Fetch raw GLM (Geostationary Lightning Mapper) Level‑2 data, convert it into a gridded “lightning heatmap” (Total Optical Energy over space/time), and render it on a web map — using only public data and open‑source tools.

> Scope constraints: No commercial or paid APIs. Use public AWS S3 buckets and free OSS (e.g., Python + xarray/netCDF4, GDAL, MapLibre GL JS/Leaflet).

---

## 1) What GLM Level‑2 (“LCFA”) contains

- The GLM L2 product (often labeled **LCFA**) encodes three related object levels: **events → groups → flashes** (events are the finest detections; groups cluster nearby events in time/space; flashes cluster groups).
- Each record is **geolocated (latitude/longitude)**, **time‑stamped (UTC)**, and carries **radiant energy**. Energy is expressed in **Joules** in the L2 product.
- Files are **NetCDF‑4** with self‑describing metadata (attributes document units, quality fields, and parent–child indices).
- One file represents **~20 seconds** of detections (granule). Several granules are produced per minute.
- GLM observes **cloud‑top optical emissions**. Locations reflect the apparent source at cloud top (not a ground strike point), and parallax/geometry effects are expected.

> **Variable names:** The exact array names are defined in each file’s metadata (e.g., per‑event lat/lon/time/energy, and analogous per‑group/per‑flash fields). Parse from metadata rather than hard‑coding names.

---

## 2) Where to fetch the data (public, no key)

Operational GOES platforms host GLM products in public AWS S3 buckets:

- **GOES‑West**: `s3://noaa-goes18/`
- **GOES‑East**: Historically `s3://noaa-goes16/` with transitions to successor platforms over time. Check the current AWS Open Data registry for the latest East satellite bucket (e.g., a successor like `noaa-goes19`).

Access via S3 (anonymous) or HTTPS; both are public.

**Product path schema** (directories):

```
GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/
```

- `YYYY` = four‑digit year
- `DDD` = day‑of‑year (001–366)
- `HH` = hour (00–23, UTC)

**Filename pattern** (example):

```
OR_GLM-L2-LCFA_G1x_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
```

- `G1x` = satellite (e.g., G16/G18/etc.).
- `s`/`e`/`c` = start/end/creation times (year‑julian‑hour‑minute‑second).

**Direct HTTPS template examples** (public, no keys):

```
https://noaa-goes18.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/OR_GLM-L2-LCFA_G18_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc

https://<EAST_BUCKET>.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/OR_GLM-L2-LCFA_G1x_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
```

Replace `<EAST_BUCKET>` with the current East bucket name (e.g., `noaa-goes16` or its successor).

**Cadence & size (typical):**

- ~3 granules per minute (each ~20 s)
- File sizes are a few MB each (varies with storm activity).

---

## 3) Reading the files (OSS only)

Use standard, free libraries:

- **Python**: `xarray`, `netCDF4`, or `h5netcdf` can open NetCDF‑4 directly.
- Optional helpers (not required): GLM‑oriented utilities exist in the open source ecosystem (e.g., readers in community packages), but plain `xarray` is sufficient.

Recommended practice:

- Inspect metadata for variable names (lat/lon/time/energy per level).
- Use time attributes to convert to absolute UTC times.
- Respect file‑level and variable‑level attributes (units, scale/offset, fill values).

---

## 4) From L2 points to a “heatmap” quantity

A heatmap should represent lightning intensity consistently. A robust, documented quantity is **Total Optical Energy (TOE)** — the **sum of detected optical energy** within each grid cell over a defined **time window**.

**Definition (conceptual):**

- Choose a spatial grid \(G\).
- Choose a time window \(W\) (e.g., 1 or 5 minutes).
- For each event \(i\) with \((\phi*i, \lambda_i, t_i, E_i)\) that falls **inside** cell \(c \in G\) **and** within \(W\), compute:
  \[ \mathrm{TOE}(c, W) = \sum*{i \in c, t_i \in W} E_i \quad \text{[Joules]} \]
- Using **events** yields the highest spatial detail. Summing by **groups** or **flashes** is also valid; remain consistent with your chosen level.

**Time windows (operational practice):**

- Common windows: **1‑minute** and **5‑minute** composites (aligns with community displays and gridded reference products).

**Quality control:**

- L2 includes quality fields/flags (e.g., on flashes/groups). Apply documented masks when aggregating if you require strict QC.

---

## 5) Grid and projection choices

Two standard strategies (both are defensible):

1. **Fixed geodetic grid (~2 km)**
   - Use a regular grid in latitude/longitude approximating ~2 km cell size at mid‑latitudes.
   - Simple to implement for global/hemispheric aggregates; straightforward binning by lat/lon bounds.

2. **Web Mercator tile pyramid (EPSG:3857)**
   - Reproject event coordinates to Web Mercator; accumulate TOE per **tile pixel** (server‑side), then serve PNG/COG tiles.
   - Ideal for web maps (MapLibre GL JS/Leaflet), at the cost of performing a reprojection step before binning.

**Recommendation:** If your front‑end is a slippy map, use Web Mercator tiles for best UX; if you want product parity with official gridded outputs, use a fixed geodetic ~2 km grid.

---

## 6) End‑to‑end processing (algorithmic steps)

1. **Pick satellite & time range**
   - Determine your domain (e.g., CONUS → West or East satellite).
   - Define your composite window, e.g., last **5 minutes** (UTC).

2. **Enumerate and fetch granules**
   - Convert the window to a list of 20‑s granule filenames using the path schema.
   - Download via HTTPS (no key) from the appropriate bucket(s).

3. **Open and extract fields**
   - For each granule: read per‑event (or per‑group/per‑flash) **lat**, **lon**, **time**, **radiant energy (J)**.
   - Apply fill‑value masks and any desired QC filters.

4. **Project and bin**
   - Project to your chosen grid:
     - Geodetic grid → compute cell indices from lat/lon.
     - Web Mercator → transform to (x, y), then to tile pixel indices at your display zoom.
   - For each point inside the time window, **accumulate energy into its cell** (sum).

5. **Produce the 2‑D TOE field**
   - The result is a 2‑D array (grid cells or tile pixels) with units of **Joules** for the given window.

6. **Color‑map and tile**
   - Map TOE values to intensities/colors with a perceptually sane ramp.
   - Create **raster tiles** (PNG) or a **COG/GeoTIFF** and serve via a tile server (standard, OSS stacks using GDAL/Mapnik/etc.).
   - In the web client (MapLibre/Leaflet), add as a raster overlay on your basemap.

7. **Validate (optional but recommended)**
   - Compare your TOE field against public GLM **gridded reference products** (1‑ or 5‑minute) for the same times to validate sums and spatial alignment.

---

## 7) Rendering on the map (no paid services)

- **Front‑end libraries:** MapLibre GL JS or Leaflet (both OSS).
- **Server:** Any static tile server or small Node/NGINX setup to serve PNG/COG tiles.
- **Performance guidance:**
  - Aggregate **server‑side**; avoid pushing raw L2 points to the browser.
  - Cache tiles per time window.
  - Roll the composite window forward (e.g., every 20–60 s) to keep the display current.

---

## 8) Known, documented behaviors to expect

- **Day/night sensitivity differences** alter apparent intensity.
- **Parallax and geometry**: GLM views cloud‑top optical emissions; positions reflect cloud‑top locations relative to the satellite view angle.
- **Complex flashes**: Algorithmic grouping can split/merge structures; consistency checks across levels (event/group/flash) are prudent for research‑grade uses.

---

## 9) Practical URL templates (copy/adapt)

**GOES‑West (G18) — HTTPS:**

```
https://noaa-goes18.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/OR_GLM-L2-LCFA_G18_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
```

**GOES‑East — HTTPS (use current East bucket):**

```
https://<EAST_BUCKET>.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/OR_GLM-L2-LCFA_G1x_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
```

> Replace `<EAST_BUCKET>` and the `G1x` platform tag (e.g., G16 or its successor) with the currently operational East satellite designation.

**Notes:**

- All times are **UTC**.
- `DDD` is **day‑of‑year** (Julian).
- Granules are **~20 seconds** each; expect multiple files per minute.

---

## 10) Minimal toolchain checklist (OSS)

- **Data access:** curl/wget or AWS CLI (anonymous).
- **Parsing & aggregation:** Python (`xarray`, `netCDF4`, `numpy`).
- **Projection:** `pyproj` (or equivalent).
- **Rasterization/tiling:** GDAL (`gdal_translate`, `gdal2tiles.py`) or Mapnik stack.
- **Web map:** MapLibre GL JS or Leaflet.

All components above are free and widely used.

---

## 11) Summary

1. Pull GLM L2 LCFA granules for your time window from the public AWS bucket (no key).
2. Read lat/lon/time/energy for your chosen object level (events for highest detail).
3. Project to a display grid and **sum energies** to get **TOE** per cell over the window.
4. Color‑map the 2‑D TOE field, tile it, and render in a web map.
5. Optionally validate against public GLM gridded reference products for the same window.

This yields a fully open, reproducible **lightning heatmap** with no paid services.
