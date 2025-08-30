# GLM L2 Lightning Heatmap — CLI Examples + MapLibre Layer Stub

This add-on to the main guide gives concrete, **example** commands (no keys, no paid services) and a **MapLibre** layer stub you can drop into your style JSON. Everything below uses public data paths and standard, open-source tools.

> Notes:
>
> - AWS CLI examples use `--no-sign-request` for anonymous access to the public buckets.
> - For **listing** objects, prefer AWS CLI. Plain `curl` can fetch **known** object keys directly but is not ideal for enumeration.
> - Filenames embed **year + day-of-year + time**. If you need the _latest_ granules, list by prefix (hour folder) and select the most recent keys.
> - GLM L2 granules are ~**20 s** each; several per minute. One hour folder (`.../<YYYY>/<DDD>/<HH>/`) will contain many files.

---

## 1) AWS CLI — list and download recent GLM L2 granules

### Prerequisites

- Install the AWS CLI v2
- No credentials needed for these buckets; add `--no-sign-request`

### List files for a specific hour (GOES-West, GLM L2)

```bash
# Example: 2025 day-of-year 240 (Aug 28, 2025), hour 01 UTC
aws s3 ls \
  s3://noaa-goes18/GLM-L2-LCFA/2025/240/01/ \
  --no-sign-request
```

### Fetch the N most recent granules in that hour

```bash
# Set the prefix you want to search (adjust YYYY/DDD/HH)
PREFIX="GLM-L2-LCFA/2025/240/01/"
BUCKET="noaa-goes18"

# Get the 10 most recently modified keys in that prefix and download them
aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "$PREFIX" \
  --no-sign-request \
  --query 'reverse(sort_by(Contents,&LastModified))[:10].Key' \
  --output text | tr '\t' '\n' | while read -r KEY; do
    aws s3 cp "s3://$BUCKET/$KEY" ./data/ --no-sign-request
done
```

> If your time window crosses an hour boundary, repeat for the previous hour folder as well (e.g., `.../00/` and `.../01/`).

### Compute day-of-year (DDD) from a date (GNU/Linux example)

```bash
# Example: UTC date to year + DDD (Julian day), GNU date
UTC_DATE="2025-08-28"
YYYY=$(date -u -d "$UTC_DATE" +%Y)
DDD=$(date -u -d "$UTC_DATE" +%j)
echo "$YYYY $DDD"
```

_macOS/BSD `date` uses different flags; compute DDD in Python if you want a portable solution._

---

## 2) curl — direct fetch when you already know the exact key

When you know the precise object key (filename), `curl` can fetch it over HTTPS:

```bash
# Template (GOES-West):
# https://noaa-goes18.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/<FILENAME>.nc

# Example with placeholders:
curl -fL -o OR_GLM-L2-LCFA_G18_<STAMP>.nc \
  "https://noaa-goes18.s3.amazonaws.com/GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/OR_GLM-L2-LCFA_G18_s<YYYYJJJHHMMSS>_e<YYYYJJJHHMMSS>_c<YYYYJJJHHMMSS>.nc"
```

> Replace placeholders with actual values. For _discovery_ (finding the latest file names), use AWS CLI listing as shown above.

---

## 3) Minimal MapLibre layer stub (raster tiles)

GLM heatmaps should be **colorized server-side** (you serve PNG tiles of the gridded TOE). MapLibre then displays those PNG raster tiles directly.

**Inject this into your MapLibre style JSON** (merge with your existing basemap sources/layers).

```json
{
  "version": 8,
  "name": "Your Style",
  "sources": {
    "basemap": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256
    },
    "glm_toe": {
      "type": "raster",
      "tiles": ["https://your.tile.server/tiles/glm/toe/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "minzoom": 0,
      "maxzoom": 10
    }
  },
  "layers": [
    {
      "id": "basemap",
      "type": "raster",
      "source": "basemap"
    },
    {
      "id": "glm-toe",
      "type": "raster",
      "source": "glm_toe",
      "paint": {
        "raster-opacity": 0.85,
        "raster-resampling": "linear"
      }
    }
  ]
}
```

**Facts to keep straight:**

- MapLibre **does not** re-color single-band scientific rasters into palettes automatically; your server should output **already-colored PNGs** (or use a multi-band RGBA PNG).
- If you must ship raw single-band rasters, convert them to color-mapped PNG tiles server-side (e.g., with GDAL or a rendering library) before publishing.
- Use cache headers and a rolling time index on the server (e.g., `.../tiles/glm/toe/2025-08-28T01:05Z/{z}/{x}/{y}.png`) if you need deterministic caching per time window.

---

## 4) One-liner to download last 5 minutes (hour-local) with AWS CLI (example)

This example pulls the **latest 15 granules** (≈ 5 minutes) from a **single hour** folder. Adjust the counts to match your cadence.

```bash
BUCKET="noaa-goes18"
YYYY="2025"
DDD="240"
HH="01"
N=15  # ~5 minutes of 20 s granules

aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "GLM-L2-LCFA/$YYYY/$DDD/$HH/" \
  --no-sign-request \
  --query "reverse(sort_by(Contents,&LastModified))[:$N].Key" \
  --output text \
| tr '\t' '\n' \
| while read -r KEY; do
    aws s3 cp "s3://$BUCKET/$KEY" ./data/ --no-sign-request
  done
```

> For windows crossing **HH** boundaries, run it twice (for `HH` and the previous hour) and de-duplicate by filename.

---

## 5) Sanity checks

- Keys list and downloads succeed **without credentials** when using the public GOES buckets.
- Granules are **NetCDF-4**; standard tools (`ncdump`, `xarray`) can open them.
- Time stamps are **UTC**; filenames also encode the start/end times.
- Expect multiple granules per minute; download volume scales with storm activity.

---

**That’s it.** These examples remain within public data, no-key access, and entirely open-source tooling. Point your aggregation pipeline at the downloaded NetCDFs, generate a colorized PNG tile pyramid per time window, and MapLibre will simply paint the tiles you serve.
