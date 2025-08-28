from __future__ import annotations

import os
from typing import List, Tuple, Optional, Union
import datetime as dt

import xarray as xr
import fsspec
import tempfile
import shutil


def _infer_timestamp_from_filename(path: str) -> int:
    base = os.path.basename(path)
    try:
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


def _parse_time_offsets(ds: xr.Dataset) -> Optional[Tuple[int, xr.DataArray]]:
    if 'event_time' in ds.variables:
        v = ds['event_time']
        units = str(v.attrs.get('units', '')).lower()
        ref_ms = None
        if 'since' in units:
            try:
                ref = units.split('since', 1)[1].strip()
                for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%SZ'):
                    try:
                        ref_dt = dt.datetime.strptime(ref, fmt).replace(tzinfo=dt.timezone.utc)
                        ref_ms = int(ref_dt.timestamp() * 1000)
                        break
                    except Exception:
                        continue
            except Exception:
                pass
        scale = 1000.0
        for k, mult in (('microsecond', 1e-3), ('millisecond', 1.0), ('second', 1000.0)):
            if k in units:
                scale = mult
                break
        if ref_ms is not None:
            return (ref_ms, v.astype('float64') * scale)

    if 'event_time_offset' in ds.variables:
        base_str = ds.attrs.get('time_coverage_start') or ds.attrs.get('time_coverage_start_utc')
        if isinstance(base_str, bytes):
            base_str = base_str.decode('utf-8', 'ignore')
        if base_str:
            try:
                for fmt in ('%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ'):
                    try:
                        base_dt = dt.datetime.strptime(base_str, fmt).replace(tzinfo=dt.timezone.utc)
                        break
                    except Exception:
                        base_dt = None
                if base_dt is None:
                    base_dt = dt.datetime.fromisoformat(base_str.replace('Z','+00:00'))
                base_ms = int(base_dt.timestamp() * 1000)
                v = ds['event_time_offset']
                units = str(v.attrs.get('units', '')).lower()
                scale = 1.0
                for k, mult in (('microsecond', 1e-3), ('millisecond', 1.0), ('second', 1000.0)):
                    if k in units:
                        scale = mult
                        break
                return (base_ms, v.astype('float64') * scale)
            except Exception:
                pass
    return None


def _read_from_dataset(ds: xr.Dataset, src_path: str) -> List[Union[Tuple[float, float, float, int], Tuple[float, float, float, int, Optional[bool]]]]:
    lat = ds.get('event_lat') or ds.get('event_latitude')
    lon = ds.get('event_lon') or ds.get('event_longitude')
    energy = ds.get('event_energy') or ds.get('event_energy_j')
    if lat is None or lon is None or energy is None:
        return []
    qc = ds.get('event_quality_flag') or ds.get('event_quality') or ds.get('event_data_quality')
    energy_fj = (energy.values.astype('float64')) * 1e15
    lats = lat.values.astype('float64')
    lons = lon.values.astype('float64')

    tinfo = _parse_time_offsets(ds)
    if tinfo is None:
        base_ms = None
        offsets = None
        fallback_t = _infer_timestamp_from_filename(src_path)
    else:
        base_ms, offsets = tinfo
        fallback_t = None

    out: List[Union[Tuple[float, float, float, int], Tuple[float, float, float, int, Optional[bool]]]] = []
    n = min(lats.size, lons.size, energy_fj.size)
    for i in range(n):
        la = float(lats[i])
        lo = float(lons[i])
        en = float(energy_fj[i])
        if not (-90.0 <= la <= 90.0 and -180.0 <= lo <= 180.0):
            continue
        if en < 0.0:
            continue
        if offsets is not None and base_ms is not None:
            ti = int(base_ms + float(offsets.values[i]))
        else:
            ti = fallback_t if fallback_t is not None else _infer_timestamp_from_filename(src_path)
        qc_ok: Optional[bool] = None
        if qc is not None:
            try:
                val = int(qc.values[i])
                qc_ok = True if val == 1 else False if val == 0 else None
            except Exception:
                qc_ok = None
        if qc_ok is None:
            out.append((la, lo, en, ti))
        else:
            out.append((la, lo, en, ti, qc_ok))
    return out


def read_glm_events_from_file(path: str) -> List[Union[Tuple[float, float, float, int], Tuple[float, float, float, int, Optional[bool]]]]:
    if path.startswith('s3://'):
        fs = fsspec.filesystem('s3', anon=True)
        with fs.open(path, 'rb') as src, tempfile.NamedTemporaryFile(delete=False, suffix='.nc') as tmp:
            shutil.copyfileobj(src, tmp)
            tmp_path = tmp.name
        ds = xr.open_dataset(tmp_path, engine='netcdf4')
        try:
            return _read_from_dataset(ds, path)
        finally:
            ds.close()
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    else:
        ds = xr.open_dataset(path, engine='netcdf4')
        try:
            return _read_from_dataset(ds, path)
        finally:
            ds.close()
