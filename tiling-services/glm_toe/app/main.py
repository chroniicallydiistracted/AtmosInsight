"""
GLM TOE Service - Complete Implementation
Implements the full GLM L2 lightning data to TOE heatmap tile pipeline
as specified in the documentation.
"""

import os
import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from collections import OrderedDict
import time

from fastapi import FastAPI, Response, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from .glm_processor import GLMDataProcessor, GLMEvent, GLMGranule
from .tile_renderer import TOETileRenderer
from .s3_fetcher import GLMS3Fetcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="GLM TOE Service",
    description="Complete GLM L2 lightning data to TOE heatmap tile service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from environment variables
GLM_USE_ABI_GRID = os.environ.get('GLM_USE_ABI_GRID', 'true').lower() == 'true'
GLM_ABI_LON0 = float(os.environ.get('GLM_ABI_LON0', '-75.0'))
GLM_TILE_CACHE_SIZE = int(os.environ.get('GLM_TILE_CACHE_SIZE', '128'))
GLM_S3_POLL_ENABLED = os.environ.get('GLM_S3_POLL_ENABLED', 'false').lower() == 'true'
GLM_S3_POLL_INTERVAL = int(os.environ.get('GLM_S3_POLL_INTERVAL', '60'))
GLM_S3_BUCKET = os.environ.get('GLM_S3_BUCKET', 'noaa-goes18')

# Global state
_events: List[GLMEvent] = []
_ingested_granules: Dict[str, GLMGranule] = {}
_processor: Optional[GLMDataProcessor] = None
_renderer: Optional[TOETileRenderer] = None
_s3_fetcher: Optional[GLMS3Fetcher] = None

# LRU cache for rendered tiles
class LRUCache:
    def __init__(self, max_items: int = 128):
        self.max_items = max_items
        self.cache: OrderedDict[str, bytes] = OrderedDict()
    
    def get(self, key: str) -> Optional[bytes]:
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def set(self, key: str, value: bytes):
        if key in self.cache:
            # Move to end
            self.cache.move_to_end(key)
        else:
            # Check if we need to evict
            if len(self.cache) >= self.max_items:
                self.cache.popitem(last=False)
        
        self.cache[key] = value

_tile_cache = LRUCache(max_items=GLM_TILE_CACHE_SIZE)

# Pydantic models
class Event(BaseModel):
    lat: float
    lon: float
    energy_j: float
    timestamp: Optional[datetime] = None
    quality_flag: Optional[int] = None

class IngestFilesRequest(BaseModel):
    paths: List[str]
    bucket_name: Optional[str] = None

class TimeWindowRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    window_minutes: int = 5

class TileRequest(BaseModel):
    z: int
    x: int
    y: int
    window_minutes: int = 5
    end_time: Optional[datetime] = None
    quality_filter: bool = False

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the service on startup"""
    global _processor, _renderer, _s3_fetcher
    
    try:
        # Initialize GLM processor
        _processor = GLMDataProcessor(
            use_abi_grid=GLM_USE_ABI_GRID,
            abi_lon0=GLM_ABI_LON0
        )
        
        # Initialize tile renderer
        _renderer = TOETileRenderer(tile_size=256)
        _renderer.set_transformers(
            _processor.wgs84_crs,
            _processor.web_mercator_crs,
            _processor.wgs84_to_web_mercator
        )
        
        # Initialize S3 fetcher
        _s3_fetcher = GLMS3Fetcher()
        
        logger.info("GLM TOE Service initialized successfully")
        
        # Start S3 polling if enabled
        if GLM_S3_POLL_ENABLED:
            asyncio.create_task(s3_polling_task())
            
    except Exception as e:
        logger.error(f"Failed to initialize service: {e}")
        raise

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "GLM TOE Service",
        "version": "1.0.0",
        "events_count": len(_events),
        "granules_count": len(_ingested_granules),
        "cache_size": len(_tile_cache.cache),
        "processor_ready": _processor is not None,
        "renderer_ready": _renderer is not None,
        "s3_fetcher_ready": _s3_fetcher is not None
    }

# Service status endpoint
@app.get("/status")
async def service_status():
    """Get detailed service status"""
    if not _processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "processor_config": _processor.get_grid_metadata(),
        "events_count": len(_events),
        "granules_count": len(_ingested_granules),
        "cache_stats": {
            "size": len(_tile_cache.cache),
            "max_size": _tile_cache.max_items
        },
        "s3_status": _s3_fetcher.get_available_buckets() if _s3_fetcher else None
    }

# Tile endpoint
@app.get("/tiles/{z}/{x}/{y}.png")
async def get_tile(
    z: int,
    x: int,
    y: int,
    window: Optional[str] = Query(None, description="Time window (e.g., 1m, 5m, 300s)"),
    t: Optional[str] = Query(None, description="End time ISO8601 (UTC)"),
    qc: bool = Query(False, description="Enable quality filtering"),
    grid_type: str = Query("auto", description="Grid type: auto, abi, geodetic")
):
    """
    Get TOE heatmap tile
    Implements the tile serving pipeline from documentation
    """
    if not _processor or not _renderer:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        # Parse time window
        window_minutes = parse_time_window(window)
        
        # Parse end time
        end_time = parse_end_time(t)
        
        # Create cache key
        cache_key = f"{z}/{x}/{y}?w={window_minutes}&t={end_time.isoformat() if end_time else 'now'}&qc={int(qc)}&g={grid_type}"
        
        # Check cache
        cached_tile = _tile_cache.get(cache_key)
        if cached_tile:
            return Response(
                content=cached_tile,
                media_type="image/png",
                headers={"X-Cache": "HIT", "X-Tile-Info": f"z{z}x{x}y{y}"}
            )
        
        # Generate tile
        tile_data = await generate_tile(z, x, y, window_minutes, end_time, qc, grid_type)
        
        # Cache tile
        _tile_cache.set(cache_key, tile_data)
        
        # Set response headers
        headers = {
            "X-Cache": "MISS",
            "X-Tile-Info": f"z{z}x{x}y{y}",
            "X-Time-Window": f"{window_minutes}m",
            "X-Grid-Type": grid_type
        }
        
        if end_time:
            headers["Cache-Control"] = "public, max-age=300"
        
        return Response(
            content=tile_data,
            media_type="image/png",
            headers=headers
        )
        
    except Exception as e:
        logger.error(f"Error generating tile {z}/{x}/{y}: {e}")
        raise HTTPException(status_code=500, detail=f"Tile generation failed: {str(e)}")

# Event ingestion endpoint
@app.post("/ingest")
async def ingest_events(events: List[Event]):
    """Ingest GLM events"""
    if not _processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        count = 0
        for event_data in events:
            # Validate coordinates
            if not (-90 <= event_data.lat <= 90 and -180 <= event_data.lon <= 180):
                continue
            
            # Validate energy
            if event_data.energy_j <= 0:
                continue
            
            # Create GLMEvent
            event = GLMEvent(
                lat=event_data.lat,
                lon=event_data.lon,
                energy_j=event_data.energy_j,
                timestamp=event_data.timestamp or datetime.utcnow(),
                quality_flag=event_data.quality_flag
            )
            
            _events.append(event)
            count += 1
        
        # Prune old events
        prune_old_events()
        
        logger.info(f"Ingested {count} events")
        return {"status": "success", "ingested": count, "total_events": len(_events)}
        
    except Exception as e:
        logger.error(f"Error ingesting events: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

# File ingestion endpoint
@app.post("/ingest_files")
async def ingest_files(request: IngestFilesRequest):
    """Ingest GLM granules from files or S3"""
    if not _processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        total_events = 0
        processed_files = 0
        
        for file_path in request.paths:
            try:
                # Read granule
                granule = _processor.read_glm_granule(file_path)
                
                # Store granule
                _ingested_granules[file_path] = granule
                
                # Add events
                for event in granule.events:
                    _events.append(event)
                
                total_events += len(granule.events)
                processed_files += 1
                
                logger.info(f"Processed {file_path}: {len(granule.events)} events")
                
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")
                continue
        
        # Prune old events
        prune_old_events()
        
        logger.info(f"Processed {processed_files} files, total events: {total_events}")
        return {
            "status": "success",
            "processed_files": processed_files,
            "total_events": total_events,
            "total_files": len(request.paths)
        }
        
    except Exception as e:
        logger.error(f"Error ingesting files: {e}")
        raise HTTPException(status_code=500, detail=f"File ingestion failed: {str(e)}")

# S3 ingestion endpoint
@app.post("/ingest_s3")
async def ingest_from_s3(
    bucket_name: str = GLM_S3_BUCKET,
    hours_back: int = 2,
    max_granules: int = 15
):
    """Ingest GLM granules from S3"""
    if not _s3_fetcher:
        raise HTTPException(status_code=503, detail="S3 fetcher not available")
    
    try:
        # Get latest granules
        granule_keys = _s3_fetcher.get_latest_granules(
            bucket_name=bucket_name,
            count=max_granules,
            hours_back=hours_back
        )
        
        if not granule_keys:
            return {"status": "no_granules", "message": "No granules found"}
        
        # Process granules
        total_events = 0
        processed_granules = 0
        
        for key in granule_keys:
            try:
                # Skip if already processed
                if key in _ingested_granules:
                    continue
                
                # Read granule directly from S3
                granule = _processor.read_glm_granule(f"s3://{bucket_name}/{key}")
                
                # Store granule
                _ingested_granules[key] = granule
                
                # Add events
                for event in granule.events:
                    _events.append(event)
                
                total_events += len(granule.events)
                processed_granules += 1
                
            except Exception as e:
                logger.error(f"Failed to process S3 granule {key}: {e}")
                continue
        
        # Prune old events
        prune_old_events()
        
        logger.info(f"Processed {processed_granules} S3 granules, total events: {total_events}")
        return {
            "status": "success",
            "processed_granules": processed_granules,
            "total_events": total_events,
            "bucket": bucket_name,
            "time_window_hours": hours_back
        }
        
    except Exception as e:
        logger.error(f"Error ingesting from S3: {e}")
        raise HTTPException(status_code=500, detail=f"S3 ingestion failed: {str(e)}")

# S3 status endpoint
@app.get("/s3/status")
async def s3_status():
    """Get S3 bucket status"""
    if not _s3_fetcher:
        raise HTTPException(status_code=503, detail="S3 fetcher not available")
    
    return {
        "buckets": _s3_fetcher.get_available_buckets(),
        "default_bucket": GLM_S3_BUCKET
    }

# Grid information endpoint
@app.get("/grid/info")
async def grid_info():
    """Get grid configuration information"""
    if not _processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "grid_config": _processor.get_grid_metadata(),
        "grid_bounds": get_grid_bounds(),
        "tile_size": 256,
        "supported_zoom_levels": list(range(0, 21))  # 0-20
    }

# Utility functions
def parse_time_window(window_str: Optional[str]) -> int:
    """Parse time window string to minutes"""
    if not window_str:
        return 5  # Default 5 minutes
    
    window_str = window_str.strip().lower()
    
    try:
        if window_str.endswith('ms'):
            minutes = int(window_str[:-2]) / (1000 * 60)
        elif window_str.endswith('s'):
            minutes = int(window_str[:-1]) / 60
        elif window_str.endswith('m'):
            minutes = int(window_str[:-1])
        elif window_str.endswith('h'):
            minutes = int(window_str[:-1]) * 60
        else:
            # Assume minutes
            minutes = int(window_str)
        
        return max(1, int(minutes))  # Minimum 1 minute
        
    except (ValueError, TypeError):
        return 5  # Default fallback

def parse_end_time(time_str: Optional[str]) -> Optional[datetime]:
    """Parse end time string to datetime"""
    if not time_str:
        return None
    
    try:
        if time_str.endswith('Z'):
            return datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        else:
            return datetime.fromisoformat(time_str)
    except ValueError:
        return None

def get_grid_bounds() -> Dict[str, Any]:
    """Get grid bounds for current configuration"""
    if GLM_USE_ABI_GRID:
        return {
            "type": "abi",
            "x_min": -5000000,  # -5000 km
            "x_max": 5000000,   # 5000 km
            "y_min": -5000000,  # -5000 km
            "y_max": 5000000,   # 5000 km
            "cell_size_m": 2000.0,
            "lon0": GLM_ABI_LON0
        }
    else:
        return {
            "type": "geodetic",
            "lat_min": -90.0,
            "lat_max": 90.0,
            "lon_min": -180.0,
            "lon_max": 180.0,
            "cell_size_deg": 0.018  # ~2km at equator
        }

async def generate_tile(z: int, x: int, y: int, window_minutes: int, 
                       end_time: Optional[datetime], qc: bool, grid_type: str) -> bytes:
    """Generate tile from current events"""
    if not _processor or not _renderer:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        # Determine actual grid type
        if grid_type == "auto":
            actual_grid_type = "abi" if GLM_USE_ABI_GRID else "geodetic"
        else:
            actual_grid_type = grid_type
        
        # Aggregate events to TOE grid
        toe_grid = _processor.aggregate_toe_grid(
            events=_events,
            time_window_minutes=window_minutes,
            end_time=end_time
        )
        
        # Get grid bounds
        grid_bounds = get_grid_bounds()
        
        # Render tile
        tile_data = _renderer.render_tile_from_grid(
            toe_grid=toe_grid,
            grid_bounds=grid_bounds,
            z=z, x=x, y=y,
            grid_type=actual_grid_type
        )
        
        return tile_data
        
    except Exception as e:
        logger.error(f"Error generating tile: {e}")
        raise

def prune_old_events():
    """Remove events older than the maximum time window"""
    global _events
    
    if not _events:
        return
    
    # Keep events from last 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    _events = [
        event for event in _events
        if event.timestamp >= cutoff_time
    ]
    
    logger.info(f"Pruned events, remaining: {len(_events)}")

async def s3_polling_task():
    """Background task for S3 polling"""
    if not _s3_fetcher:
        return
    
    logger.info(f"Starting S3 polling for bucket {GLM_S3_BUCKET}")
    
    while True:
        try:
            # Poll for new granules
            await ingest_from_s3(
                bucket_name=GLM_S3_BUCKET,
                hours_back=1,
                max_granules=5
            )
            
            # Wait for next poll
            await asyncio.sleep(GLM_S3_POLL_INTERVAL)
            
        except Exception as e:
            logger.error(f"Error in S3 polling: {e}")
            await asyncio.sleep(GLM_S3_POLL_INTERVAL)

# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True
    )
