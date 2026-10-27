# GIS export — from pixel mask to projected shapes

## Short answer to the render question

Yes, the render has to be adjusted. A SAM mask in pixel coordinates
is not geography. To get a georeferenced, projected deliverable:

1. **The image must arrive georeferenced.** A supplied image needs
   its tile range + crop (from `pull_satellite.py`, exact) or a
   supplied bbox + zoom (approximate, within about a pixel). No
   georeference, no GIS export — never guess a bbox.
2. **Pixels are projected, not plotted.** `src/gis-export.mjs`
   converts pixels through inverse Web Mercator (EPSG:3857 → 4326),
   never linear in latitude. The same transform must drive any
   render that draws the mask: project lon/lat → screen, don't
   place shapes by pixel offsets.
3. **Shapes ship as GeoJSON, EPSG:4326, [lon, lat] order.**
   `assets/nagqu-snow-mask.geojson` is the real example: AOI polygon,
   mask bbox polygon, mask centroid point, all labelled
   COMPUTED MASK with prompt, model, pixel count, and image source.
4. **Open it, don't hunt for it.** In ArcGIS Pro, QGIS, or ERDAS
   IMAGINE: Add Data → the `.geojson` file. It lands on the map in
   the right place, in WGS 84. The PNG itself opens georeferenced
   alongside its `.pgw` world file + `.prj` (generated on the
   owner's machine with `worldFileContents()` / `WGS84_PRJ` — the
   world file is an affine transform in degrees, approximate for a
   small area; the GeoJSON is the exact record).

## What this is not

- **Not measured data.** The mask is a COMPUTED MASK over supplied
  imagery. It is not ground truth, not a survey, not a prediction.
- **Not the generated illustration.** Step 6's generated visual is
  concept art. It is never georeferenced and never overlaid on a
  map. Anyone who does that has broken the label rule.
- **Not analysis-ready multispectral data.** Esri World Imagery
  tiles are an RGB visual basemap. Real spectral work uses
  Sentinel-2 L2A or Landsat Collection 2 Level-2 GeoTIFFs, which
  arrive already georeferenced with their own CRS and transform,
  and must be processed with GDAL/rasterio — not through PNG tiles.
  This module handles the tile/PNG visual-bridge case honestly and
  says so. A future step runs SAM on the GeoTIFFs directly.

## Sources, studied Oct 26

- Esri World Imagery tiles (`server.arcgisonline.com`, tile
  `/{z}/{y}/{x}`), attribution: Esri, Maxar, Earthstar
  Geographics, GIS User Community. Already used for the Nagqu
  z12 image, sidecar recorded.
- USGS EarthExplorer: Landsat Collection 2 (Level-1/Level-2,
  GeoTIFF/COG, orthorectified, WGS 84 / UTM), SRTM, MODIS.
  Free, no-cost open data policy since 2008.
- ESA Copernicus: Sentinel-2 Level-2A, orthorectified, surface
  reflectance, 13 bands, 10/20/60 m, GeoTIFF delivery.
- Established GIS practice, confirmed by search: segmentation
  outputs ship as georeferenced GeoTIFF (raster) or
  GeoPackage/Shapefile/GeoJSON (vector) — e.g. SamGeo/QGIS
  GeoAI outputs. That is the pattern this module follows, in
  dependency-free Node, so the repo stays checkable with no install.

## Verified numbers (Nagqu snow mask)

Image 1165×1394, bbox 94.9–95.3E, 33.1–33.5N, zoom 12.
Mask box [776, 377, 831, 444], 2197 pixels, prompt "snow", sam-3.1.

Projected mask polygon (lon, lat):
- NW 95.16632080078125, 33.391892775778075
- SE 95.1852035522461, 33.372685170762125
- Centroid 95.17576217651367, 33.38228950363706
- About 1,756 m × 2,132 m at 33.3°N.

Corners round-trip to the bbox within one pixel; the tile path is
exact, the bbox fallback is within 0.00012° (~11 m) of it.
Tests: `test/gis-export.mjs`, 7/7 PASS (includes KML), checked independently
in Python before the JS was written.

## KML + open map viewer (Oct 27 fix)

The GeoJSON above is the single source of truth. `geoJsonToKml` in
`src/gis-export.mjs` (mirrored by `geojson_to_kml` in
`gis/gis_export.py`) converts it to OGC KML 2.2 — same coordinates,
same COMPUTED MASK label, lon,lat,0 order, XML-escaped properties —
so the mask opens in QGIS, Google Earth, and any KML reader without
hunting for a polygon in a GIS. Checked-in: `assets/nagqu-snow-mask.kml`,
generated from the GeoJSON, JS/Python coordinate strings identical.
`viewer/map-viewer.html` is a dependency-free Leaflet + OpenStreetMap
viewer that loads the GeoJSON and draws the AOI, COMPUTED MASK, and
centroid with popups; serve the repo folder over HTTP to open it.
No generated visual is ever drawn on the map.
