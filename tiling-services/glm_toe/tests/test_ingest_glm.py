import os
import pytest
from app.ingest_glm import read_glm_events_from_file


@pytest.mark.skipif(not os.environ.get('GLM_SAMPLE_FILE'), reason='set GLM_SAMPLE_FILE to test NetCDF ingestion')
def test_read_glm_events_from_file():
    path = os.environ['GLM_SAMPLE_FILE']
    events = read_glm_events_from_file(path)
    assert isinstance(events, list)
    # Expect at least some events
    assert len(events) > 0
    la, lo, en, t = events[0]
    assert -90 <= la <= 90
    assert -180 <= lo <= 180
    assert en >= 0
