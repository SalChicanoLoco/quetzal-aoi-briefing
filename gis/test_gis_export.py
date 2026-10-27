"""Tests for gis/gis_export.py, verified against the JS reference.

Run with the workspace GIS venv (no install step, no network):

    ~/workspace/gis-venv/bin/python -m unittest discover -s gis -p "test_*.py" -v

Expected values are the JS module's recorded values: test/gis-export.mjs
(6/6 PASS), assets/nagqu-snow-mask.geojson, sam-z12-snow-corrected.json
(Nagqu), and fiji-sam-mask-record.json (Fiji). They are NOT computed
by the code under test. Tolerance 1e-6 degrees, as specified.
"""

import copy
import json
import math
import tempfile
import unittest
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gis.gis_export import (  # noqa: E402
    WGS84_PRJ,
    box_centroid,
    box_to_polygon,
    build_gis_geojson,
    build_geodataframe,
    image_from_crop,
    geojson_to_kml,
    image_from_sidecar,
    pixel_to_lon_lat,
    validate_gis_geojson,
    world_file_contents,
    write_geopackage,
    write_world_and_prj,
)

# Real Nagqu z12 sidecar (JS test fixture): bbox 94.9-95.3E, 33.1-33.5N,
# zoom 12, tiles x 3127-3132, y 1643-1648, crop [192, 17, 1357, 1411],
# image 1165x1394.
NAGQU_IMAGE = {
    "width": 1165,
    "height": 1394,
    "zoom": 12,
    "tile_x0": 3127,
    "tile_y0": 1643,
    "crop_px": [192, 17, 1357, 1411],
    "bbox": [94.9, 95.3, 33.1, 33.5],
}

NAGQU_AOI = {
    "id": "AOI-32N-94E",
    "polygon": [[94, 32], [96, 32], [96, 34], [94, 34], [94, 32]],
    "max_magnitude": 5.2,
    "events": 3,
    "total_energy": 5070196799348.359,
}

# Fiji z12 sidecar: bbox -178.6 to -178.2, -18.5 to -18.1, zoom 12,
# tiles x 15-20, y 2257-2262, crop [238, 115, 1403, 1343], 1165x1228.
FIJI_IMAGE = {
    "width": 1165,
    "height": 1228,
    "zoom": 12,
    "tile_x0": 15,
    "tile_y0": 2257,
    "crop_px": [238, 115, 1403, 1343],
    "bbox": [-178.6, -178.2, -18.5, -18.1],
}

FIJI_POLYGON = [
    [-178.49624633789062, -18.427501971948598],
    [-178.4564208984375, -18.427501971948598],
    [-178.4564208984375, -18.448021023457002],
    [-178.49624633789062, -18.448021023457002],
    [-178.49624633789062, -18.427501971948598],
]
FIJI_CENTROID = [-178.47633361816406, -18.437761803935633]


def close(actual, expected, tol, label):
    assert abs(actual - expected) <= tol, f"{label}: {actual} != {expected} (tol {tol})"


class TestPixelMath(unittest.TestCase):
    def test_corners_round_trip_to_bbox(self):
        lon_nw, lat_nw = pixel_to_lon_lat(0, 0, NAGQU_IMAGE)
        lon_se, lat_se = pixel_to_lon_lat(1165, 1394, NAGQU_IMAGE)
        close(lon_nw, 94.89990234375, 1e-6, "NW lon")
        close(lat_nw, 33.499892236382436, 1e-6, "NW lat")
        close(lon_se, 95.29987335205078, 1e-6, "SE lon")
        close(lat_se, 33.09988258453637, 1e-6, "SE lat")

    def test_bbox_fallback_agrees_with_tile_path_within_one_pixel(self):
        by_tile = pixel_to_lon_lat(803.5, 410.5, NAGQU_IMAGE)
        by_bbox = pixel_to_lon_lat(
            803.5,
            410.5,
            {"width": 1165, "height": 1394, "zoom": 12, "bbox": [94.9, 95.3, 33.1, 33.5]},
        )
        close(by_bbox[0], by_tile[0], 0.0004, "fallback lon")
        close(by_bbox[1], by_tile[1], 0.0004, "fallback lat")

    def test_mask_box_projects_to_js_verified_polygon(self):
        ring = box_to_polygon([776, 377, 831, 444], NAGQU_IMAGE)
        self.assertEqual(len(ring), 5)
        close(ring[0][0], 95.16632080078125, 1e-6, "mask NW lon")
        close(ring[0][1], 33.391892775778075, 1e-6, "mask NW lat")
        close(ring[2][0], 95.1852035522461, 1e-6, "mask SE lon")
        close(ring[2][1], 33.372685170762125, 1e-6, "mask SE lat")
        c = box_centroid([776, 377, 831, 444], NAGQU_IMAGE)
        close(c[0], 95.17576217651367, 1e-6, "centroid lon")
        close(c[1], 33.38228950363706, 1e-6, "centroid lat")

    def test_pyproj_cross_check(self):
        # Independent check: Web Mercator metres via pyproj must agree
        # with the direct inverse-Mercator math to 1e-6 degrees.
        from pyproj import Transformer

        transformer = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
        lon, lat = pixel_to_lon_lat(803.5, 410.5, NAGQU_IMAGE)
        # Global pixel -> EPSG:3857 metres. World width 2*pi*R, origin centre.
        n = 2 ** 12
        gx = 3127 * 256 + 192 + 803.5
        gy = 1643 * 256 + 17 + 410.5
        world = 2 * math.pi * 6378137.0
        x_m = (gx / (256 * n)) * world - world / 2
        y_m = world / 2 - (gy / (256 * n)) * world
        lon2, lat2 = transformer.transform(x_m, y_m)
        close(lon2, lon, 1e-6, "pyproj lon")
        close(lat2, lat, 1e-6, "pyproj lat")

    def test_fiji_polygon_matches_record(self):
        ring = box_to_polygon([302, 1005, 418, 1068], FIJI_IMAGE)
        for actual, expected in zip(ring, FIJI_POLYGON):
            close(actual[0], expected[0], 1e-6, "Fiji lon")
            close(actual[1], expected[1], 1e-6, "Fiji lat")
        c = box_centroid([302, 1005, 418, 1068], FIJI_IMAGE)
        close(c[0], FIJI_CENTROID[0], 1e-6, "Fiji centroid lon")
        close(c[1], FIJI_CENTROID[1], 1e-6, "Fiji centroid lat")

    def test_fiji_crop_image_gives_same_polygon(self):
        crop = image_from_crop(FIJI_IMAGE, [120, 800, 700, 1180])
        self.assertEqual((crop["width"], crop["height"]), (580, 380))
        ring = box_to_polygon([182, 205, 298, 268], crop)
        for actual, expected in zip(ring, FIJI_POLYGON):
            close(actual[0], expected[0], 1e-6, "Fiji crop lon")
            close(actual[1], expected[1], 1e-6, "Fiji crop lat")

    def test_sidecar_builds_nagqu_image(self):
        sidecar_path = Path(__file__).resolve().parent.parent.parent / (
            "nagqu-satellite-z12-snowpatch.png.json"
        )
        sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))
        image = image_from_sidecar(sidecar)
        self.assertEqual(image, NAGQU_IMAGE)
        ring = box_to_polygon([776, 377, 831, 444], image)
        close(ring[0][0], 95.16632080078125, 1e-6, "sidecar mask NW lon")
        close(ring[2][1], 33.372685170762125, 1e-6, "sidecar mask SE lat")


class TestEdgeCasesThrow(unittest.TestCase):
    """Six invalid-input cases must throw, plus build/validate guards."""

    def test_no_georeference(self):
        with self.assertRaisesRegex(ValueError, "no georeference"):
            pixel_to_lon_lat(10, 10, {"width": 100, "height": 100, "zoom": 12})

    def test_pixel_outside_image(self):
        with self.assertRaisesRegex(ValueError, "outside the image"):
            pixel_to_lon_lat(2000, 10, NAGQU_IMAGE)

    def test_missing_width_height(self):
        with self.assertRaisesRegex(ValueError, "width and height"):
            pixel_to_lon_lat(10, 10, {"zoom": 12, "bbox": [0, 1, 0, 1]})

    def test_missing_zoom(self):
        with self.assertRaisesRegex(ValueError, "needs a zoom"):
            pixel_to_lon_lat(10, 10, {"width": 100, "height": 100, "bbox": [0, 1, 0, 1]})

    def test_bad_box_length(self):
        with self.assertRaisesRegex(ValueError, "box must be"):
            box_to_polygon([776, 377, 831], NAGQU_IMAGE)

    def test_world_file_without_bbox(self):
        with self.assertRaisesRegex(ValueError, "world file needs a bbox"):
            world_file_contents({"width": 100, "height": 100})

    def test_antimeridian_bbox_crossing_throws(self):
        with self.assertRaisesRegex(ValueError, "antimeridian"):
            pixel_to_lon_lat(
                10, 10, {"width": 100, "height": 100, "zoom": 12, "bbox": [179, -179, 0, 1]}
            )

    def test_sidecar_size_mismatch_throws(self):
        sidecar = {
            "bbox_lon_lat": [94.9, 95.3, 33.1, 33.5],
            "zoom": 12,
            "tile_range": {"x": [3127, 3132], "y": [1643, 1648]},
            "crop_px_in_stitched": [192, 17, 1357, 1411],
            "size_px": [1165, 1394],
        }
        with self.assertRaisesRegex(ValueError, "does not match"):
            image_from_sidecar(sidecar, width=100, height=100)


class TestOutputs(unittest.TestCase):
    def test_world_file_is_bbox_affine(self):
        lines = world_file_contents(NAGQU_IMAGE).strip().split("\n")
        self.assertEqual(len(lines), 6)
        close(float(lines[0]), 0.4 / 1165, 1e-12, "x scale")
        close(float(lines[3]), -0.4 / 1394, 1e-12, "y scale")
        close(float(lines[4]), 94.9, 1e-12, "top-left lon")
        close(float(lines[5]), 33.5, 1e-12, "top-left lat")
        self.assertIn("WGS_1984", WGS84_PRJ)

    def test_geojson_builds_validates_labelled(self):
        fc = build_gis_geojson(
            aoi=NAGQU_AOI,
            mask_box=[776, 377, 831, 444],
            mask_pixels=2197,
            prompt="snow",
            model="sam-3.1",
            image=NAGQU_IMAGE,
            image_source="Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12",
        )
        self.assertEqual(validate_gis_geojson(fc, NAGQU_IMAGE), [])
        self.assertEqual(fc["features"][1]["properties"]["label"], "COMPUTED MASK")
        self.assertEqual(fc["features"][1]["geometry"]["type"], "Polygon")
        self.assertEqual(len(fc["features"]), 3)
        bad = copy.deepcopy(fc)
        bad["features"][1]["geometry"]["coordinates"][0][0] = [0, 0]
        self.assertGreater(len(validate_gis_geojson(bad, NAGQU_IMAGE)), 0)

    def test_geojson_matches_recorded_asset(self):
        asset_path = (
            Path(__file__).resolve().parent.parent / "assets" / "nagqu-snow-mask.geojson"
        )
        recorded = json.loads(asset_path.read_text(encoding="utf-8"))
        fc = build_gis_geojson(
            aoi=NAGQU_AOI,
            mask_box=[776, 377, 831, 444],
            mask_pixels=2197,
            prompt="snow",
            model="sam-3.1",
            image=NAGQU_IMAGE,
            image_source="Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12, 1165x1394, Esri, Maxar, Earthstar Geographics",
        )
        rec_ring = recorded["features"][1]["geometry"]["coordinates"][0]
        new_ring = fc["features"][1]["geometry"]["coordinates"][0]
        for actual, expected in zip(new_ring, rec_ring):
            close(actual[0], expected[0], 1e-6, "asset lon")
            close(actual[1], expected[1], 1e-6, "asset lat")
        rec_c = recorded["features"][2]["geometry"]["coordinates"]
        new_c = fc["features"][2]["geometry"]["coordinates"]
        close(new_c[0], rec_c[0], 1e-6, "asset centroid lon")
        close(new_c[1], rec_c[1], 1e-6, "asset centroid lat")

    def test_geodataframe_and_geopackage_round_trip(self):
        import geopandas as gpd

        gdf = build_geodataframe(
            aoi=NAGQU_AOI,
            mask_box=[776, 377, 831, 444],
            mask_pixels=2197,
            prompt="snow",
            model="sam-3.1",
            image=NAGQU_IMAGE,
            image_source="Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12",
        )
        self.assertEqual(len(gdf), 3)
        self.assertEqual(str(gdf.crs), "EPSG:4326")
        mask_row = gdf[gdf["kind"] == "COMPUTED MASK"].iloc[0]
        self.assertEqual(mask_row["label"], "COMPUTED MASK")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "mask.gpkg"
            write_geopackage(gdf, path)
            back = gpd.read_file(path)
            self.assertEqual(len(back), 3)
            self.assertEqual(str(back.crs), "EPSG:4326")
            back_mask = back[back["kind"] == "COMPUTED MASK"].iloc[0]
            self.assertEqual(back_mask["label"], "COMPUTED MASK")
            coords = list(back_mask.geometry.exterior.coords)
            close(coords[0][0], 95.16632080078125, 1e-6, "gpkg lon")
            close(coords[2][1], 33.372685170762125, 1e-6, "gpkg lat")

    def test_kml_is_format_conversion_of_same_geojson(self):
        import xml.etree.ElementTree as ET

        fc = build_gis_geojson(
            aoi=NAGQU_AOI,
            mask_box=[776, 377, 831, 444],
            mask_pixels=2197,
            prompt="snow & ice <test>",
            model="sam-3.1",
            image=NAGQU_IMAGE,
            image_source="Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12",
        )
        kml = geojson_to_kml(fc)
        self.assertIn('xmlns="http://www.opengis.net/kml/2.2"', kml)
        self.assertIn("COMPUTED MASK", kml)
        self.assertIn("snow &amp; ice &lt;test&gt;", kml)
        self.assertNotIn("snow & ice", kml)
        # Well-formed XML, 3 placemarks, mask coords parse back to the ring.
        ns = {"k": "http://www.opengis.net/kml/2.2"}
        root = ET.fromstring(kml)
        placemarks = root.findall(".//k:Placemark", ns)
        self.assertEqual(len(placemarks), 3)
        coords_text = placemarks[1].find(".//k:coordinates", ns).text.strip()
        parsed = [
            tuple(float(v) for v in triple.split(","))
            for triple in coords_text.split()
        ]
        ring = fc["features"][1]["geometry"]["coordinates"][0]
        self.assertEqual(len(parsed), len(ring))
        for (lon, lat, alt), (e_lon, e_lat) in zip(parsed, ring):
            close(lon, e_lon, 1e-9, "kml lon")
            close(lat, e_lat, 1e-9, "kml lat")
            self.assertEqual(alt, 0)
        with self.assertRaises(ValueError):
            geojson_to_kml(None)

    def test_world_and_prj_files_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "nagqu.png"
            image_path.write_bytes(b"")
            world_path, prj_path = write_world_and_prj(image_path, NAGQU_IMAGE)
            self.assertTrue(world_path.exists())
            self.assertTrue(prj_path.exists())
            lines = world_path.read_text(encoding="utf-8").strip().split("\n")
            self.assertEqual(len(lines), 6)
            close(float(lines[0]), 0.4 / 1165, 1e-12, "file x scale")
            self.assertIn("WGS_1984", prj_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
