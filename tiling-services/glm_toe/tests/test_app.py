from fastapi.testclient import TestClient
from app.main import app


def test_health():
    client = TestClient(app)
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json().get('ok') is True


def test_tiles_png():
    client = TestClient(app)
    # Ingest a couple of synthetic events
    r = client.post('/ingest', json=[
        {"lat": 32.22, "lon": -110.97, "energy_fj": 800, "timeMs": 0},
        {"lat": 32.23, "lon": -110.96, "energy_fj": 1200, "timeMs": 0},
    ])
    assert r.status_code == 200
    r = client.get('/tiles/6/11/27.png')
    assert r.status_code == 200
    assert r.headers['content-type'].startswith('image/png')
    assert len(r.content) > 200

