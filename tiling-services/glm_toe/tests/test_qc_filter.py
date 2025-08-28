import math
from typing import Tuple
from fastapi.testclient import TestClient
from PIL import Image
import io


def lonlat_to_tile(lon: float, lat: float, zoom: int) -> Tuple[int, int]:
    n = 2 ** zoom
    xtile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile


def test_qc_filter_changes_tile_size(monkeypatch):
    # Ensure ABI grid off for this test (doesn't matter, but keep defaults)
    monkeypatch.delenv('GLM_USE_ABI_GRID', raising=False)
    from app.main import app

    client = TestClient(app)

    # Two events at same location; one qc_ok=false, one qc_ok=true
    evt_true = {"lat": 10.0, "lon": -75.0, "energy_fj": 1500.0, "qc_ok": True}
    evt_false = {"lat": 10.0, "lon": -75.0, "energy_fj": 1500.0, "qc_ok": False}
    r = client.post('/ingest', json=[evt_true, evt_false])
    assert r.status_code == 200

    z = 4
    x, y = lonlat_to_tile(evt_true['lon'], evt_true['lat'], z)
    a = client.get(f"/tiles/{z}/{x}/{y}.png?window=5m")
    b = client.get(f"/tiles/{z}/{x}/{y}.png?window=5m&qc=true")
    assert a.status_code == 200 and b.status_code == 200
    # Decode PNGs and count non-transparent pixels
    ia = Image.open(io.BytesIO(a.content)).convert('RGBA')
    ib = Image.open(io.BytesIO(b.content)).convert('RGBA')
    pa = ia.getdata()
    pb = ib.getdata()
    nonzero_a = sum(1 for r,g,bl,al in pa if al > 0)
    nonzero_b = sum(1 for r,g,bl,al in pb if al > 0)
    assert nonzero_b <= nonzero_a + 5
