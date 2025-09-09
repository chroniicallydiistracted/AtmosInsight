# AtmosInsight — Coding Agent Implementation Spec (S3-first, no inference)

You are a coding agent working in a monorepo called AtmosInsight. Analyze, fix implement the repo, then wire up the following open / low-cost weather and earth-science visualization services end-to-end, using the repo’s existing structure:



## Non-negotiable rules

* **Do not infer or guess.** If any field, endpoint, bucket, region, auth flow, or parameter is unknown or ambiguous, **stop** and emit a visible TODO in code and docs. Only implement flows that are **exact and verified** via official provider docs.
* **S3-first policy.** Prefer **direct S3 HTTPS** access for datasets that are publicly hosted on AWS. When a dataset is **not** on S3 (or the S3 path is not public/known), implement the **official non-S3** API/WMTS endpoint and clearly label it `non_s3`.
* **Region reality.** Infra runs in **us-east-1**. If a dataset’s S3 bucket is in another Region (e.g., us-west-2), implement that access **correctly** (auth + `x-amz-request-payer: requester` when required). Do **not** relocate datasets or mirror third-party tiles without explicit license/ToS permission.
* **Licenses & ToS.** Enforce attribution and usage limits. No bulk mirroring of third-party tiles (e.g., TracesTrack). Keep provider keys server-side only.
* **Cost awareness (implemented in code comments & docs):** mark any cross-Region path and any Requester-Pays path. Provide a short cost note per provider.

---

## Monorepo context (must respect)

* **Frontend:** `dashboard-app/` (Vite + React + MapLibre), `apps/web/` (Next.js 15 prototype, shared tokens).
* **Proxy/gateway:** `proxy-server/` (Express/TypeScript) for dev; `tiling-services/` for Lambda proxies + **GLM TOE FastAPI**.
* **Infra:** `infra/` (Terraform for **S3**, **CloudFront**, **API Gateway/Lambda**, **DynamoDB**, **RDS/PostGIS**).
* **Existing env/flags:** `NWS_USER_AGENT`, `OWM_API_KEY`, `RAINVIEWER_ENABLED`, `GIBS_ENABLED`, `GLM_TOE_ENABLED`, `GLM_TOE_PY_URL`, tile cache and playback envs.
* **New env/flags to add:** see “Configuration” below.

---

## Data-sourcing order (apply per dataset)

1. **S3 (public/no-auth)** → unsigned HTTPS (prefer same-Region us-east-1).
2. **S3 (auth / Requester-Pays / Earthdata)** → signed or Earthdata flow with `x-amz-request-payer: requester` where required.
3. **Official non-S3 endpoints** (WMTS/XYZ/REST) when S3 is not provided.
4. **Commercial via AWS Data Exchange** where applicable (S3-backed entitlement).
   **Never** use unofficial mirrors.

---

## Provider & dataset matrix (implement as a machine-readable manifest)

Create `packages/providers/providers.json` with entries like:

```json
{
  "id": "goes19-abi",
  "name": "GOES-19 ABI",
  "category": "satellite",
  "access": "s3",
  "s3": {
    "bucket": "noaa-goes19",
    "region": "us-east-1",
    "requesterPays": false,
    "prefixExamples": ["ABI-L2-CMIPC/2025/09/08/...", "GLM-L2-LCFA/2025/09/08/..."],
    "snsTopic": null
  },
  "auth": "none",
  "license": "NOAA open",
  "attribution": "NOAA/NESDIS",
  "notes": "Public S3; prefer same-Region access"
}
```

> If any field is unknown, set it to `null` and add `status: "todo"` plus a code-comment TODO where used. Do not guess paths.

Populate this manifest with the following **provider list**, tagging each as `access: "s3"`, `access: "non_s3"`, or `access: "unknown"`. Where buckets are well-known, include their names; where not, mark as unknown but keep the entry so the agent implements the correct non-S3 path or a TODO.

### A) NOAA / NWS / NOS / NCEP (S3-centric; **S3**)

* **GOES-18 (West)** — S3 bucket: `noaa-goes18` (**us-east-1**).
* **GOES-19 (East)** — S3 bucket: `noaa-goes19` (**us-east-1**).

  * Products: ABI L1b/L2, **GLM L2 (LCFA)**.
* **HRRR** — `noaa-hrrr-bdp-pds` (GRIB2).
* **HRRR (analysis-ready)** — `hrrrzarr` (Zarr; Region per registry; mark exact region once verified).
* **MRMS** — `noaa-mrms-pds`.
* **NEXRAD Level II** — `unidata-nexrad-level2`.
* **GFS** — `noaa-gfs-bdp-pds`.
* **GEFS** — (bucket per registry; include once verified).
* **NAM** — `noaa-nam-pds`.
* **NBM** — `noaa-nbm-pds`.
* **NDFD** — `noaa-ndfd-pds`.
* **NWM** — `noaa-nwm-pds` (+ kerchunk refs in `noaa-nodd-kerchunk-pds`).
* **RTOFS** — `noaa-nws-rtofs-pds`.
* **GESTOFS / STOFS-2D-Global** — `noaa-gestofs-pds`.
* **NOS CORA** — `noaa-nos-cora-pds`.
* **GHCN-Daily** — `noaa-ghcn-pds`.
* **WOD (World Ocean Database)** — `noaa-wod-pds`.
* **S-111 (surface currents)** — (bucket per registry; add once verified).

### B) NASA Earthdata Cloud DAACs (often **S3** + auth; many **Requester-Pays**, usually **us-west-2**)

* **FIRMS** (fires/thermal).
* **PO.DAAC** (ocean/altimetry/SST).
* **NSIDC** (cryosphere).
* **LAADS/LP DAAC** (MODIS/VIIRS land).
* **GES DISC** (atmospheric composition).
  For each, include entry with:
* `access: "s3"`, `region: "us-west-2"`, `requesterPays: true|false` (mark unknown → TODO),
* `auth: "earthdata"` (STS/temporary creds or signed URLs),
* **Non-S3** fallback (HTTPS API) if applicable.

### C) USGS / ESA / Copernicus / Open programs (mix of **S3** and **non\_s3**)

* **Landsat PDS (AWS Open Data)** — `landsat-pds` (**S3**).
* **Copernicus DEM** — `copernicus-dem-30m`, `copernicus-dem-90m` (**S3**).
* **Sentinel-2 COG collections** — **S3** buckets per registry (Element84/EO Datasets).
* **ESA WorldCover** — S3 in EU Region (mark Region per registry).
* **Radiant MLHub** (labels/stacks) — S3 (us-west-2).
* **OpenTopography releases** — S3 mirrors for some datasets (mark per dataset).

### D) Commercial “open” mirrors on AWS (often **S3**)

* **Capella Open SAR** — S3 + STAC.
* **Umbra Open Data** — S3 via Marketplace.
* **Satellogic EarthView samples** — S3.

### E) Planetary (S3 where available)

* **HiRISE DTMs/RDRs (Mars)** — S3 COG collections.
* **LOLA (Moon)** — S3 COG/point clouds (per registry).
* **Other PDS mirrors** — add entries as discovered; mark unknowns.

### F) Non-S3 but essential (implement official endpoints; tag `non_s3`)

* **NASA GIBS** (WMTS/XYZ tiles; not S3).
* **AirNow** (API key).
* **OpenAQ** (REST).
* **MET Norway Locationforecast** (requires `User-Agent`).
* **NOAA SWPC** (Kp, solar wind, OVATION aurora feeds; REST/JSON, not S3).
* **RainViewer** (radar tiles, commercial/free tier).
* **TracesTrack Topo** (hosted tiles with key; attribution required).
* **OpenWeatherMap** (tiles; API key).
* **CyclOSM/OSM tiles** (use only per usage policy; do not production-load community tiles).

> For each `non_s3` entry, implement the official URL pattern behind the proxy with strict caching rules and ToS notes. No mirroring.

---

## Implementation requirements (backend)

### 1) S3 fetcher

* Implement a shared **S3 HTTP client** in `packages/shared-utils` with:

  * **Unsigned** GET for public buckets.
  * **Signed** GET for Earthdata/ADX where required.
  * Optional header `x-amz-request-payer: requester` when `requesterPays = true`.
  * Region-aware endpoints (use virtual-hosted–style URLs; set region explicitly).
  * Support **HEAD** and **Range** requests (for partial reads and probes).
  * Retries with exponential backoff and per-provider timeouts.

### 2) Provider router

* In `proxy-server/`, auto-generate Express/Lambda routes from `providers.json`. Patterns:

  * **Object GET:** `/api/s3/:provider/*` → fetch S3 object path computed from manifest prefixes + request params.
  * **Index/timeline:** `/api/catalog/:provider/times` → list or read index objects via S3 List/manifest; prefer **SNS-driven** index (see below).
* Return correct **Cache-Control**:

  * Dynamic/rapid feeds: `public, max-age=60`.
  * Static objects: `public, max-age=31536000, immutable`.
* Add **CORS** and **Content-Type** passthrough (use S3 object content-type when present).

### 3) SNS → DynamoDB LayerIndex (where available)

* For datasets offering **SNS notifications** (e.g., HRRR, MRMS), subscribe SQS→Lambda and update `LayerIndex` (DynamoDB).
* Fallback to **ListObjectsV2** with delimiter/prefix paging when SNS is absent; throttle and cache to avoid LIST charges on Requester-Pays.

### 4) Non-S3 providers

* Add `/api/gibs/*`, `/api/air/airnow/*`, `/api/air/openaq/*`, `/api/point/metno`, `/api/space/*`, `/api/radar/rainviewer/*`, `/api/basemap/tracestrack/*`, `/api/owm/*` routes with:

  * Correct headers (e.g., `NWS_USER_AGENT`, Earthdata auth where applicable).
  * Feature flags to enable/disable.
  * ToS/attribution reminders in code comments.

### 5) Cost markers

* For any **cross-Region** S3 path (bucket region ≠ `us-east-1`), set `x-cost-note` header in responses (e.g., `x-cost-note: cross-region`), and log it with provider id for accounting.

---

## Frontend (MapLibre + Next)

* Register layers for each dataset; bind to the **global timeline**.
* Provide legends/units per layer.
* **Basemap:**

  * Primary: MapLibre PMTiles/OSM-derived.
  * Fallback: **TracesTrack Topo** via their hosted endpoint + attribution (config switch; no mirroring).
* **Radar:** MRMS/NEXRAD (via your `/api/s3/...` or `/api/radar/...`), with frame list from Catalog.
* **Models:** GFS/GEFS/HRRR/NAM/NBM/NDFD via proxy; expose common 2D fields (T2m, wind10m, precip rate) with legends.
* **Satellite:** GOES ABI/GLM via your S3 proxy; **GIBS** as non-S3 overlays where useful.
* **Lightning:** GLM TOE tiles via FastAPI service; legend and time window selector (1m/5m/10m).
* **Fires/Smoke:** FIRMS (S3 Earthdata) if available; NOAA HMS smoke (non-S3) as polygons/rasters.
* **Air quality:** AirNow (key), OpenAQ (no key).
* **Space weather:** Kp/OVATION/solar-wind non-S3 feeds; auroral oval overlay.
* **Hydration safety:** Any time-varying text (e.g., Sun/Moon angles) must be **client-only** or guarded with `dynamic(() => import(...), { ssr: false })`.

---

## Configuration (env)

Add to `.env.example` and document:

* **General:** `PROVIDER_CONFIG_PATH=packages/providers/providers.json`
* **Keys:** `AIRNOW_API_KEY`, `TRACESTRACK_API_KEY`, `OWM_API_KEY`, any Earthdata credential variables needed for STS/token exchange (do not hard-code).
* **Flags:** `RAINVIEWER_ENABLED`, `GIBS_ENABLED`, `FIRMS_ENABLED`, `PO_DAAC_ENABLED`, `NSIDC_ENABLED`, `SENTINEL2_ENABLED`, etc.
* **S3 options:** `REQUESTER_PAYS_DEFAULT=false|true`, `AWS_S3_FORCE_PATH_STYLE=false`, `AWS_REGION=us-east-1` (and per-provider overrides read from manifest).

---

## Acceptance tests (must pass; no guessing)

* **SSR/Hydration:** `/` renders without hydration errors in dev and build.
* **Sample S3 object HEAD/GET:** for each `access: "s3"` provider with a verified bucket, run `HEAD` and `GET` against a **known example object** from `prefixExamples`. Expect **200**.
* **Requester-Pays path:** when `requesterPays=true`, prove `GET` succeeds only with `x-amz-request-payer: requester` (integration test).
* **Cross-Region marker:** for any provider where `region !== us-east-1`, responses contain `x-cost-note: cross-region`.
* **Catalog times:** `/api/catalog/:provider/times` returns a **sorted** unique list of ISO timestamps from SNS-fed LayerIndex or manifest.
* **Tile overlays:** random samples of tiles/JSON return **200** in dev for:

  * `/api/s3/goes19-abi/...`, `/api/s3/goes18-abi/...`
  * `/api/s3/hrrr/...`, `/api/s3/mrms/...`, `/api/s3/nexrad/...`
  * `/api/models/gfs...`, `/api/models/hrrr...`, `/api/models/nam...`, `/api/models/nbm...`, `/api/models/ndfd...`
  * `/tiles/glm_toe/{z}/{x}/{y}.png`
  * `/api/air/airnow...`, `/api/air/openaq...`
  * `/api/space/kp`, `/api/space/ovation`, `/api/space/solarwind`
  * `/api/point/metno?lat=..&lon=..`
  * `/api/gibs/...` (non-S3 WMTS/XYZ)
* **Attribution UI:** visible and correct for basemap and each overlay.
* **Feature flags:** disabling a provider removes its routes and UI controls cleanly.
* **Cost note in docs:** provider entries with cross-Region or Requester-Pays include a one-line cost advisory.

---

## Guardrails & docs

* Every provider entry must include: `id`, `name`, `access`, `auth`, `license`, `attribution`, `region` (if S3), `requesterPays` (if S3), **and** at least one `prefixExamples` or official endpoint template. If you can’t verify these, mark `status: "todo"` and **do not** ship a broken route.
* Keep a running `Implementation_Checklist_and_Status.md` mapping each provider to:

  * Verified S3 bucket & Region (or `non_s3` endpoint),
  * Auth mode (none / Earthdata / API key),
  * License/ToS note,
  * Cost note (same-Region, cross-Region, requester-pays),
  * Route patterns implemented,
  * Acceptance test IDs.

---

## Initial provider entries to seed (add more as verified)

* **S3 (us-east-1):** `noaa-goes18`, `noaa-goes19`, `noaa-mrms-pds`, `unidata-nexrad-level2`, `noaa-hrrr-bdp-pds`, `noaa-gfs-bdp-pds`, `noaa-nam-pds`, `noaa-nbm-pds`, `noaa-ndfd-pds`, `noaa-nwm-pds`, `noaa-nws-rtofs-pds`, `noaa-gestofs-pds`, `noaa-nos-cora-pds`, `noaa-ghcn-pds`, `noaa-wod-pds`.
* **S3 (other Regions; mark Region per verification):** `hrrrzarr`, Sentinel-2 COG collections, `copernicus-dem-30m`, `copernicus-dem-90m`, ESA WorldCover, Radiant MLHub, Capella Open SAR, Umbra Open Data, Satellogic samples, HiRISE DTMs/RDRs, LOLA.
* **non\_s3:** NASA **GIBS** (WMTS/XYZ), AirNow, OpenAQ, MET Norway, NOAA SWPC, RainViewer, TracesTrack Topo, OpenWeatherMap, CyclOSM/OSM tiles (policy-limited).

---

## Proceed

* Implement routes, layers, and the catalog strictly from the manifest.
* Where the manifest says `todo`, **halt and surface a clear message** in the UI and API docs until the exact values are filled in.
* Commit in small units and update the checklist after each capability lands.

---

This spec is designed so the coding agent implements everything it **can** from S3, clearly handles **non-S3** providers, and never guesses. If you want, I can generate the initial `providers.json` with placeholders for all entries above so you have a starting file to edit.
