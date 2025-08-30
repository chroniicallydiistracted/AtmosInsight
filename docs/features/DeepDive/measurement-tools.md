# Feature Deep Dive: Measurement Tools

## Feature Overview

Measurement tools would allow users to measure distances, areas, and other parameters directly on the map. This feature would help users understand scale, estimate affected areas, and quantify weather phenomena in real-world units.

## Why This Feature Matters

1. **Contextual Understanding**: Provides real-world scale to weather phenomena
2. **Educational Value**: Helps users understand the size and impact of weather events
3. **Decision Making**: Enables users to estimate affected areas and populations
4. **Professional Use**: Provides tools similar to those used by meteorologists and emergency managers

## Implementation Plan

### 1. UI/UX Design

#### A. Measurement Tools Panel
- **Location**: Top toolbar or dedicated sidebar panel
- **Components**:
  - Tool selector (Distance, Area, Temperature, Wind Speed)
  - Units selector (Metric/Imperial toggle)
  - Measurement display
  - Clear/Reset button
  - Export measurement data option

#### B. Measurement Visualization
- **Distance Tool**:
  - Click to add points
  - Display total distance
  - Show path on map

- **Area Tool**:
  - Click to add polygon points
  - Display calculated area
  - Show filled polygon on map

- **Temperature Tool**:
  - Click to get temperature at a point
  - Display temperature value
  - Show temperature gradient if available

- **Wind Tool**:
  - Click to get wind data at a point
  - Display wind speed and direction
  - Show wind vector

#### C. Advanced Options
- **Content**:
  - Precision settings
  - Coordinate display
  - Elevation data integration
  - Time-specific measurements

### 2. Technical Implementation

#### A. Measurement Tool Base Class
```typescript
abstract class MeasurementTool {
  protected map: maplibregl.Map;
  protected layerId: string;
  protected points: [number, number][] = [];
  protected active: boolean = false;

  constructor(map: maplibregl.Map, layerId: string) {
    this.map = map;
    this.layerId = layerId;
  }

  abstract start(): void;
  abstract addPoint(point: [number, number]): void;
  abstract update(): void;
  abstract finish(): void;
  abstract clear(): void;

  protected addPointToMap(point: [number, number]): void {
    // Add point to map visualization
  }

  protected removePointsFromMap(): void {
    // Remove all points from map visualization
  }

  protected getMapPoint(event: maplibregl.MapMouseEvent): [number, number] {
    return [event.lngLat.lng, event.lngLat.lat];
  }
}
```

#### B. Distance Measurement Tool
```typescript
class DistanceTool extends MeasurementTool {
  private totalDistance: number = 0;
  private lineLayerId: string;

  constructor(map: maplibregl.Map) {
    super(map, 'distance-tool');
    this.lineLayerId = 'distance-line';
  }

  start(): void {
    this.active = true;
    this.points = [];
    this.totalDistance = 0;

    // Add click listener
    this.map.on('click', this.handleClick.bind(this));
  }

  handleClick(event: maplibregl.MapMouseEvent): void {
    if (!this.active) return;

    const point = this.getMapPoint(event);
    this.addPoint(point);
  }

  addPoint(point: [number, number]): void {
    this.points.push(point);

    // Add point to map
    this.addPointToMap(point);

    // Update line if we have more than one point
    if (this.points.length > 1) {
      this.updateLine();
      this.updateDistance();
    }
  }

  updateLine(): void {
    // Remove existing line if it exists
    if (this.map.getLayer(this.lineLayerId)) {
      this.map.removeLayer(this.lineLayerId);
    }

    // Create line coordinates
    const coordinates = this.points.map(p => [p[0], p[1]]);

    // Add line layer
    this.map.addLayer({
      id: this.lineLayerId,
      type: 'line',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      },
      paint: {
        'line-color': '#ff0000',
        'line-width': 3,
        'line-opacity': 0.8
      }
    });
  }

  updateDistance(): void {
    // Calculate total distance
    this.totalDistance = 0;

    for (let i = 1; i < this.points.length; i++) {
      this.totalDistance += this.calculateDistance(
        this.points[i-1], 
        this.points[i]
      );
    }

    // Update display
    this.updateDisplay();
  }

  calculateDistance(point1: [number, number], point2: [number, number]): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2[1] - point1[1]);
    const dLon = this.toRadians(point2[0] - point1[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(point1[1])) * Math.cos(this.toRadians(point2[1])) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in kilometers
  }

  toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  updateDisplay(): void {
    // Update UI with total distance
    const unit = 'km'; // Could be configurable
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = `Total Distance: ${this.totalDistance.toFixed(2)} ${unit}`;
    }
  }

  finish(): void {
    this.active = false;
    this.map.off('click', this.handleClick);

    // Show final measurement
    alert(`Total Distance: ${this.totalDistance.toFixed(2)} km`);
  }

  clear(): void {
    this.active = false;
    this.points = [];
    this.totalDistance = 0;

    // Remove map layers
    if (this.map.getLayer(this.lineLayerId)) {
      this.map.removeLayer(this.lineLayerId);
    }

    // Remove points from map
    this.removePointsFromMap();

    // Clear display
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = '';
    }
  }
}
```

#### C. Area Measurement Tool
```typescript
class AreaTool extends MeasurementTool {
  private polygonLayerId: string;
  private area: number = 0;

  constructor(map: maplibregl.Map) {
    super(map, 'area-tool');
    this.polygonLayerId = 'area-polygon';
  }

  start(): void {
    this.active = true;
    this.points = [];
    this.area = 0;

    // Add click listener
    this.map.on('click', this.handleClick.bind(this));

    // Add double-click listener to finish polygon
    this.map.on('dblclick', this.handleDoubleClick.bind(this));
  }

  handleClick(event: maplibregl.MapMouseEvent): void {
    if (!this.active) return;

    const point = this.getMapPoint(event);
    this.addPoint(point);
  }

  handleDoubleClick(event: maplibregl.MapMouseEvent): void {
    if (!this.active) return;

    // Finish polygon on double-click
    this.finish();
  }

  addPoint(point: [number, number]): void {
    this.points.push(point);

    // Add point to map
    this.addPointToMap(point);

    // Update polygon if we have more than two points
    if (this.points.length > 2) {
      this.updatePolygon();
      this.updateArea();
    }
  }

  updatePolygon(): void {
    // Remove existing polygon if it exists
    if (this.map.getLayer(this.polygonLayerId)) {
      this.map.removeLayer(this.polygonLayerId);
    }

    // Create polygon coordinates
    const coordinates = this.points.map(p => [p[0], p[1]]);
    coordinates.push(coordinates[0]); // Close the polygon

    // Add polygon layer
    this.map.addLayer({
      id: this.polygonLayerId,
      type: 'fill',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        }
      },
      paint: {
        'fill-color': '#ff0000',
        'fill-opacity': 0.3,
        'fill-outline-color': '#ff0000',
        'fill-outline-width': 2
      }
    });
  }

  updateArea(): void {
    // Calculate area using spherical excess formula
    this.area = this.calculateArea(this.points);

    // Update display
    this.updateDisplay();
  }

  calculateArea(points: [number, number][]): number {
    // Spherical excess formula for area calculation
    const R = 6371; // Earth's radius in kilometers
    let area = 0;

    // Convert to radians
    const pointsRad = points.map(p => [
      this.toRadians(p[0]),
      this.toRadians(p[1])
    ]);

    // Calculate area
    for (let i = 0; i < pointsRad.length; i++) {
      const j = (i + 1) % pointsRad.length;
      area += (pointsRad[j][1] + pointsRad[i][1]) * 
              (pointsRad[j][0] - pointsRad[i][0]);
    }

    area = Math.abs(area * R * R / 2);

    return area;
  }

  updateDisplay(): void {
    // Update UI with total area
    const unit = 'km²'; // Could be configurable
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = `Total Area: ${this.area.toFixed(2)} ${unit}`;
    }
  }

  finish(): void {
    this.active = false;
    this.map.off('click', this.handleClick);
    this.map.off('dblclick', this.handleDoubleClick);

    // Show final measurement
    alert(`Total Area: ${this.area.toFixed(2)} km²`);
  }

  clear(): void {
    this.active = false;
    this.points = [];
    this.area = 0;

    // Remove map layers
    if (this.map.getLayer(this.polygonLayerId)) {
      this.map.removeLayer(this.polygonLayerId);
    }

    // Remove points from map
    this.removePointsFromMap();

    // Clear display
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = '';
    }
  }
}
```

#### D. Temperature Measurement Tool
```typescript
class TemperatureTool extends MeasurementTool {
  private tempLayerId: string;
  private tempData: Record<string, number> = {};

  constructor(map: maplibregl.Map) {
    super(map, 'temperature-tool');
    this.tempLayerId = 'temperature-point';
  }

  start(): void {
    this.active = true;
    this.tempData = {};

    // Add click listener
    this.map.on('click', this.handleClick.bind(this));
  }

  handleClick(event: maplibregl.MapMouseEvent): void {
    if (!this.active) return;

    const point = this.getMapPoint(event);
    this.addPoint(point);
  }

  addPoint(point: [number, number]): void {
    // Get temperature data for this point
    this.getTemperatureData(point).then(temp => {
      this.tempData[`${point[0]},${point[1]}`] = temp;

      // Add point to map
      this.addPointToMap(point);

      // Update display
      this.updateDisplay();
    });
  }

  async getTemperatureData(point: [number, number]): Promise<number> {
    // Fetch temperature data for this point
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const response = await fetch(
      `${apiBase}/api/temperature?lat=${point[1]}&lon=${point[0]}`
    );

    const data = await response.json();
    return data.temperature;
  }

  updateDisplay(): void {
    // Update UI with temperature data
    const display = document.getElementById('measurement-display');
    if (display) {
      let html = '<div class="temperature-measurements">';

      for (const [coords, temp] of Object.entries(this.tempData)) {
        const [lon, lat] = coords.split(',').map(Number);
        html += `<div>Point (${lat.toFixed(2)}, ${lon.toFixed(2)}): ${temp.toFixed(1)}°C</div>`;
      }

      html += '</div>';
      display.innerHTML = html;
    }
  }

  finish(): void {
    this.active = false;
    this.map.off('click', this.handleClick);

    // Calculate average temperature
    const temps = Object.values(this.tempData);
    const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;

    alert(`Average Temperature: ${avgTemp.toFixed(1)}°C`);
  }

  clear(): void {
    this.active = false;
    this.tempData = {};

    // Remove map layers
    if (this.map.getLayer(this.tempLayerId)) {
      this.map.removeLayer(this.tempLayerId);
    }

    // Remove points from map
    this.removePointsFromMap();

    // Clear display
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = '';
    }
  }
}
```

### 3. Integration with Map

#### A. Measurement Tool Manager
```typescript
class MeasurementToolManager {
  private map: maplibregl.Map;
  private activeTool: MeasurementTool | null = null;
  private tools: Record<string, MeasurementTool> = {};

  constructor(map: maplibregl.Map) {
    this.map = map;

    // Initialize tools
    this.tools.distance = new DistanceTool(map);
    this.tools.area = new AreaTool(map);
    this.tools.temperature = new TemperatureTool(map);
    // Add more tools as needed
  }

  activateTool(toolName: string): void {
    // Deactivate current tool if active
    if (this.activeTool) {
      this.activeTool.clear();
    }

    // Activate new tool
    if (this.tools[toolName]) {
      this.activeTool = this.tools[toolName];
      this.activeTool.start();
    }
  }

  deactivateTool(): void {
    if (this.activeTool) {
      this.activeTool.clear();
      this.activeTool = null;
    }
  }
}
```

#### B. UI Integration
```typescript
function MeasurementToolsPanel({ toolManager }: { toolManager: MeasurementToolManager }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleToolSelect = (toolName: string) => {
    if (activeTool === toolName) {
      // Deactivate if clicking the active tool
      toolManager.deactivateTool();
      setActiveTool(null);
    } else {
      // Activate selected tool
      toolManager.activateTool(toolName);
      setActiveTool(toolName);
    }
  };

  return (
    <div className="measurement-tools panel">
      <h3>Measurement Tools</h3>

      <div className="tool-buttons">
        <button 
          className={`tool-button ${activeTool === 'distance' ? 'active' : ''}`}
          onClick={() => handleToolSelect('distance')}
        >
          Distance
        </button>

        <button 
          className={`tool-button ${activeTool === 'area' ? 'active' : ''}`}
          onClick={() => handleToolSelect('area')}
        >
          Area
        </button>

        <button 
          className={`tool-button ${activeTool === 'temperature' ? 'active' : ''}`}
          onClick={() => handleToolSelect('temperature')}
        >
          Temperature
        </button>

        <button 
          className={`tool-button ${activeTool === 'wind' ? 'active' : ''}`}
          onClick={() => handleToolSelect('wind')}
        >
          Wind
        </button>
      </div>

      <div className="measurement-display" id="measurement-display">
        {/* Measurement results will be displayed here */}
      </div>

      <div className="tool-options">
        <label>
          <input type="checkbox" checked={metricUnits} onChange={e => setMetricUnits(e.target.checked)} />
          Use Metric Units
        </label>

        <button onClick={() => toolManager.deactivateTool()}>Clear</button>
      </div>
    </div>
  );
}
```

### 4. Performance Considerations

#### A. Optimization Techniques

1. **Lazy Loading**:
   - Only load tool implementations when needed
   - Remove event listeners when tools are not active

2. **Data Caching**:
   - Cache measurement results for frequently queried points
   - Implement expiration for cached data

3. **Map Layer Management**:
   - Remove unused layers from the map
   - Reuse layer IDs when possible

4. **Debouncing**:
   - Debounce rapid clicks to prevent excessive calculations
   - Implement requestAnimationFrame for smooth updates

#### B. Mobile Considerations

1. **Touch Events**:
   - Implement touch event handlers for mobile devices
   - Adjust UI spacing for touch targets

2. **Performance**:
   - Simplify calculations on lower-end devices
   - Implement progressive enhancement

### 5. Future Enhancements

#### A. Advanced Measurements

1. **Volume Calculation**:
   - Calculate affected volume for 3D weather phenomena
   - Integrate elevation data

2. **Population Impact**:
   - Estimate affected population within measured areas
   - Integrate population density data

3. **Economic Impact**:
   - Estimate economic impact based on affected areas
   - Integrate economic data layers

#### B. Integration with Other Features

1. **Time-series Measurements**:
   - Track changes in measurements over time
   - Compare measurements across different time periods

2. **Export Functionality**:
   - Export measurements as KML/GPX for use in other applications
   - Generate reports with measurements

3. **Collaboration**:
   - Share measurements with other users
   - Collaborative measurement sessions

## Implementation Roadmap

1. **Phase 1: Basic Tools**
   - Implement distance and area measurement tools
   - Add basic UI integration
   - Support for metric and imperial units

2. **Phase 2: Advanced Tools**
   - Add temperature and wind measurement tools
   - Implement data fetching for measurements
   - Add precision settings

3. **Phase 3: Integration**
   - Connect with RAG LLM for measurement explanations
   - Add educational context for measurements
   - Implement export functionality

4. **Phase 4: Advanced Features**
   - Add advanced measurement types (volume, population impact)
   - Implement time-series measurement tracking
   - Add collaboration features
