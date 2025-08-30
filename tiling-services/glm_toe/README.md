# GLM TOE Service - Complete Implementation

A complete FastAPI service for processing GLM (Geostationary Lightning Mapper) Level-2 lightning data and generating TOE (Total Optical Energy) heatmap tiles for web maps.

## 🎯 Overview

This service implements the complete pipeline described in the GLM documentation:

1. **Data Ingestion**: Fetch GLM L2 granules from AWS S3 public buckets
2. **Data Processing**: Parse NetCDF4 files and extract lightning events
3. **TOE Aggregation**: Aggregate events into 2×2 km grids over time windows
4. **Tile Generation**: Render PNG tiles with production-ready color mapping
5. **Web Serving**: Serve tiles via REST API for integration with web maps

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AWS S3        │    │   GLM Processor  │    │  Tile Renderer  │
│   GLM L2 Data   │───▶│   NetCDF4 Parse │───▶│   PNG Generation│
│   (Public)      │    │   TOE Aggregation│    │   Color Mapping │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   FastAPI        │    │   Web Maps      │
                       │   REST API       │    │   (MapLibre)    │
                       │   Tile Endpoints │    │   Tile Overlay  │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Features

### Core Functionality

- **Complete GLM L2 Pipeline**: From raw NetCDF4 files to web-ready tiles
- **Dual Grid Support**: ABI fixed grid (~2km) or geodetic grid
- **Time Window Aggregation**: Configurable 1-60 minute TOE windows
- **Production Color Mapping**: Scientific visualization color ramps
- **Tile Caching**: LRU cache with configurable size

### Data Sources

- **AWS S3 Integration**: Direct access to NOAA GOES buckets
- **Local File Support**: Process local NetCDF4 files
- **Real-time Polling**: Optional S3 monitoring for new granules
- **Multiple Satellites**: GOES-East (G16) and GOES-West (G18)

### API Endpoints

- **Tile Service**: `GET /tiles/{z}/{x}/{y}.png`
- **Data Ingestion**: `POST /ingest`, `POST /ingest_files`, `POST /ingest_s3`
- **Service Status**: `GET /health`, `GET /status`, `GET /s3/status`
- **Grid Information**: `GET /grid/info`

## 📦 Installation

### Prerequisites

- Python 3.8+
- pip or conda

### Setup

```bash
# Clone the repository
cd tiling-services/glm_toe

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional)
export GLM_USE_ABI_GRID=true
export GLM_S3_POLL_ENABLED=true
export GLM_S3_BUCKET=noaa-goes18
```

## ⚙️ Configuration

### Environment Variables

| Variable               | Default       | Description                           |
| ---------------------- | ------------- | ------------------------------------- |
| `GLM_USE_ABI_GRID`     | `true`        | Use ABI fixed grid (higher quality)   |
| `GLM_ABI_LON0`         | `-75.0`       | ABI grid longitude center (GOES-East) |
| `GLM_TILE_CACHE_SIZE`  | `128`         | Maximum cached tiles                  |
| `GLM_S3_POLL_ENABLED`  | `false`       | Enable S3 polling for new granules    |
| `GLM_S3_POLL_INTERVAL` | `60`          | S3 polling interval (seconds)         |
| `GLM_S3_BUCKET`        | `noaa-goes18` | Default S3 bucket for GLM data        |
| `PORT`                 | `8000`        | Service port                          |

### Grid Configuration

#### ABI Fixed Grid (Recommended)

- **Cell Size**: 2×2 km
- **Coverage**: CONUS and surrounding areas
- **Projection**: GOES-R geostationary
- **Quality**: Higher precision, official NOAA standard

#### Geodetic Grid

- **Cell Size**: ~2 km at mid-latitudes
- **Coverage**: Global
- **Projection**: WGS84 lat/lon
- **Quality**: Standard, good for global applications

## 🚀 Usage

### Starting the Service

```bash
# Development mode
python -m app.main

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000

# With custom port
PORT=8080 python -m app.main
```

### API Examples

#### Get a Tile

```bash
# Basic tile request
curl "http://localhost:8000/tiles/5/9/12.png"

# With time window
curl "http://localhost:8000/tiles/5/9/12.png?window=5m"

# With specific end time
curl "http://localhost:8000/tiles/5/9/12.png?window=5m&t=2025-01-01T12:00:00Z"

# With grid type selection
curl "http://localhost:8000/tiles/5/9/12.png?grid_type=abi"
```

#### Ingest Data from S3

```bash
# Ingest latest granules
curl -X POST "http://localhost:8000/ingest_s3?bucket_name=noaa-goes18&hours_back=2&max_granules=15"
```

#### Check Service Status

```bash
# Health check
curl "http://localhost:8000/health"

# Detailed status
curl "http://localhost:8000/status"

# S3 bucket status
curl "http://localhost:8000/s3/status"
```

### Web Map Integration

#### MapLibre GL JS

```javascript
// Add GLM TOE layer to your map
map.addSource('glm-toe', {
  type: 'raster',
  tiles: ['http://localhost:8000/tiles/{z}/{x}/{y}.png?window=5m'],
  tileSize: 256,
  minzoom: 0,
  maxzoom: 10,
});

map.addLayer({
  id: 'glm-toe-layer',
  type: 'raster',
  source: 'glm-toe',
  paint: {
    'raster-opacity': 0.8,
    'raster-resampling': 'linear',
  },
});
```

#### Leaflet

```javascript
// Add GLM TOE layer to Leaflet map
L.tileLayer('http://localhost:8000/tiles/{z}/{x}/{y}.png?window=5m', {
  tileSize: 256,
  minZoom: 0,
  maxZoom: 10,
  opacity: 0.8,
}).addTo(map);
```

## 🧪 Testing

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-mock

# Run all tests
pytest

# Run specific test file
pytest tests/test_glm_processor.py

# Run with coverage
pytest --cov=app --cov-report=html
```

### Test Coverage

- **Unit Tests**: Individual module functionality
- **Integration Tests**: End-to-end pipeline testing
- **Mock Tests**: S3 and external dependency mocking
- **Validation Tests**: Coordinate and data validation

## 📊 Data Flow

### 1. Data Ingestion

```
AWS S3 → GLM L2 Granules → NetCDF4 Parse → GLMEvent Objects
```

### 2. TOE Aggregation

```
GLMEvent Objects → Time Window Filter → Spatial Grid Binning → TOE Grid
```

### 3. Tile Generation

```
TOE Grid → Color Mapping → Web Mercator Projection → PNG Tile
```

### 4. Web Serving

```
PNG Tile → FastAPI Endpoint → Web Map Overlay
```

## 🔧 Development

### Project Structure

```
glm_toe/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── glm_processor.py     # Core GLM processing
│   ├── tile_renderer.py     # Tile generation
│   ├── s3_fetcher.py        # S3 data fetching
│   └── ingest_glm.py        # Legacy ingestion (deprecated)
├── tests/
│   ├── test_glm_processor.py
│   ├── test_tile_renderer.py
│   └── test_s3_fetcher.py
├── requirements.txt
└── README.md
```

### Adding New Features

1. **Core Logic**: Add to appropriate module (`glm_processor.py`, `tile_renderer.py`, etc.)
2. **API Endpoints**: Add to `main.py`
3. **Tests**: Create corresponding test files
4. **Documentation**: Update this README

### Code Style

- **Type Hints**: Use Python type hints throughout
- **Docstrings**: Comprehensive docstrings for all functions
- **Error Handling**: Graceful error handling with logging
- **Testing**: Unit tests for all new functionality

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check dependencies
pip install -r requirements.txt

# Check Python version (3.8+ required)
python --version

# Check port availability
netstat -tulpn | grep :8000
```

#### No Tiles Generated

```bash
# Check if events are ingested
curl "http://localhost:8000/status"

# Check S3 connectivity
curl "http://localhost:8000/s3/status"

# Check logs for errors
tail -f logs/glm_toe.log
```

#### Poor Tile Quality

```bash
# Enable ABI grid for higher quality
export GLM_USE_ABI_GRID=true

# Adjust time window
curl "http://localhost:8000/tiles/5/9/12.png?window=1m"
```

### Performance Tuning

- **Cache Size**: Increase `GLM_TILE_CACHE_SIZE` for better performance
- **Grid Type**: Use ABI grid for higher quality, geodetic for global coverage
- **Time Windows**: Shorter windows (1-5 min) for real-time, longer for analysis

## 📚 API Reference

### Tile Endpoint

```
GET /tiles/{z}/{x}/{y}.png
```

**Parameters:**

- `z` (int): Zoom level (0-20)
- `x` (int): Tile X coordinate
- `y` (int): Tile Y coordinate
- `window` (str): Time window (e.g., "1m", "5m", "300s")
- `t` (str): End time ISO8601 (UTC)
- `qc` (bool): Enable quality filtering
- `grid_type` (str): Grid type ("auto", "abi", "geodetic")

**Response:**

- PNG image tile
- Headers: Cache status, tile info, time window

### Data Ingestion Endpoints

#### POST /ingest

Ingest individual GLM events.

#### POST /ingest_files

Ingest GLM granules from local files or S3 paths.

#### POST /ingest_s3

Ingest latest granules from S3 bucket.

### Status Endpoints

#### GET /health

Basic health check.

#### GET /status

Detailed service status and configuration.

#### GET /s3/status

S3 bucket connectivity and status.

#### GET /grid/info

Grid configuration and bounds information.

## 🔗 External Dependencies

### Data Sources

- **NOAA GOES S3 Buckets**: Public access to GLM L2 data
- **GOES-East**: `s3://noaa-goes16/GLM-L2-LCFA/`
- **GOES-West**: `s3://noaa-goes18/GLM-L2-LCFA/`

### Libraries

- **FastAPI**: Web framework
- **xarray**: NetCDF4 data handling
- **numpy**: Numerical operations
- **pyproj**: Coordinate transformations
- **Pillow**: Image processing
- **boto3**: AWS S3 integration

## 📄 License

This project is part of the AtmosInsight system. See the main repository for license information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For issues and questions:

1. Check this README and troubleshooting section
2. Review the test files for usage examples
3. Check the main AtmosInsight repository
4. Open an issue with detailed error information

---

**Note**: This service is designed to work with the complete AtmosInsight system. For standalone usage, ensure all dependencies are properly configured and S3 access is available.
