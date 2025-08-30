"""
GLM Lightning Data Processor
Implements the complete pipeline from GLM L2 NetCDF files to TOE heatmap tiles
as specified in the documentation.
"""

import os
import logging
from typing import List, Dict, Tuple, Optional, Union
from datetime import datetime, timedelta
import numpy as np
import xarray as xr
import fsspec
import tempfile
import shutil
from dataclasses import dataclass
from pyproj import CRS, Transformer
import math

logger = logging.getLogger(__name__)

@dataclass
class GLMEvent:
    """Represents a single GLM lightning event"""
    lat: float
    lon: float
    energy_j: float  # Energy in Joules
    timestamp: datetime
    quality_flag: Optional[int] = None
    
    @property
    def energy_fj(self) -> float:
        """Energy in femtojoules (1e15 * Joules)"""
        return self.energy_j * 1e15

@dataclass
class GLMGranule:
    """Represents a GLM L2 granule file"""
    path: str
    satellite: str  # G16, G18, etc.
    start_time: datetime
    end_time: datetime
    creation_time: datetime
    events: List[GLMEvent]

class GLMDataProcessor:
    """
    Core processor for GLM L2 lightning data to TOE heatmap tiles
    Implements the complete pipeline from documentation
    """
    
    def __init__(self, use_abi_grid: bool = True, abi_lon0: float = -75.0):
        self.use_abi_grid = use_abi_grid
        self.abi_lon0 = abi_lon0
        
        # Initialize coordinate transformers
        self._setup_transformers()
        
        # Grid configuration
        self.grid_cell_size_m = 2000.0  # 2km grid cells per documentation
        
        # Time window defaults
        self.default_window_minutes = 5
        
        # Quality control settings
        self.require_qc = False
        
    def _setup_transformers(self):
        """Setup coordinate transformation systems"""
        # WGS84 to Web Mercator (EPSG:3857) for tile rendering
        self.wgs84_crs = CRS.from_epsg(4326)
        self.web_mercator_crs = CRS.from_epsg(3857)
        self.wgs84_to_web_mercator = Transformer.from_crs(
            self.wgs84_crs, self.web_mercator_crs, always_xy=True
        )
        
        # ABI fixed grid setup (optional high-quality mode)
        if self.use_abi_grid:
            self._setup_abi_grid()
    
    def _setup_abi_grid(self):
        """Setup ABI fixed grid transformation per GOES-R documentation"""
        # GOES-R nominal constants
        ABI_A = 6378137.0            # GRS80 semi-major (meters)
        ABI_B = 6356752.31414        # GRS80 semi-minor (meters)
        ABI_H = 35786023.0           # Perspective point height above ellipsoid (meters)
        ABI_SWEEP = 'x'              # GOES-R sweep axis
        
        # Create geostationary projection
        abi_proj4 = (
            f"+proj=geos +lon_0={self.abi_lon0} +h={ABI_H} "
            f"+a={ABI_A} +b={ABI_B} +units=m +sweep={ABI_SWEEP} +no_defs"
        )
        self.abi_crs = CRS.from_proj4(abi_proj4)
        
        # Transformers
        self.wgs84_to_abi = Transformer.from_crs(
            self.wgs84_crs, self.abi_crs, always_xy=True
        )
        self.abi_to_wgs84 = Transformer.from_crs(
            self.abi_crs, self.wgs84_crs, always_xy=True
        )
    
    def parse_granule_filename(self, filename: str) -> Dict[str, Union[str, datetime]]:
        """
        Parse GLM L2 granule filename to extract metadata
        Format: OR_GLM-L2-LCFA_G1x_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
        """
        try:
            base = os.path.basename(filename)
            parts = base.split('_')
            
            if len(parts) < 4:
                raise ValueError(f"Invalid filename format: {filename}")
            
            # Extract satellite identifier
            satellite = parts[2]  # G16, G18, etc.
            
            # Parse timestamps
            def parse_timestamp(ts_str: str) -> datetime:
                year = int(ts_str[0:4])
                doy = int(ts_str[4:7])  # Day of year
                hour = int(ts_str[7:9])
                minute = int(ts_str[9:11])
                second = int(ts_str[11:13])
                
                # Convert day of year to date
                base_date = datetime(year, 1, 1)
                target_date = base_date + timedelta(days=doy - 1, hours=hour, minutes=minute, seconds=second)
                return target_date.replace(tzinfo=None)  # Assume UTC
            
            start_time = parse_timestamp(parts[3][1:])  # Remove 's' prefix
            end_time = parse_timestamp(parts[4][1:])    # Remove 'e' prefix
            creation_time = parse_timestamp(parts[5][1:])  # Remove 'c' prefix
            
            return {
                'satellite': satellite,
                'start_time': start_time,
                'end_time': end_time,
                'creation_time': creation_time
            }
            
        except Exception as e:
            logger.error(f"Failed to parse filename {filename}: {e}")
            # Return fallback values
            now = datetime.utcnow()
            return {
                'satellite': 'G16',
                'start_time': now,
                'end_time': now,
                'creation_time': now
            }
    
    def read_glm_granule(self, file_path: str) -> GLMGranule:
        """
        Read GLM L2 granule and extract all events
        Implements the NetCDF4 reading logic from documentation
        """
        try:
            # Parse filename metadata
            metadata = self.parse_granule_filename(file_path)
            
            # Open dataset
            if file_path.startswith('s3://'):
                # Handle S3 files
                fs = fsspec.filesystem('s3', anon=True)
                with fs.open(file_path, 'rb') as src, \
                     tempfile.NamedTemporaryFile(delete=False, suffix='.nc') as tmp:
                    shutil.copyfileobj(src, tmp)
                    tmp_path = tmp.name
                
                try:
                    ds = xr.open_dataset(tmp_path, engine='netcdf4')
                    events = self._extract_events_from_dataset(ds, file_path)
                finally:
                    ds.close()
                    os.remove(tmp_path)
            else:
                # Handle local files
                ds = xr.open_dataset(file_path, engine='netcdf4')
                try:
                    events = self._extract_events_from_dataset(ds, file_path)
                finally:
                    ds.close()
            
            return GLMGranule(
                path=file_path,
                satellite=metadata['satellite'],
                start_time=metadata['start_time'],
                end_time=metadata['end_time'],
                creation_time=metadata['creation_time'],
                events=events
            )
            
        except Exception as e:
            logger.error(f"Failed to read GLM granule {file_path}: {e}")
            raise
    
    def _extract_events_from_dataset(self, ds: xr.Dataset, src_path: str) -> List[GLMEvent]:
        """
        Extract GLM events from xarray dataset
        Implements the variable extraction logic from documentation
        """
        events = []
        
        try:
            # Extract coordinate and energy variables
            # Try multiple possible variable names per documentation
            lat_var = ds.get('event_lat') or ds.get('event_latitude') or ds.get('lat')
            lon_var = ds.get('event_lon') or ds.get('event_longitude') or ds.get('lon')
            energy_var = ds.get('event_energy') or ds.get('event_energy_j') or ds.get('energy')
            qc_var = ds.get('event_quality_flag') or ds.get('event_quality') or ds.get('event_data_quality')
            
            if lat_var is None or lon_var is None or energy_var is None:
                logger.warning(f"Missing required variables in {src_path}")
                return []
            
            # Extract values
            lats = lat_var.values.astype('float64')
            lons = lon_var.values.astype('float64')
            energies = energy_var.values.astype('float64')
            
            # Handle time variables
            time_info = self._parse_time_variables(ds, src_path)
            
            # Process each event
            n_events = min(lats.size, lons.size, energies.size)
            for i in range(n_events):
                lat = float(lats[i])
                lon = float(lons[i])
                energy_j = float(energies[i])
                
                # Basic validation
                if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                    continue
                if energy_j < 0.0:
                    continue
                
                # Determine timestamp
                if time_info['offsets'] is not None and time_info['base_ms'] is not None:
                    timestamp_ms = int(time_info['base_ms'] + float(time_info['offsets'].values[i]))
                    timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=None)
                else:
                    timestamp = time_info['fallback_time']
                
                # Quality flag
                quality_flag = None
                if qc_var is not None:
                    try:
                        qc_val = int(qc_var.values[i])
                        quality_flag = qc_val
                    except (ValueError, IndexError):
                        pass
                
                # Create event
                event = GLMEvent(
                    lat=lat,
                    lon=lon,
                    energy_j=energy_j,
                    timestamp=timestamp,
                    quality_flag=quality_flag
                )
                events.append(event)
                
        except Exception as e:
            logger.error(f"Error extracting events from dataset: {e}")
        
        return events
    
    def _parse_time_variables(self, ds: xr.Dataset, src_path: str) -> Dict:
        """
        Parse time variables from GLM dataset
        Handles various time encoding schemes per documentation
        """
        time_info = {
            'base_ms': None,
            'offsets': None,
            'fallback_time': self._infer_timestamp_from_filename(src_path)
        }
        
        try:
            # Try event_time with reference
            if 'event_time' in ds.variables:
                v = ds['event_time']
                units = str(v.attrs.get('units', '')).lower()
                
                if 'since' in units:
                    # Parse reference time
                    ref_str = units.split('since', 1)[1].strip()
                    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%SZ'):
                        try:
                            ref_dt = datetime.strptime(ref_str, fmt)
                            time_info['base_ms'] = int(ref_dt.timestamp() * 1000)
                            break
                        except ValueError:
                            continue
                    
                    if time_info['base_ms'] is not None:
                        # Determine scale factor
                        scale = 1000.0  # Default to milliseconds
                        for unit, mult in (('microsecond', 1e-3), ('millisecond', 1.0), ('second', 1000.0)):
                            if unit in units:
                                scale = mult
                                break
                        
                        time_info['offsets'] = v.astype('float64') * scale
            
            # Try event_time_offset with time_coverage_start
            elif 'event_time_offset' in ds.variables:
                base_str = ds.attrs.get('time_coverage_start') or ds.attrs.get('time_coverage_start_utc')
                if base_str:
                    if isinstance(base_str, bytes):
                        base_str = base_str.decode('utf-8', 'ignore')
                    
                    # Parse base time
                    for fmt in ('%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ'):
                        try:
                            base_dt = datetime.strptime(base_str, fmt)
                            time_info['base_ms'] = int(base_dt.timestamp() * 1000)
                            break
                        except ValueError:
                            continue
                    
                    if time_info['base_ms'] is None:
                        # Try ISO format
                        try:
                            base_dt = datetime.fromisoformat(base_str.replace('Z', '+00:00'))
                            time_info['base_ms'] = int(base_dt.timestamp() * 1000)
                        except ValueError:
                            pass
                    
                    if time_info['base_ms'] is not None:
                        v = ds['event_time_offset']
                        units = str(v.attrs.get('units', '')).lower()
                        
                        # Determine scale factor
                        scale = 1.0  # Default to seconds
                        for unit, mult in (('microsecond', 1e-3), ('millisecond', 1.0), ('second', 1.0)):
                            if unit in units:
                                scale = mult
                                break
                        
                        time_info['offsets'] = v.astype('float64') * scale
                        
        except Exception as e:
            logger.warning(f"Error parsing time variables: {e}")
        
        return time_info
    
    def _infer_timestamp_from_filename(self, path: str) -> datetime:
        """Infer timestamp from filename as fallback"""
        try:
            metadata = self.parse_granule_filename(path)
            return metadata['start_time']
        except:
            return datetime.utcnow()
    
    def aggregate_toe_grid(self, events: List[GLMEvent], 
                          time_window_minutes: int = 5,
                          end_time: Optional[datetime] = None) -> np.ndarray:
        """
        Aggregate events to TOE grid over specified time window
        Implements the TOE calculation from documentation: TOE(c, W) = Σ(E_i)
        """
        if not events:
            return np.zeros((1, 1), dtype=np.float32)
        
        # Determine time window
        if end_time is None:
            end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=time_window_minutes)
        
        # Filter events by time window
        window_events = [
            e for e in events 
            if start_time <= e.timestamp <= end_time
        ]
        
        if not window_events:
            return np.zeros((1, 1), dtype=np.float32)
        
        # Create grid
        if self.use_abi_grid:
            return self._aggregate_to_abi_grid(window_events)
        else:
            return self._aggregate_to_geodetic_grid(window_events)
    
    def _aggregate_to_abi_grid(self, events: List[GLMEvent]) -> np.ndarray:
        """Aggregate to ABI fixed grid (~2km cells)"""
        # Define grid bounds (approximate CONUS coverage)
        grid_bounds = {
            'x_min': -5000000,  # -5000 km
            'x_max': 5000000,   # 5000 km
            'y_min': -5000000,  # -5000 km
            'y_max': 5000000    # 5000 km
        }
        
        # Calculate grid dimensions
        nx = int((grid_bounds['x_max'] - grid_bounds['x_min']) / self.grid_cell_size_m)
        ny = int((grid_bounds['y_max'] - grid_bounds['y_min']) / self.grid_cell_size_m)
        
        # Initialize grid
        grid = np.zeros((ny, nx), dtype=np.float32)
        
        # Aggregate events
        for event in events:
            try:
                # Transform to ABI coordinates
                x, y = self.wgs84_to_abi.transform(event.lon, event.lat)
                
                if not (math.isfinite(x) and math.isfinite(y)):
                    continue
                
                # Calculate grid indices
                ix = int((x - grid_bounds['x_min']) / self.grid_cell_size_m)
                iy = int((y - grid_bounds['y_min']) / self.grid_cell_size_m)
                
                # Check bounds
                if 0 <= ix < nx and 0 <= iy < ny:
                    grid[iy, ix] += event.energy_j
                    
            except Exception as e:
                logger.warning(f"Error processing event for ABI grid: {e}")
                continue
        
        return grid
    
    def _aggregate_to_geodetic_grid(self, events: List[GLMEvent]) -> np.ndarray:
        """Aggregate to geodetic grid (~2km cells at mid-latitudes)"""
        # Define grid bounds (global coverage)
        lat_min, lat_max = -90.0, 90.0
        lon_min, lon_max = -180.0, 180.0
        
        # Calculate grid dimensions (approximate 2km cells)
        # At equator: 1 degree ≈ 111 km, so 2km ≈ 0.018 degrees
        cell_size_deg = 0.018
        
        nlat = int((lat_max - lat_min) / cell_size_deg)
        nlon = int((lon_max - lon_min) / cell_size_deg)
        
        # Initialize grid
        grid = np.zeros((nlat, nlon), dtype=np.float32)
        
        # Aggregate events
        for event in events:
            try:
                # Calculate grid indices
                ilat = int((event.lat - lat_min) / cell_size_deg)
                ilon = int((event.lon - lon_min) / cell_size_deg)
                
                # Check bounds
                if 0 <= ilat < nlat and 0 <= ilon < nlon:
                    grid[ilat, ilon] += event.energy_j
                    
            except Exception as e:
                logger.warning(f"Error processing event for geodetic grid: {e}")
                continue
        
        return grid
    
    def get_grid_metadata(self) -> Dict:
        """Get metadata about the current grid configuration"""
        return {
            'use_abi_grid': self.use_abi_grid,
            'grid_cell_size_m': self.grid_cell_size_m,
            'default_window_minutes': self.default_window_minutes,
            'abi_lon0': self.abi_lon0 if self.use_abi_grid else None
        }
