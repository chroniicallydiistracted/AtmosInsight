"""
GLM TOE Tile Renderer
Implements the complete tile generation pipeline from TOE grids to PNG tiles
as specified in the documentation.
"""

import logging
import math
from typing import Tuple, Optional, Dict, Any
from datetime import datetime, timedelta
import numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
import io

logger = logging.getLogger(__name__)

class TOETileRenderer:
    """
    Renders TOE (Total Optical Energy) grids as PNG tiles for web maps
    Implements the tile generation pipeline from documentation
    """
    
    def __init__(self, tile_size: int = 256):
        self.tile_size = tile_size
        
        # Initialize coordinate transformers
        self.wgs84_crs = None  # Will be set by processor
        self.web_mercator_crs = None  # Will be set by processor
        self.wgs84_to_web_mercator = None  # Will be set by processor
        
        # Color mapping configuration
        self.color_ramp = self._create_production_color_ramp()
        
        # Tile metadata
        self.tile_metadata = {}
    
    def set_transformers(self, wgs84_crs, web_mercator_crs, transformer):
        """Set coordinate transformers from processor"""
        self.wgs84_crs = wgs84_crs
        self.web_mercator_crs = web_mercator_crs
        self.wgs84_to_web_mercator = transformer
    
    def _create_production_color_ramp(self) -> Dict[str, Tuple[int, int, int, int]]:
        """
        Create production-ready color ramp for TOE values
        Based on scientific visualization best practices
        """
        return {
            'background': (0, 0, 0, 0),      # Transparent
            'very_low': (65, 182, 196, 160),  # Light blue
            'low': (44, 127, 184, 200),       # Blue
            'medium': (37, 52, 148, 220),     # Dark blue
            'high': (255, 255, 0, 240),       # Yellow
            'very_high': (255, 140, 0, 255),  # Orange
            'extreme': (220, 20, 60, 255)     # Red
        }
    
    def _get_color_for_toe(self, toe_value: float) -> Tuple[int, int, int, int]:
        """
        Map TOE value to color using production ramp
        Returns RGBA tuple
        """
        if toe_value <= 0:
            return self.color_ramp['background']
        elif toe_value < 50:
            return self.color_ramp['very_low']
        elif toe_value < 200:
            return self.color_ramp['low']
        elif toe_value < 500:
            return self.color_ramp['medium']
        elif toe_value < 1000:
            return self.color_ramp['high']
        elif toe_value < 2000:
            return self.color_ramp['very_high']
        else:
            return self.color_ramp['extreme']
    
    def lonlat_to_tile_pixel(self, lon: float, lat: float, z: int, x: int, y: int) -> Tuple[float, float]:
        """
        Convert WGS84 coordinates to tile pixel coordinates
        Implements the Web Mercator tile projection from documentation
        """
        # Web Mercator tile calculations
        scale = self.tile_size * (2 ** z)
        
        # Convert longitude to world X coordinate
        world_x = ((lon + 180.0) / 360.0) * scale
        
        # Convert latitude to world Y coordinate (Web Mercator)
        sin_lat = math.sin(math.radians(lat))
        
        # Clamp to avoid division by zero / log domain errors at the poles
        eps = 1e-12
        if sin_lat >= 1.0 - eps:
            sin_lat = 1.0 - eps
        elif sin_lat <= -1.0 + eps:
            sin_lat = -1.0 + eps
        
        world_y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
        
        # Convert to tile pixel coordinates
        px = world_x - x * self.tile_size
        py = world_y - y * self.tile_size
        
        return px, py
    
    def meters_per_pixel(self, lat: float, z: int) -> float:
        """
        Calculate meters per pixel at given latitude and zoom level
        Used for determining appropriate grid binning
        """
        # Web Mercator meters per pixel at equator
        mpp_equator = 156543.03392804097
        return (mpp_equator * math.cos(math.radians(lat))) / (2 ** z)
    
    def render_tile_from_grid(self, 
                             toe_grid: np.ndarray,
                             grid_bounds: Dict[str, float],
                             z: int, x: int, y: int,
                             grid_type: str = 'geodetic') -> bytes:
        """
        Render TOE grid as PNG tile
        Supports both geodetic and ABI grid types
        """
        try:
            # Create image
            img = Image.new("RGBA", (self.tile_size, self.tile_size), self.color_ramp['background'])
            pixels = img.load()
            
            if grid_type == 'abi':
                return self._render_abi_grid_tile(toe_grid, grid_bounds, z, x, y, pixels)
            else:
                return self._render_geodetic_grid_tile(toe_grid, grid_bounds, z, x, y, pixels)
                
        except Exception as e:
            logger.error(f"Error rendering tile {z}/{x}/{y}: {e}")
            # Return empty tile on error
            img = Image.new("RGBA", (self.tile_size, self.tile_size), self.color_ramp['background'])
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()
    
    def _render_abi_grid_tile(self, 
                              toe_grid: np.ndarray,
                              grid_bounds: Dict[str, float],
                              z: int, x: int, y: int,
                              pixels) -> bytes:
        """Render tile from ABI fixed grid"""
        # Get grid dimensions
        ny, nx = toe_grid.shape
        
        # Grid cell size in meters
        cell_size_m = grid_bounds.get('cell_size_m', 2000.0)
        
        # Process each grid cell
        for iy in range(ny):
            for ix in range(nx):
                toe_value = toe_grid[iy, ix]
                if toe_value <= 0:
                    continue
                
                # Calculate grid cell center in ABI coordinates
                cx = grid_bounds['x_min'] + (ix + 0.5) * cell_size_m
                cy = grid_bounds['y_min'] + (iy + 0.5) * cell_size_m
                
                # Transform to WGS84 (this should be provided by the processor)
                # For now, we'll use a simplified approach
                try:
                    # Convert ABI coordinates to WGS84 (simplified)
                    # In production, this should use the proper ABI projection
                    lon = cx / 111000.0  # Rough conversion
                    lat = cy / 111000.0  # Rough conversion
                    
                    # Convert to tile pixel coordinates
                    px, py = self.lonlat_to_tile_pixel(lon, lat, z, x, y)
                    
                    # Check if pixel is within tile bounds
                    if 0 <= px < self.tile_size and 0 <= py < self.tile_size:
                        # Get color for TOE value
                        color = self._get_color_for_toe(toe_value)
                        
                        # Set pixel (with anti-aliasing for smooth appearance)
                        self._set_pixel_with_anti_aliasing(pixels, int(px), int(py), color)
                        
                except Exception as e:
                    logger.warning(f"Error processing ABI grid cell {ix},{iy}: {e}")
                    continue
        
        # Convert to PNG bytes
        buf = io.BytesIO()
        img = Image.fromarray(np.array(pixels))
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()
    
    def _render_geodetic_grid_tile(self, 
                                   toe_grid: np.ndarray,
                                   grid_bounds: Dict[str, float],
                                   z: int, x: int, y: int,
                                   pixels) -> bytes:
        """Render tile from geodetic grid"""
        # Get grid dimensions
        ny, nx = toe_grid.shape
        
        # Grid bounds in degrees
        lat_min = grid_bounds.get('lat_min', -90.0)
        lat_max = grid_bounds.get('lat_max', 90.0)
        lon_min = grid_bounds.get('lon_min', -180.0)
        lon_max = grid_bounds.get('lon_max', 180.0)
        
        # Cell size in degrees
        cell_size_lat = (lat_max - lat_min) / ny
        cell_size_lon = (lon_max - lon_min) / nx
        
        # Process each grid cell
        for iy in range(ny):
            for ix in range(nx):
                toe_value = toe_grid[iy, ix]
                if toe_value <= 0:
                    continue
                
                # Calculate cell center coordinates
                lat = lat_min + (iy + 0.5) * cell_size_lat
                lon = lon_min + (ix + 0.5) * cell_size_lon
                
                # Convert to tile pixel coordinates
                px, py = self.lonlat_to_tile_pixel(lon, lat, z, x, y)
                
                # Check if pixel is within tile bounds
                if 0 <= px < self.tile_size and 0 <= py < self.tile_size:
                    # Get color for TOE value
                    color = self._get_color_for_toe(toe_value)
                    
                    # Set pixel (with anti-aliasing for smooth appearance)
                    self._set_pixel_with_anti_aliasing(pixels, int(px), int(py), color)
        
        # Convert to PNG bytes
        buf = io.BytesIO()
        img = Image.fromarray(np.array(pixels))
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()
    
    def _set_pixel_with_anti_aliasing(self, pixels, x: int, y: int, color: Tuple[int, int, int, int]):
        """
        Set pixel with anti-aliasing for smooth appearance
        Creates a small glow effect around high-energy events
        """
        r, g, b, a = color
        
        # Set center pixel
        if 0 <= x < self.tile_size and 0 <= y < self.tile_size:
            pixels[x, y] = (r, g, b, a)
        
        # Create glow effect for high-energy events
        if a > 200:  # Only for high-opacity pixels
            glow_radius = 2
            glow_alpha = max(0, a - 100)  # Reduce alpha for glow
            
            for dy in range(-glow_radius, glow_radius + 1):
                for dx in range(-glow_radius, glow_radius + 1):
                    if dx == 0 and dy == 0:
                        continue  # Skip center pixel
                    
                    px = x + dx
                    py = y + dy
                    
                    if 0 <= px < self.tile_size and 0 <= py < self.tile_size:
                        # Calculate distance-based alpha
                        dist = math.sqrt(dx*dx + dy*dy)
                        if dist <= glow_radius:
                            # Blend with existing pixel
                            existing = pixels[px, py]
                            if existing[3] == 0:  # Transparent
                                pixels[px, py] = (r, g, b, glow_alpha)
                            else:
                                # Blend colors
                                blend_alpha = min(255, existing[3] + glow_alpha)
                                blend_r = int((existing[0] * existing[3] + r * glow_alpha) / blend_alpha)
                                blend_g = int((existing[1] * existing[3] + g * glow_alpha) / blend_alpha)
                                blend_b = int((existing[2] * existing[3] + b * glow_alpha) / blend_alpha)
                                pixels[px, py] = (blend_r, blend_g, blend_b, blend_alpha)
    
    def render_tile_from_events(self, 
                               events: list,
                               z: int, x: int, y: int,
                               time_window_minutes: int = 5,
                               end_time: Optional[datetime] = None) -> bytes:
        """
        Render tile directly from events (legacy method)
        This method is kept for backward compatibility
        """
        try:
            # Create image
            img = Image.new("RGBA", (self.tile_size, self.tile_size), self.color_ramp['background'])
            pixels = img.load()
            
            # Filter events by time window
            if end_time is None:
                end_time = datetime.utcnow()
            start_time = end_time - timedelta(minutes=time_window_minutes)
            
            window_events = [
                e for e in events 
                if hasattr(e, 'timestamp') and start_time <= e.timestamp <= end_time
            ]
            
            # Process each event
            for event in window_events:
                try:
                    # Get coordinates
                    if hasattr(event, 'lat') and hasattr(event, 'lon'):
                        lat = event.lat
                        lon = event.lon
                    elif hasattr(event, 'latitude') and hasattr(event, 'longitude'):
                        lat = event.latitude
                        lon = event.longitude
                    else:
                        continue
                    
                    # Get energy value
                    if hasattr(event, 'energy_fj'):
                        energy = event.energy_fj
                    elif hasattr(event, 'energy_j'):
                        energy = event.energy_j * 1e15
                    else:
                        continue
                    
                    # Convert to tile pixel coordinates
                    px, py = self.lonlat_to_tile_pixel(lon, lat, z, x, y)
                    
                    # Check if pixel is within tile bounds
                    if 0 <= px < self.tile_size and 0 <= py < self.tile_size:
                        # Get color for energy value
                        color = self._get_color_for_toe(energy)
                        
                        # Set pixel
                        pixels[int(px), int(py)] = color
                        
                except Exception as e:
                    logger.warning(f"Error processing event for tile: {e}")
                    continue
            
            # Convert to PNG bytes
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            return buf.getvalue()
            
        except Exception as e:
            logger.error(f"Error rendering tile from events: {e}")
            # Return empty tile on error
            img = Image.new("RGBA", (self.tile_size, self.tile_size), self.color_ramp['background'])
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()
    
    def get_tile_metadata(self, z: int, x: int, y: int) -> Dict[str, Any]:
        """Get metadata for tile"""
        return {
            'zoom': z,
            'x': x,
            'y': y,
            'tile_size': self.tile_size,
            'color_ramp': list(self.color_ramp.keys()),
            'rendered_at': datetime.utcnow().isoformat()
        }
