import math
from typing import Tuple

import pytest


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def test_geos_forward_inverse_roundtrip():
    from app.main import _GEOS_FWD, _GEOS_INV

    lon0 = -75.0
    x, y = _GEOS_FWD.transform(lon0, 0.0)
    assert abs(x) < 10.0
    assert abs(y) < 10.0

    lon2, lat2 = _GEOS_INV.transform(x, y)
    assert abs(lon2 - lon0) < 1e-6
    assert abs(lat2 - 0.0) < 1e-6


def test_geos_cell_size_near_nadir():
    from app.main import _GEOS_FWD

    lon0 = -75.0
    lat = 0.0
    deglon = 2.0 / 111.32  # ≈ 0.01796 deg ~ 2km at equator
    x1, y1 = _GEOS_FWD.transform(lon0, lat)
    x2, y2 = _GEOS_FWD.transform(lon0 + deglon, lat)
    dx = abs(x2 - x1)
    assert 1500.0 <= dx <= 2500.0


@pytest.mark.parametrize("z", [3, 4])
def test_render_tile_abi_mode_single_event(monkeypatch, z):
    monkeypatch.setenv("GLM_USE_ABI_GRID", "true")
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    evt = {"lat": 0.0, "lon": -75.0, "energy_fj": 1000.0}
    r = client.post("/ingest", json=[evt])
    assert r.status_code == 200

    def lonlat_to_tile(lon: float, lat: float, zoom: int) -> Tuple[int, int]:
        n = 2 ** zoom
        xtile = int((lon + 180.0) / 360.0 * n)
        lat_rad = math.radians(lat)
        ytile = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
        return xtile, ytile

    x, y = lonlat_to_tile(evt["lon"], evt["lat"], z)
    r2 = client.get(f"/tiles/{z}/{x}/{y}.png?window=5m")
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/png")
    assert len(r2.content) > 200

