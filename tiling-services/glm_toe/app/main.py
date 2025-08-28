from fastapi import FastAPI, Response, HTTPException, Query
from pydantic import BaseModel
from typing import List, Set, Tuple
import time
import math
import io
from PIL import Image
import os
from .ingest_glm import read_glm_events_from_file
import asyncio
import datetime as dt
import fsspec
from collections import OrderedDict
from pyproj import CRS, Transformer

app = FastAPI(title="GLM TOE Service", version="0.1.0")


class Event(BaseModel):
    lat: float
    lon: float
    energy_fj: float
    timeMs: int | None = None
    qc_ok: bool | None = None


DEFAULT_WINDOW_MS = 5 * 60 * 1000  # 5 minutes default per guide
_events: List[Event] = []
_ingested_keys: Set[str] = set()

# Simple LRU cache for rendered tiles
class _LRU:
    def __init__(self, max_items: int = 128):
        self.max = max_items
        self.map: OrderedDict[str, bytes] = OrderedDict()
    def get(self, k: str) -> bytes | None:
        v = self.map.get(k)
        if v is not None:
            self.map.move_to_end(k)
        return v
    def set(self, k: str, v: bytes):
        if k in self.map:
            self.map.move_to_end(k)
        self.map[k] = v
        while len(self.map) > self.max:
            self.map.popitem(last=False)

_tile_cache = _LRU(max_items=int(os.environ.get('GLM_TILE_CACHE_SIZE', '128')))

# ABI fixed-grid settings (optional high-quality mode)
GLM_USE_ABI_GRID = os.environ.get('GLM_USE_ABI_GRID', 'false').lower() == 'true'
GLM_ABI_LON0 = float(os.environ.get('GLM_ABI_LON0', '-75.0'))  # GOES-East default

def _make_geos_transformers(lon0: float):
    # GOES-R nominal: height ~35786023m, GRS80 ellipsoid
    crs_geos = CRS.from_proj4(
        f"+proj=geos +lon_0={lon0} +h=35786023 +a=6378137 +b=6356752.31414 +units=m +sweep=x +no_defs"
    )
    crs_wgs84 = CRS.from_epsg(4326)
    fwd = Transformer.from_crs(crs_wgs84, crs_geos, always_xy=True)
    inv = Transformer.from_crs(crs_geos, crs_wgs84, always_xy=True)
    return fwd, inv

_GEOS_FWD, _GEOS_INV = _make_geos_transformers(GLM_ABI_LON0)



@app.get("/health")
def health():
    return {"ok": True, "events": len(_events)}


@app.post("/ingest")
def ingest(batch: List[Event]):
    now = int(time.time() * 1000)
    for e in batch:
        if abs(e.lat) > 90 or abs(e.lon) > 180 or not math.isfinite(e.energy_fj):
            continue
        if e.timeMs is None:
            e.timeMs = now
        _events.append(e)
    prune()
    return {"ok": True, "count": len(batch)}


def prune(window_ms: int | None = None):
    now = int(time.time() * 1000)
    w = window_ms if window_ms is not None else DEFAULT_WINDOW_MS
    cutoff = now - w
    global _events
    _events = [e for e in _events if (e.timeMs or 0) >= cutoff]


def lonlat_to_pixel(lon: float, lat: float, z: int, x: int, y: int):
    tile_size = 256
    scale = tile_size * (2 ** z)
    world_x = ((lon + 180.0) / 360.0) * scale
    sin_lat = math.sin(math.radians(lat))
    # Clamp to avoid division by zero / log domain errors at the poles
    eps = 1e-12
    if sin_lat >= 1.0 - eps:
        sin_lat = 1.0 - eps
    elif sin_lat <= -1.0 + eps:
        sin_lat = -1.0 + eps
    world_y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    px = world_x - x * tile_size
    py = world_y - y * tile_size
    return px, py


def meters_per_pixel(lat: float, z: int):
    mpp_equator = 156543.03392804097
    return (mpp_equator * math.cos(math.radians(lat))) / (2 ** z)


def _parse_window(s: str | None) -> int:
    if not s:
        return DEFAULT_WINDOW_MS
    s = s.strip().lower()
    try:
        # raw ms
        if s.isdigit():
            return max(60_000, int(s))
    except Exception:
        pass
    if s.endswith('ms') and s[:-2].isdigit():
        return max(60_000, int(s[:-2]))
    if s.endswith('s') and s[:-1].isdigit():
        return max(60_000, int(s[:-1]) * 1000)
    if s.endswith('m') and s[:-1].isdigit():
        return max(60_000, int(s[:-1]) * 60_000)
    return DEFAULT_WINDOW_MS


def render_tile(z: int, x: int, y: int, *, window_ms: int, t_end_ms: int | None = None, qc: bool = False) -> bytes:
    prune(max(window_ms, DEFAULT_WINDOW_MS))
    tile_size = 256
    img = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
    px = img.load()

    # Simple stepped ramp; will replace with production ramp during Phase 2
    def color_for(v: float):
        if v <= 0:
            return (0, 0, 0, 0)
        if v < 50:
            return (65, 182, 196, 160)
        if v < 200:
            return (44, 127, 184, 200)
        if v < 500:
            return (37, 52, 148, 220)
        if v < 1000:
            return (255, 255, 0, 240)
        if v < 2000:
            return (255, 140, 0, 255)
        return (220, 20, 60, 255)

    # Time window selection
    now_ms = int(time.time() * 1000)
    end_ms = t_end_ms if t_end_ms is not None else now_ms
    start_ms = end_ms - window_ms

    if GLM_USE_ABI_GRID:
        # Accumulate on ABI fixed grid (~2km cells), then render onto Web Mercator tile
        grid_bins = {}
        cell_m = 2000.0
        for e in _events:
            if e.timeMs is None or e.timeMs < start_ms or e.timeMs > end_ms:
                continue
            if qc and (e.qc_ok is False):
                continue
            X, Y = _GEOS_FWD.transform(e.lon, e.lat)
            if not (math.isfinite(X) and math.isfinite(Y)):
                continue
            gx = int(math.floor(X / cell_m))
            gy = int(math.floor(Y / cell_m))
            grid_bins[(gx, gy)] = grid_bins.get((gx, gy), 0.0) + float(e.energy_fj)
        for (gx, gy), toe in grid_bins.items():
            cx = (gx + 0.5) * cell_m
            cy = (gy + 0.5) * cell_m
            lonc, latc = _GEOS_INV.transform(cx, cy)
            xpix, ypix = lonlat_to_pixel(lonc, latc, z, x, y)
            if xpix < 0 or ypix < 0 or xpix >= tile_size or ypix >= tile_size:
                continue
            sx = int(xpix)
            sy = int(ypix)
            r, g, b, a = color_for(toe)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    px_i = sx + dx
                    py_i = sy + dy
                    if 0 <= px_i < tile_size and 0 <= py_i < tile_size:
                        px[px_i, py_i] = (r, g, b, a)
    else:
        bins = {}
        for e in _events:
            if e.timeMs is None or e.timeMs < start_ms or e.timeMs > end_ms:
                continue
            if qc and (e.qc_ok is False):
                continue
            mpp = meters_per_pixel(e.lat, z)
            # Guard against poles / invalid latitudes where cos(lat) -> 0
            if not math.isfinite(mpp) or mpp <= 0:
                continue
            step = max(1, round(2000.0 / mpp))
            xpix, ypix = lonlat_to_pixel(e.lon, e.lat, z, x, y)
            if xpix < 0 or ypix < 0 or xpix >= tile_size or ypix >= tile_size:
                continue
            sx = min(tile_size - 1, max(0, (int(xpix) // step) * step))
            sy = min(tile_size - 1, max(0, (int(ypix) // step) * step))
            key = sy * tile_size + sx
            bins[key] = bins.get(key, 0.0) + float(e.energy_fj)
        for key, toe in bins.items():
            sy = key // tile_size
            sx = key % tile_size
            px[sx, sy] = color_for(toe)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@app.get("/tiles/{z}/{x}/{y}.png")
def tiles(
    z: int,
    x: int,
    y: int,
    window: str | None = Query(None, description="Window e.g., 1m, 5m, 300s, 180000ms"),
    t: str | None = Query(None, description="End time ISO8601 (UTC) for window end; default now"),
    qc: bool = Query(False, description="Enable strict QC filtering (reserved)"),
):
    t_end_ms = None
    if t:
        try:
            if t.endswith('Z'):
                t_end_ms = int(dt.datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()*1000)
            else:
                t_end_ms = int(dt.datetime.fromisoformat(t).timestamp()*1000)
        except Exception:
            t_end_ms = None
    w_ms = _parse_window(window)
    cache_key = f"{z}/{x}/{y}?w={w_ms}&t={t_end_ms or 0}&qc={int(qc)}"
    cached = _tile_cache.get(cache_key)
    if cached is not None:
        return Response(content=cached, media_type="image/png", headers={"X-Cache": "HIT"})
    content = render_tile(z, x, y, window_ms=w_ms, t_end_ms=t_end_ms, qc=qc)
    _tile_cache.set(cache_key, content)
    headers = {"X-Cache": "MISS"}
    if t_end_ms is not None:
        headers["Cache-Control"] = "public, max-age=300"
    return Response(content=content, media_type="image/png", headers=headers)


class IngestFilesRequest(BaseModel):
    paths: List[str]


@app.post("/ingest_files")
def ingest_files(body: IngestFilesRequest):
    if not body.paths:
        raise HTTPException(status_code=400, detail="paths required")
    total = 0
    for p in body.paths:
        try:
            events = read_glm_events_from_file(p)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"failed to read {p}: {e}")
        now = int(time.time() * 1000)
        for item in events:
            if len(item) == 5:
                la, lo, en, t, qc_ok = item  # type: ignore[misc]
            else:
                la, lo, en, t = item  # type: ignore[misc]
                qc_ok = None
            # ensure window pruning relative to now
            if t > now:
                t = now
            _events.append(Event(lat=la, lon=lo, energy_fj=en, timeMs=t, qc_ok=qc_ok))
            total += 1
    prune()
    return {"ok": True, "ingested": total}


# ----------------
# Background S3 poller (env-gated)
# ----------------
GLM_POLL_ENABLED = os.environ.get('GLM_POLL_ENABLED', 'false').lower() == 'true'
GLM_POLL_BUCKET = os.environ.get('GLM_POLL_BUCKET', 'noaa-goes16')
GLM_POLL_PREFIX = os.environ.get('GLM_POLL_PREFIX', 'GLM-L2-LCFA')
GLM_POLL_INTERVAL_SEC = int(os.environ.get('GLM_POLL_INTERVAL_SEC', '60'))
GLM_POLL_GRANULES_MAX = int(os.environ.get('GLM_POLL_GRANULES_MAX', '12'))  # ~4 minutes

async def _poll_once():
    try:
        fs = fsspec.filesystem('s3', anon=True)
        now = dt.datetime.utcnow()
        # Consider last two hours across day boundary
        hours: List[Tuple[int,int,int]] = []  # (year, doy, hour)
        for delta_h in range(0, 2):
            t = now - dt.timedelta(hours=delta_h)
            year = t.year
            doy = int(t.strftime('%j'))
            hour = t.hour
            hours.append((year, doy, hour))
        candidates: List[str] = []
        for year, doy, hour in hours:
            prefix = f"s3://{GLM_POLL_BUCKET}/{GLM_POLL_PREFIX}/{year}/{doy:03d}/{hour:02d}/"
            try:
                files = fs.glob(prefix + 'OR_GLM-L2-LCFA_*.nc')
            except Exception:
                files = []
            files.sort(reverse=True)
            for k in files:
                if k not in _ingested_keys:
                    candidates.append(k)
                    if len(candidates) >= GLM_POLL_GRANULES_MAX:
                        break
            if len(candidates) >= GLM_POLL_GRANULES_MAX:
                break
        added = 0
        for path in candidates:
            try:
                events = read_glm_events_from_file(path)
            except Exception:
                continue
            now_ms = int(__import__('time').time() * 1000)
            for la, lo, en, tms in events:
                if tms > now_ms:
                    tms = now_ms
                _events.append(Event(lat=la, lon=lo, energy_fj=en, timeMs=tms))
            _ingested_keys.add(path)
            added += len(events)
        if added:
            prune()
    except Exception:
        # swallow errors; best effort
        pass

@app.on_event('startup')
async def _startup_poller():
    if not GLM_POLL_ENABLED:
        return
    async def loop():
        while True:
            await _poll_once()
            await asyncio.sleep(max(10, GLM_POLL_INTERVAL_SEC))
    asyncio.create_task(loop())
