"""Python GIS export package (primary, Salvador-approved Oct 27).

See gis_export.py and docs/GIS_PYTHON.md. The JS module
src/gis-export.mjs stays local-only as the cross-check reference.
"""

from .gis_export import (
    WGS84_PRJ,
    box_centroid,
    box_to_polygon,
    build_gis_geojson,
    build_geodataframe,
    image_from_crop,
    image_from_sidecar,
    lon_lat_to_tile_xy,
    pixel_to_lon_lat,
    tile_xy_to_lon_lat,
    validate_gis_geojson,
    world_file_contents,
    write_geopackage,
    write_world_and_prj,
)

__all__ = [
    "WGS84_PRJ",
    "box_centroid",
    "box_to_polygon",
    "build_gis_geojson",
    "build_geodataframe",
    "image_from_crop",
    "image_from_sidecar",
    "lon_lat_to_tile_xy",
    "pixel_to_lon_lat",
    "tile_xy_to_lon_lat",
    "validate_gis_geojson",
    "world_file_contents",
    "write_geopackage",
    "write_world_and_prj",
]
