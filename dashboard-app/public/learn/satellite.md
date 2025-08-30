# Satellite Imagery (GIBS/GOES)

- Definition: Global and regional satellite layers (e.g., true color, infrared) served via NASA GIBS WMTS/XYZ and GOES products.
- Update cadence: Depends on layer and sensor; GOES-East/West full-disk imagery updates every ~10–15 minutes; some daily composites update once per day.
- Limitations: Cloud cover and sunglint can obscure surface features; some layers provide limited temporal ranges; GIBS time dimension requires selecting available dates.
- Source: NASA GIBS WMTS REST template `https://gibs.earthdata.nasa.gov/wmts/epsg{EPSG}/best/{Layer}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{ext}`; DescribeDomains can enumerate broader time ranges.

Tip:

- For Web Mercator, use `epsg3857` and `GoogleMapsCompatible_LevelN`; omitting `Time` uses the layer’s default date.
