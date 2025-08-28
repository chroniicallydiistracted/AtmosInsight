import os
import math
import pytest
from fastapi.testclient import TestClient


def lonlat_to_tile(lon: float, lat: float, z: int):
    n = 2 ** z
    xtile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile


@pytest.mark.skipif(not os.environ.get('GLM_SAMPLE_FILE'), reason='set GLM_SAMPLE_FILE to run')
def test_tiles_nonempty_from_sample_file():
    from app.main import app
    from app.ingest_glm import read_glm_events_from_file

    sample = os.environ['GLM_SAMPLE_FILE']
    events = read_glm_events_from_file(sample)
    assert len(events) > 0
    # Extract lon/lat from first event
    la, lo = float(events[0][0]), float(events[0][1])
    z = 5
    x, y = lonlat_to_tile(lo, la, z)

    client = TestClient(app)
    r = client.post('/ingest_files', json={ 'paths': [sample] })
    assert r.status_code == 200
    # Request a larger window to ensure inclusion
    tile = client.get(f'/tiles/{z}/{x}/{y}.png?window=60m')
    assert tile.status_code == 200
    assert tile.headers.get('content-type', '').startswith('image/png')
    assert len(tile.content) > 200

