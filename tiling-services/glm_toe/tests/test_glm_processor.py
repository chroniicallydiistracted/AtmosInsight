"""
Tests for GLM Data Processor
Tests the complete GLM processing pipeline
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os

from app.glm_processor import GLMDataProcessor, GLMEvent, GLMGranule

class TestGLMEvent:
    """Test GLMEvent dataclass"""
    
    def test_event_creation(self):
        """Test creating a GLM event"""
        event = GLMEvent(
            lat=35.0,
            lon=-75.0,
            energy_j=1e-12,  # 1 picojoule
            timestamp=datetime.utcnow(),
            quality_flag=1
        )
        
        assert event.lat == 35.0
        assert event.lon == -75.0
        assert event.energy_j == 1e-12
        assert event.energy_fj == 1e-3  # 1 femtojoule
    
    def test_energy_conversion(self):
        """Test energy conversion from Joules to femtojoules"""
        event = GLMEvent(
            lat=0.0,
            lon=0.0,
            energy_j=1e-15,  # 1 femtojoule
            timestamp=datetime.utcnow()
        )
        
        assert event.energy_fj == 1.0

class TestGLMGranule:
    """Test GLMGranule dataclass"""
    
    def test_granule_creation(self):
        """Test creating a GLM granule"""
        events = [
            GLMEvent(lat=35.0, lon=-75.0, energy_j=1e-12, timestamp=datetime.utcnow()),
            GLMEvent(lat=35.1, lon=-75.1, energy_j=2e-12, timestamp=datetime.utcnow())
        ]
        
        granule = GLMGranule(
            path="test.nc",
            satellite="G18",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            creation_time=datetime.utcnow(),
            events=events
        )
        
        assert granule.path == "test.nc"
        assert granule.satellite == "G18"
        assert len(granule.events) == 2

class TestGLMDataProcessor:
    """Test GLM Data Processor"""
    
    @pytest.fixture
    def processor(self):
        """Create a test processor instance"""
        return GLMDataProcessor(use_abi_grid=False, abi_lon0=-75.0)
    
    def test_processor_initialization(self, processor):
        """Test processor initialization"""
        assert processor.use_abi_grid == False
        assert processor.abi_lon0 == -75.0
        assert processor.grid_cell_size_m == 2000.0
        assert processor.default_window_minutes == 5
    
    def test_processor_initialization_abi(self):
        """Test processor initialization with ABI grid"""
        processor = GLMDataProcessor(use_abi_grid=True, abi_lon0=-75.0)
        assert processor.use_abi_grid == True
        assert processor.abi_lon0 == -75.0
    
    def test_filename_parsing_valid(self, processor):
        """Test parsing valid GLM filename"""
        filename = "OR_GLM-L2-LCFA_G18_s2025240010000_e2025240010020_c2025240010030.nc"
        metadata = processor.parse_granule_filename(filename)
        
        assert metadata['satellite'] == 'G18'
        assert metadata['start_time'].year == 2025
        assert metadata['start_time'].hour == 1
        assert metadata['start_time'].minute == 0
    
    def test_filename_parsing_invalid(self, processor):
        """Test parsing invalid GLM filename"""
        filename = "invalid_filename.nc"
        metadata = processor.parse_granule_filename(filename)
        
        # Should return fallback values
        assert metadata['satellite'] == 'G16'
        assert isinstance(metadata['start_time'], datetime)
    
    def test_aggregate_toe_grid_empty(self, processor):
        """Test TOE aggregation with no events"""
        events = []
        grid = processor.aggregate_toe_grid(events, time_window_minutes=5)
        
        assert grid.shape == (1, 1)
        assert grid[0, 0] == 0.0
    
    def test_aggregate_toe_grid_with_events(self, processor):
        """Test TOE aggregation with events"""
        # Create test events
        now = datetime.utcnow()
        events = [
            GLMEvent(lat=35.0, lon=-75.0, energy_j=1e-12, timestamp=now),
            GLMEvent(lat=35.1, lon=-75.1, energy_j=2e-12, timestamp=now),
            GLMEvent(lat=35.2, lon=-75.2, energy_j=3e-12, timestamp=now)
        ]
        
        grid = processor.aggregate_toe_grid(events, time_window_minutes=5)
        
        # Should have some non-zero values
        assert np.any(grid > 0)
        assert grid.shape[0] > 1 or grid.shape[1] > 1
    
    def test_aggregate_toe_grid_time_window(self, processor):
        """Test TOE aggregation with time window filtering"""
        now = datetime.utcnow()
        old_time = now - timedelta(minutes=10)
        
        events = [
            GLMEvent(lat=35.0, lon=-75.0, energy_j=1e-12, timestamp=now),      # In window
            GLMEvent(lat=35.1, lon=-75.1, energy_j=2e-12, timestamp=old_time), # Out of window
            GLMEvent(lat=35.2, lon=-75.2, energy_j=3e-12, timestamp=now)       # In window
        ]
        
        grid = processor.aggregate_toe_grid(events, time_window_minutes=5, end_time=now)
        
        # Should only include recent events
        assert np.any(grid > 0)
    
    def test_grid_metadata(self, processor):
        """Test grid metadata retrieval"""
        metadata = processor.get_grid_metadata()
        
        assert 'use_abi_grid' in metadata
        assert 'grid_cell_size_m' in metadata
        assert 'default_window_minutes' in metadata
        assert metadata['use_abi_grid'] == False
        assert metadata['grid_cell_size_m'] == 2000.0

class TestGLMDataProcessorABI:
    """Test GLM Data Processor with ABI grid"""
    
    @pytest.fixture
    def processor_abi(self):
        """Create a test processor instance with ABI grid"""
        return GLMDataProcessor(use_abi_grid=True, abi_lon0=-75.0)
    
    def test_abi_grid_initialization(self, processor_abi):
        """Test ABI grid initialization"""
        assert processor_abi.use_abi_grid == True
        assert processor_abi.abi_lon0 == -75.0
        
        # Check that ABI transformers are set up
        assert hasattr(processor_abi, 'wgs84_to_abi')
        assert hasattr(processor_abi, 'abi_to_wgs84')
    
    def test_abi_grid_aggregation(self, processor_abi):
        """Test TOE aggregation with ABI grid"""
        # Create test events
        now = datetime.utcnow()
        events = [
            GLMEvent(lat=35.0, lon=-75.0, energy_j=1e-12, timestamp=now),
            GLMEvent(lat=35.1, lon=-75.1, energy_j=2e-12, timestamp=now)
        ]
        
        grid = processor_abi.aggregate_toe_grid(events, time_window_minutes=5)
        
        # Should have some non-zero values
        assert np.any(grid > 0)
        assert grid.shape[0] > 1 or grid.shape[1] > 1

class TestGLMDataProcessorIntegration:
    """Integration tests for GLM Data Processor"""
    
    @pytest.fixture
    def processor(self):
        """Create a test processor instance"""
        return GLMDataProcessor(use_abi_grid=False, abi_lon0=-75.0)
    
    @patch('app.glm_processor.xr.open_dataset')
    def test_read_glm_granule_mock(self, mock_open_dataset, processor):
        """Test reading GLM granule with mocked xarray"""
        # Mock dataset
        mock_ds = Mock()
        mock_ds.variables = {
            'event_lat': Mock(values=np.array([35.0, 35.1])),
            'event_lon': Mock(values=np.array([-75.0, -75.1])),
            'event_energy': Mock(values=np.array([1e-12, 2e-12])),
            'event_time': Mock(
                values=np.array([0, 1000]),
                attrs={'units': 'milliseconds since 2025-01-01 00:00:00'}
            )
        }
        mock_ds.attrs = {}
        mock_open_dataset.return_value = mock_ds
        
        # Test reading
        granule = processor.read_glm_granule("test.nc")
        
        assert granule.path == "test.nc"
        assert len(granule.events) == 2
        assert granule.events[0].lat == 35.0
        assert granule.events[0].lon == -75.0
    
    def test_coordinate_validation(self, processor):
        """Test coordinate validation in event processing"""
        # Valid coordinates
        valid_event = GLMEvent(
            lat=35.0,
            lon=-75.0,
            energy_j=1e-12,
            timestamp=datetime.utcnow()
        )
        
        # Invalid coordinates
        invalid_events = [
            GLMEvent(lat=91.0, lon=-75.0, energy_j=1e-12, timestamp=datetime.utcnow()),  # Lat > 90
            GLMEvent(lat=35.0, lon=181.0, energy_j=1e-12, timestamp=datetime.utcnow()),  # Lon > 180
            GLMEvent(lat=-91.0, lon=-75.0, energy_j=1e-12, timestamp=datetime.utcnow()), # Lat < -90
            GLMEvent(lat=35.0, lon=-181.0, energy_j=1e-12, timestamp=datetime.utcnow()), # Lon < -180
        ]
        
        # Test valid event
        events = [valid_event]
        grid = processor.aggregate_toe_grid(events, time_window_minutes=5)
        assert np.any(grid > 0)
        
        # Test invalid events (should be filtered out)
        grid = processor.aggregate_toe_grid(invalid_events, time_window_minutes=5)
        assert not np.any(grid > 0)
    
    def test_energy_validation(self, processor):
        """Test energy validation in event processing"""
        # Valid energy
        valid_event = GLMEvent(
            lat=35.0,
            lon=-75.0,
            energy_j=1e-12,
            timestamp=datetime.utcnow()
        )
        
        # Invalid energy
        invalid_event = GLMEvent(
            lat=35.0,
            lon=-75.0,
            energy_j=-1e-12,  # Negative energy
            timestamp=datetime.utcnow()
        )
        
        # Test valid event
        events = [valid_event]
        grid = processor.aggregate_toe_grid(events, time_window_minutes=5)
        assert np.any(grid > 0)
        
        # Test invalid event (should be filtered out)
        grid = processor.aggregate_toe_grid([invalid_event], time_window_minutes=5)
        assert not np.any(grid > 0)

if __name__ == "__main__":
    pytest.main([__file__])
