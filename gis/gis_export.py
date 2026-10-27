"""GIS export (Python) — georeferenced shapes for a SAM mask over a supplied image.

Python reimplementation of ``src/gis-export.mjs``, on the GeoAI-pattern
stack (rasterio / geopandas / shapely / pyproj). The ``geoai-py``
package itself is NOT installed and is NOT a dependency of this module:
what is used here is the GeoAI output pattern — segmentation output
shipped as georeferenced GeoJSON / GeoPackage, EPSG:4326, with an
explicit computed-mask label — implemented directly on
rasterio/geopandas/shapely/pyproj. Do not claim geoai-py is wired.

Same rules as the JS module, mirrored function for function:

- The image must be supplied by the owner, with its georeference.
  No georeference, no GIS export. Never guess a bbox.
- The output is a COMPUTED MASK, never measured data, never ground
  truth, never a prediction.
- The generated illustration (Step 6) is NEVER georeferenced and
  NEVER overlaid on a map.
- Esri World Imagery tiles are an RGB visual basemap, not
  analysis-ready multispectral data. Analysis-ready sources
  (Sentinel-2 L2A / Landsat Collection 2 Level-2 GeoTIFFs) arrive
  already georeferenced and must be run through GDAL/rasterio, not
  through PNG tiles. This module handles the tile/PNG case honestly.

Antimeridian limitation (documented, not hidden): the exact tile
path does NOT wrap. An image whose tile range wraps past tile x =
2**zoom - 1, or a bbox with lon_max < lon_min (crossing the
antimeridian), raises ValueError instead of producing a wrong
longitude. The bbox path handles a non-wrapping bbox that *contains*
the antimeridian region (e.g. Fiji, -178.6 to -178.2) correctly,
because it interpolates in Mercator space from the supplied
corners. The JS module has the same limitation and does not raise;
the raise here is an intentional Python-side guard, documented in
docs/GIS_PYTHON.md. The JS module stays the reference until
Salvador approves a swap.

Math: pixel -> Web Mercator -> WGS 84 lon/lat (EPSG:4326), using
the asinh/tan inverse-Mercator formulas, never linear in latitude.
Formulas and operation order mirror the JS module so the two
implementations agree to 1e-6 degrees or better on the verified
Nagqu and Fiji cases.
"""

import json
import math
from pathlib import Path

TILE = 256

WGS84_PRJ = (
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
    'SPHEROID["WGS_1984",6378137,298.257223563]],'
    'PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
)


def _is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def lon_lat_to_tile_xy(lon, lat, zoom):
    """lon/lat -> fractional Web Mercator tile coordinates."""
    n = 2 ** zoom
    x = ((lon + 180) / 360) * n
    y = ((1 - math.asinh(math.tan((lat * math.pi) / 180)) / math.pi) / 2) * n
    return [x, y]


def tile_xy_to_lon_lat(x, y, zoom):
    """Fractional tile coordinates -> lon/lat (inverse Web Mercator)."""
    n = 2 ** zoom
    lon = (x / n) * 360 - 180
    lat = (math.atan(math.sinh(math.pi * (1 - (2 * y) / n))) * 180) / math.pi
    return [lon, lat]


def pixel_to_lon_lat(px, py, image):
    """Pixel (px, py, origin top-left) in the supplied image -> [lon, lat].

    ``image`` must carry EITHER::

        {width, height, zoom, tile_x0, tile_y0, crop_px: [px0, py0, px1, py1]}
            exact, from a pull_satellite.py sidecar, or
        {width, height, bbox: [lon_min, lon_max, lat_min, lat_max], zoom}
            bbox corners converted to Mercator space, interpolated
            there, then inverted. Approximate to the precision of the
            supplied bbox and to whole pixels; prefer the tile path.

    Key spellings follow the Python convention (``tile_x0`` etc.).
    ``image_from_sidecar`` / ``image_from_dict`` accept the JS
    spellings (``tileX0`` etc.) as well, so sidecars and JS fixtures
    can be passed through unchanged.
    """
    if not image or not _is_number(image.get("width")) or not _is_number(image.get("height")):
        raise ValueError("gis-export: image needs width and height")
    width, height = image["width"], image["height"]
    if px < 0 or py < 0 or px > width or py > height:
        raise ValueError(
            f"gis-export: pixel ({px}, {py}) is outside the image {width}x{height}"
        )
    if not _is_number(image.get("zoom")):
        raise ValueError("gis-export: image needs a zoom")
    zoom = image["zoom"]

    tile_x0 = image.get("tile_x0", image.get("tileX0"))
    tile_y0 = image.get("tile_y0", image.get("tileY0"))
    crop_px = image.get("crop_px", image.get("cropPx"))
    bbox = image.get("bbox")

    if (
        isinstance(tile_x0, int)
        and not isinstance(tile_x0, bool)
        and isinstance(tile_y0, int)
        and not isinstance(tile_y0, bool)
        and isinstance(crop_px, (list, tuple))
        and len(crop_px) == 4
    ):
        gx = tile_x0 * TILE + crop_px[0] + px
        gy = tile_y0 * TILE + crop_px[1] + py
        n = 2 ** zoom
        if gx / TILE > n or gx < 0:
            raise ValueError(
                "gis-export: antimeridian wrap unsupported — "
                "tile range wraps past the antimeridian; no export"
            )
        return tile_xy_to_lon_lat(gx / TILE, gy / TILE, zoom)
    if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        lon_min, lon_max, lat_min, lat_max = bbox
        if lon_max < lon_min:
            raise ValueError(
                "gis-export: antimeridian wrap unsupported — "
                "bbox crosses the antimeridian (lon_max < lon_min); no export"
            )
        x_nw, y_nw = lon_lat_to_tile_xy(lon_min, lat_max, zoom)
        x_se, y_se = lon_lat_to_tile_xy(lon_max, lat_min, zoom)
        gx = x_nw + (px / width) * (x_se - x_nw)
        gy = y_nw + (py / height) * (y_se - y_nw)
        return tile_xy_to_lon_lat(gx, gy, zoom)
    raise ValueError(
        "gis-export: image needs tile_x0/tile_y0/crop_px or a bbox "
        "— no georeference, no export"
    )


def box_to_polygon(box, image):
    """SAM box [x_min, y_min, x_max, y_max] in pixels -> closed lon/lat ring."""
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        raise ValueError("gis-export: box must be [x_min, y_min, x_max, y_max]")
    x0, y0, x1, y1 = box
    nw = pixel_to_lon_lat(x0, y0, image)
    ne = pixel_to_lon_lat(x1, y0, image)
    se = pixel_to_lon_lat(x1, y1, image)
    sw = pixel_to_lon_lat(x0, y1, image)
    return [nw, ne, se, sw, nw]


def box_centroid(box, image):
    """Centre of a SAM box, projected the same way as the polygon."""
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        raise ValueError("gis-export: box must be [x_min, y_min, x_max, y_max]")
    x0, y0, x1, y1 = box
    return pixel_to_lon_lat((x0 + x1) / 2, (y0 + y1) / 2, image)


def world_file_contents(image):
    """World-file (.pgw/.tfw) contents for the image, in degrees.

    Linear in degrees by design of the world-file format: an affine
    transform only. For a small area the error against true Mercator
    is metres, not kilometres, and the file is labelled approximate
    in the docs. The GeoJSON is the exact projected deliverable; the
    world file is a convenience for opening the PNG itself in a GIS.
    """
    bbox = image.get("bbox") if image else None
    if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
        raise ValueError("gis-export: world file needs a bbox")
    lon_min, lon_max, lat_min, lat_max = bbox
    x_scale = (lon_max - lon_min) / image["width"]
    y_scale = -((lat_max - lat_min) / image["height"])
    values = [x_scale, 0, 0, y_scale, lon_min, lat_max]
    return "\n".join(repr(v) for v in values) + "\n"


def build_gis_geojson(*, aoi, mask_box, mask_pixels, prompt, model, image, image_source):
    """GeoJSON FeatureCollection, EPSG:4326, [lon, lat] order.

    Exactly 3 features, same properties as the JS module: AOI
    polygon, mask bbox polygon, mask centroid point. All properties
    carry the COMPUTED MASK label on the mask feature; nothing here
    is measured.
    """
    if not aoi or not isinstance(aoi.get("polygon"), (list, tuple)):
        raise ValueError("gis-export: AOI polygon is required")
    if not isinstance(mask_box, (list, tuple)):
        raise ValueError("gis-export: mask box is required")
    mask_polygon = box_to_polygon(mask_box, image)
    centroid = box_centroid(mask_box, image)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "kind": "AOI",
                    "aoi_id": aoi["id"],
                    "label": "computed",
                    "crs": "EPSG:4326",
                    "max_magnitude": aoi["max_magnitude"],
                    "event_count": aoi["events"],
                    "total_energy_j": aoi["total_energy"],
                },
                "geometry": {"type": "Polygon", "coordinates": [aoi["polygon"]]},
            },
            {
                "type": "Feature",
                "properties": {
                    "kind": "COMPUTED MASK",
                    "label": "COMPUTED MASK",
                    "crs": "EPSG:4326",
                    "prompt": prompt or "",
                    "model": model or "",
                    "mask_pixels": mask_pixels,
                    "mask_box_px": list(mask_box),
                    "image_source": image_source or "",
                    "note": (
                        "Computed mask over supplied imagery. "
                        "Not measured data, not ground truth, not a prediction."
                    ),
                },
                "geometry": {"type": "Polygon", "coordinates": [mask_polygon]},
            },
            {
                "type": "Feature",
                "properties": {
                    "kind": "mask centroid",
                    "label": "computed",
                    "crs": "EPSG:4326",
                    "prompt": prompt or "",
                },
                "geometry": {"type": "Point", "coordinates": centroid},
            },
        ],
    }


def validate_gis_geojson(fc, image):
    """Validate a built GeoJSON against the image georeference.

    Mirrors the JS validator: returns a list of failure strings,
    empty on success.
    """
    failures = []
    if (
        not fc
        or fc.get("type") != "FeatureCollection"
        or not isinstance(fc.get("features"), list)
        or len(fc["features"]) != 3
    ):
        return [
            "GIS GeoJSON must be a FeatureCollection with exactly 3 features "
            "(AOI, mask, centroid)"
        ]
    mask = fc["features"][1]
    geometry = mask.get("geometry") or {}
    coords = geometry.get("coordinates") or []
    ring = coords[0] if coords else None
    if not ring or len(ring) != 5:
        failures.append("mask polygon is not a closed 5-point ring")
    if ring:
        if ring[0][0] != ring[4][0] or ring[0][1] != ring[4][1]:
            failures.append("mask polygon is not closed")
        for lon, lat in ring:
            if lon < -180 or lon > 180 or lat < -90 or lat > 90:
                failures.append(f"mask coordinate out of range: {lon}, {lat}")
            bbox = image.get("bbox") if image else None
            if bbox:
                lon_min, lon_max, lat_min, lat_max = bbox
                if (
                    lon < lon_min - 0.001
                    or lon > lon_max + 0.001
                    or lat < lat_min - 0.001
                    or lat > lat_max + 0.001
                ):
                    failures.append(
                        f"mask coordinate {lon}, {lat} is outside the image bbox"
                    )
    properties = mask.get("properties") or {}
    if properties.get("label") != "COMPUTED MASK":
        failures.append("mask feature is missing the COMPUTED MASK label")
    if not properties.get("image_source"):
        failures.append("mask feature is missing image_source")
    return failures


def geojson_to_kml(fc):
    """KML (OGC KML 2.2) for the SAME GeoJSON FeatureCollection.

    Format conversion only — the GeoJSON is the single source of
    truth, so coordinates and the COMPUTED MASK label are identical
    to the GeoJSON. Mirrors ``geoJsonToKml`` in ``src/gis-export.mjs``:
    KML coordinates are lon,lat,0, property values are XML-escaped.
    """
    from xml.sax.saxutils import escape

    if not fc or fc.get("type") != "FeatureCollection" or not isinstance(
        fc.get("features"), list
    ):
        raise ValueError("gis-export: KML needs a GeoJSON FeatureCollection")
    placemarks = []
    for feature in fc["features"]:
        props = feature.get("properties") or {}
        name = escape(str(props.get("kind", "feature")))
        data_lines = []
        for key, value in props.items():
            data_lines.append(
                f'        <Data name="{escape(str(key))}">'
                f"<value>{escape(str(value if value is not None else ''))}</value></Data>"
            )
        geom = feature.get("geometry") or {}
        if geom.get("type") == "Polygon":
            coords = " ".join(
                f"{lon},{lat},0" for lon, lat in geom["coordinates"][0]
            )
            shape = (
                "      <Polygon><outerBoundaryIs><LinearRing>"
                f"<coordinates>{coords}</coordinates>"
                "</LinearRing></outerBoundaryIs></Polygon>"
            )
        elif geom.get("type") == "Point":
            lon, lat = geom["coordinates"]
            shape = f"      <Point><coordinates>{lon},{lat},0</coordinates></Point>"
        else:
            raise ValueError(
                f"gis-export: KML does not support geometry type {geom.get('type')}"
            )
        placemarks.append(
            "    <Placemark>\n"
            f"      <name>{name}</name>\n"
            "      <ExtendedData>\n"
            + "\n".join(data_lines)
            + "\n      </ExtendedData>\n"
            + shape
            + "\n    </Placemark>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        "  <Document>\n"
        "    <name>COMPUTED MASK — Quetzal AOI Briefing</name>\n"
        "    <description>Computed mask over supplied imagery. "
        "Not measured data, not ground truth, not a prediction.</description>\n"
        + "\n".join(placemarks)
        + "\n  </Document>\n</kml>\n"
    )


def image_from_sidecar(sidecar, width=None, height=None):
    """Build an image georeference dict from a pull_satellite.py sidecar.

    Sidecar fields: ``bbox_lon_lat`` [lon_min, lon_max, lat_min,
    lat_max], ``zoom``, ``tile_range`` {x: [x0, x1], y: [y0, y1]},
    ``crop_px_in_stitched`` [px0, py0, px1, py1], ``size_px``.
    Width/height come from ``size_px`` unless overridden; a mismatch
    raises instead of silently using the wrong size.
    """
    bbox = sidecar["bbox_lon_lat"]
    zoom = sidecar["zoom"]
    tile_range = sidecar["tile_range"]
    crop_px = sidecar["crop_px_in_stitched"]
    size_px = sidecar["size_px"]
    w = width if width is not None else size_px[0]
    h = height if height is not None else size_px[1]
    if (w, h) != tuple(size_px):
        raise ValueError(
            f"gis-export: sidecar size_px {size_px} does not match image size {w}x{h}"
        )
    if tile_range["x"][1] < tile_range["x"][0] or tile_range["y"][1] < tile_range["y"][0]:
        raise ValueError("gis-export: antimeridian wrap unsupported in tile range")
    return {
        "width": w,
        "height": h,
        "zoom": zoom,
        "tile_x0": tile_range["x"][0],
        "tile_y0": tile_range["y"][0],
        "crop_px": list(crop_px),
        "bbox": list(bbox),
    }


def image_from_crop(parent_image, crop_box_in_parent):
    """Georeference for a crop of a georeferenced image.

    ``crop_box_in_parent`` is [x0, y0, x1, y1] in the parent image's
    pixels (the Fiji crop is (120, 800)-(700, 1180) in the z12
    image). The crop inherits the parent's zoom / tile origin, with
    the crop origin shifted by the crop offset — the same tile math,
    no new georeference guessed.
    """
    x0, y0, x1, y1 = crop_box_in_parent
    crop_px = parent_image.get("crop_px", parent_image.get("cropPx"))
    if crop_px is None:
        raise ValueError("gis-export: crop needs a parent with tile/crop georeference")
    result = {
        "width": x1 - x0,
        "height": y1 - y0,
        "zoom": parent_image["zoom"],
        "tile_x0": parent_image.get("tile_x0", parent_image.get("tileX0")),
        "tile_y0": parent_image.get("tile_y0", parent_image.get("tileY0")),
        "crop_px": [crop_px[0] + x0, crop_px[1] + y0, crop_px[2] + x0, crop_px[3] + y0],
    }
    # Crop bbox, derived from the parent's own transform at the crop
    # corners — not the parent bbox, which would misstate the crop's
    # extent in a world file. [lon_min, lon_max, lat_min, lat_max].
    nw = pixel_to_lon_lat(x0, y0, parent_image)
    se = pixel_to_lon_lat(x1, y1, parent_image)
    result["bbox"] = [nw[0], se[0], se[1], nw[1]]
    return result


def build_geodataframe(*, aoi, mask_box, mask_pixels, prompt, model, image, image_source):
    """Same 3 features as :func:`build_gis_geojson`, as a GeoDataFrame.

    CRS EPSG:4326, geometries as shapely objects. GeoPackage cannot
    store a list-valued column, so ``mask_box_px`` is stored as a
    JSON string here (the GeoJSON keeps the list); that difference
    is documented in docs/GIS_PYTHON.md.
    """
    import geopandas as gpd
    from shapely.geometry import shape

    fc = build_gis_geojson(
        aoi=aoi,
        mask_box=mask_box,
        mask_pixels=mask_pixels,
        prompt=prompt,
        model=model,
        image=image,
        image_source=image_source,
    )
    gdf = gpd.GeoDataFrame.from_features(fc["features"], crs="EPSG:4326")
    # Normalise: shapely geometries via `shape` (from_features already
    # produces them), and mask_box_px as a JSON string for GPKG.
    gdf["geometry"] = gdf["geometry"].apply(lambda g: shape(g) if isinstance(g, dict) else g)
    if "mask_box_px" in gdf.columns:
        gdf["mask_box_px"] = gdf["mask_box_px"].apply(
            lambda v: json.dumps(v) if isinstance(v, (list, tuple)) else v
        )
    return gdf


def write_geopackage(gdf, path, layer="computed_mask"):
    """Write a GeoDataFrame to GeoPackage (pyogrio/GPKG)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(path, driver="GPKG", layer=layer)
    return path


def write_world_and_prj(image_path, image, world_ext=".pgw"):
    """Write world file + WGS84 .prj alongside ``image_path``.

    Returns (world_path, prj_path). The .prj text is the same
    ESRI-style WGS84 string the JS module ships, for parity with
    the existing deliverable.
    """
    image_path = Path(image_path)
    world_path = image_path.with_suffix(world_ext)
    prj_path = image_path.with_suffix(".prj")
    world_path.write_text(world_file_contents(image), encoding="utf-8")
    prj_path.write_text(WGS84_PRJ + "\n", encoding="utf-8")
    return world_path, prj_path
