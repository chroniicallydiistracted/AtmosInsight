from __future__ import annotations

import os
from typing import Iterable, List, Tuple
import datetime as dt

import xarray as xr


def _infer_timestamp_from_filename(path: str) -> int:
    # Attempt to infer time from filenames like OR_GLM-L2-LCFA_G16_sYYYYDDDHHMMSS...
    # Fallback to current time if parsing fails.
    base = os.path.basename(path)
    try:
        # Look for pattern '_sYYYYDDDHHMMSS'
        if '_s' in base:
            s = base.split('_s', 1)[1][:13]
            year = int(s[0:4])
            doy = int(s[4:7])
            hh = int(s[7:9])
            mm = int(s[9:11])
            ss = int(s[11:13])
            day = dt.datetime(year, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(days=doy - 1, hours=hh, minutes=mm, seconds=ss)
            return int(day.timestamp() * 1000)
    except Exception:
        pass
    return int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)


def read_glm_events_from_file(path: str) -> List[Tuple[float, float, float, int]]:
    """
    Returns a list of tuples (lat, lon, energy_fj, timeMs).
    Reads GLM L2 NetCDF file using xarray; expects event_lat, event_lon and event_energy (Joules).
    """
    ds = xr.open_dataset(path, engine='netcdf4')
    try:
        lat = ds.get('event_lat')
        lon = ds.get('event_lon')
        energy = ds.get('event_energy')
        if lat is None or lon is None or energy is None:
            # Some products might not include energy; skip in that case for now
            return []
        # Convert Joules to femtojoules
        energy_fj = (energy.values.astype('float64')) * 1e15
        lats = lat.values.astype('float64')
        lons = lon.values.astype('float64')
        t = _infer_timestamp_from_filename(path)
        out: List[Tuple[float, float, float, int]] = []
        n = min(lats.size, lons.size, energy_fj.size)
        for i in range(n):
            la = float(lats[i])
            lo = float(lons[i])
            en = float(energy_fj[i])
            if not (-90.0 <= la <= 90.0 and -180.0 <= lo <= 180.0):
                continue
            if not (en >= 0.0):
                continue
            out.append((la, lo, en, t))
        return out
    finally:
        ds.close()

