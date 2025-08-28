from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import List
import time
import math
import io
from PIL import Image

app = FastAPI(title="GLM TOE Service", version="0.1.0")


class Event(BaseModel):
    lat: float
    lon: float
    energy_fj: float
    timeMs: int | None = None


WINDOW_MS = 30 * 60 * 1000
_events: List[Event] = []


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


def prune():
    now = int(time.time() * 1000)
    cutoff = now - WINDOW_MS
    global _events
    _events = [e for e in _events if (e.timeMs or 0) >= cutoff]


def lonlat_to_pixel(lon: float, lat: float, z: int, x: int, y: int):
    tile_size = 256
    scale = tile_size * (2 ** z)
    world_x = ((lon + 180.0) / 360.0) * scale
    sin_lat = math.sin(math.radians(lat))
    world_y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    px = world_x - x * tile_size
    py = world_y - y * tile_size
    return px, py


def meters_per_pixel(lat: float, z: int):
    mpp_equator = 156543.03392804097
    return (mpp_equator * math.cos(math.radians(lat))) / (2 ** z)


def render_tile(z: int, x: int, y: int) -> bytes:
    prune()
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

    bins = {}
    for e in _events:
        mpp = meters_per_pixel(e.lat, z)
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
def tiles(z: int, x: int, y: int):
    content = render_tile(z, x, y)
    return Response(content=content, media_type="image/png")

