# GIS export — Python implementation (GeoAI patterns)

Pushed Oct 27, Salvador-approved: Python primary. This note and `gis/` are in the repo.
The JS module `src/gis-export.mjs` is in the repo as the cross-check reference
until pushed separately. Nothing here replaces
the label/receipt rules: the output is a COMPUTED MASK, never
measured data, never ground truth, never a prediction.

## The graph

```
supplied image + sidecar (pull_satellite.py: bbox, zoom,
  tile range, crop_px, size_px)
        |
        v
image_from_sidecar()  -- no sidecar / no bbox+zoom: no export,
        |                never guess a bbox; sidecar size mismatch: throw
        v
pixel -> global tile pixels (tile path, exact)
  or -> Mercator-space interpolation (bbox fallback, ~1 px)
        |
        v
inverse Web Mercator (asinh/tan, EPSG:3857 -> EPSG:4326)
  never linear in latitude
        |
        +---> box_to_polygon / box_centroid  (SAM box, pixels)
        |
        +---> build_gis_geojson()  GeoJSON, EPSG:4326, exactly 3 features:
        |       AOI polygon, COMPUTED MASK polygon, mask centroid point
        |
        +---> build_geodataframe() -> write_geopackage()  GeoPackage
        |       (same 3 features; mask_box_px stored as a JSON string,
        |       because GeoPackage cannot store a list column)
        |
        +---> write_world_and_prj()  .pgw world file (affine, degrees,
                approximate for a small area) + WGS84 .prj, so the PNG
                itself opens georeferenced in QGIS / ArcGIS / ERDAS.
```

A crop of a georeferenced image (the Fiji island crop) is handled by
`image_from_crop()`: it inherits the parent's zoom/tile origin with
the crop offset shifted, and its bbox is derived from the parent's
transform at the crop corners. No new georeference is guessed.

## Why GeoAI Python is primary

GeoAI Python (`geoai-py`, OpenGeoAI) is the established pattern for
this exact job: foundation-model segmentation output shipped as
georeferenced vector/raster (GeoJSON / GeoPackage / GeoTIFF), with
real CRS handling, QGIS integration, and a foundation-model
catalog. This implementation follows that pattern directly on the
stack already installed in `~/workspace/gis-venv` — rasterio 1.5.2,
geopandas 1.2.0, shapely 2.2.0, pyproj 3.8.0.

Honest status: the `geoai-py` package itself is **not installed**
and is **not** a dependency of `gis/gis_export.py`. No GeoAI model
call, catalog lookup, or QGIS plugin is wired. What is built here is
the GeoAI-pattern pipeline (projected shapes + GeoPackage) on the
same libraries GeoAI builds on, verified against the JS reference.
Installing `geoai-py` and running a GeoAI segmentation model is a
separate, approved-later step — do not claim it is done.

## What gis-mcp and Mundi would add later — and do not replace

- **gis-mcp** (later, tool layer): MCP tools over Shapely /
  GeoPandas / Rasterio / PyProj / PySAL, so an agent can call GIS
  operations as tools. It does not replace this pipeline: the
  projection math, the label, and the verification against the JS
  reference stay in `gis/gis_export.py`. It is not installed or
  wired here.
- **Mundi** (later, frontend only): open-source web GIS
  (PostGIS-backed) for *viewing* the GeoJSON/GeoPackage on a map.
  It does not replace the pipeline either: it displays shapes, it
  does not compute them, and it must never be the source of a
  mask. It is not installed or wired here.
- **Rust** (only for a proven hot node): no Rust code here. A Rust
  reimplementation is justified only if a measured hot node in this
  pipeline proves slow — not on speculation.

## Verification (2026-10-27)

- Python tests: `gis/test_gis_export.py`, **21 tests, all PASS** (20 + KML format-conversion test, Oct 27)
  (run: `~/workspace/gis-venv/bin/python -m unittest discover -s gis -p "test_*.py" -v`).
  Covers the JS module's 7 checks, the Fiji polygon/centroid, the
  Fiji crop image giving the same polygon as the full image, the
  sidecar builder, a pyproj EPSG:3857->4326 cross-check, GeoJSON
  matching the recorded `assets/nagqu-snow-mask.geojson`, a
  GeoPackage round-trip, and 8 throwing edge cases (no georeference,
  pixel outside image, missing width/height, missing zoom, bad box,
  world file without bbox, antimeridian-crossing bbox, sidecar size
  mismatch).
- Live JS cross-check: `gis/crosscheck_js.py` runs the real
  `src/gis-export.mjs` under node and diffs every coordinate.
  Worst difference **1.421e-14 degrees** (tolerance 1e-6). The JS
  checker still passes: `node test/check.mjs` = CHECK PASS,
  `node test/gis-export.mjs` = 7/7 PASS (includes KML). No existing file was edited.
- Verified numbers: Nagqu mask box [776, 377, 831, 444] -> NW
  95.16632080078125, 33.391892775778075; SE 95.1852035522461,
  33.372685170762125; centroid 95.17576217651367,
  33.38228950363706. Fiji mask -> polygon
  [[-178.49624633789062, -18.427501971948598],
  [-178.4564208984375, -18.427501971948598],
  [-178.4564208984375, -18.448021023457002],
  [-178.49624633789062, -18.448021023457002], ...];
  centroid [-178.47633361816406, -18.437761803935633].

## Limitations, not hidden

- **Antimeridian:** the tile path does not wrap. A tile range
  wrapping past tile x = 2**zoom - 1, or a bbox with
  lon_max < lon_min, raises ValueError in the Python module
  instead of producing a wrong longitude. (The JS module has the
  same limitation and does not raise; the raise is an intentional
  Python-side guard.) A non-wrapping bbox containing the
  antimeridian region (Fiji, -178.6 to -178.2) works correctly.
- **Bbox fallback is approximate** (~1 pixel, ~0.00012 deg here):
  bbox corners are rounded and the crop is rounded to whole
  pixels. The tile path is exact; prefer it.
- **World file is an affine transform in degrees**, approximate
  for a small area. The GeoJSON is the exact record.
- **Esri World Imagery is an RGB visual basemap**, not
  analysis-ready multispectral data. Real spectral work needs
  Sentinel-2 L2A / Landsat Collection 2 Level-2 GeoTIFFs through
  GDAL/rasterio, not PNG tiles.
- **SAM video is not smoke-tested** and is not part of this work.
- **gis-mcp and Mundi are not wired.** Do not claim otherwise.

## Decision — approved by Salvador Oct 27

Option 1 approved: Python primary, JS reference. The other option was:

1. **Swap: Python primary, JS reference.** `gis/gis_export.py`
   becomes the GIS export used by the pipeline; `src/gis-export.mjs`
   stays in the repo as the cross-check reference (its tests keep
   running). Any future GIS change lands in Python first and is
   cross-checked against the JS module.
2. **Keep JS primary.** The Python module stays as a verified
   local alternative / second implementation; the pipeline keeps
   calling the JS module, and the Python code is used for
   GeoPackage output only, on request.

The JS module is in the repo as the cross-check reference; its tests keep running in `node test/check.mjs`. Any future GIS change lands in Python first and is cross-checked against the JS module. KML conversion is mirrored in both (`geojson_to_kml` / `geoJsonToKml`) from the same GeoJSON, and `viewer/map-viewer.html` (Leaflet + OpenStreetMap) draws that GeoJSON in a browser with no GIS install.
