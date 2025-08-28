import os
import numpy as np
import xarray as xr
import pytest


@pytest.mark.skipif(os.environ.get('GLM_ENABLE_FIXTURE_TEST') != '1', reason='enable with GLM_ENABLE_FIXTURE_TEST=1')
def test_fixture_netcdf_ingest_parses_events(tmp_path):
    from app.ingest_glm import read_glm_events_from_file

    n = 5
    lats = np.array([10.0, 10.01, 10.02, 10.03, 10.04], dtype='float64')
    lons = np.array([-75.0, -75.01, -75.02, -75.03, -75.04], dtype='float64')
    energy = np.array([1e-12, 2e-12, 3e-12, 4e-12, 5e-12], dtype='float64')  # Joules
    qc = np.array([1, 0, 1, 1, 0], dtype='int32')

    ds = xr.Dataset(
        {
            'event_lat': (('nevent',), lats),
            'event_lon': (('nevent',), lons),
            'event_energy': (('nevent',), energy),
            'event_quality_flag': (('nevent',), qc),
            'event_time_offset': (('nevent',), np.array([0, 1000, 2000, 3000, 4000], dtype='float64')),
        },
        coords={'nevent': np.arange(n)},
        attrs={
            'time_coverage_start': '2025-08-28T00:00:00Z'
        }
    )

    tmpf = tmp_path / 'fixture.nc'
    ds.to_netcdf(tmpf)

    events = read_glm_events_from_file(str(tmpf))
    assert len(events) == n
    # Spot check first and second entries for qc mapping and time
    e0 = events[0]
    assert len(e0) in (4, 5)
    if len(e0) == 5:
        lat, lon, en_fj, t_ms, qc_ok = e0
        assert qc_ok is True
        assert abs(en_fj - 1e3) < 1  # 1e-12 J -> 1e3 fJ
    e1 = events[1]
    if len(e1) == 5:
        assert e1[-1] is False
