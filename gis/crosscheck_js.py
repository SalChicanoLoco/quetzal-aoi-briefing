"""Cross-check the Python GIS export against the live JS module.

Runs gis/crosscheck_js.mjs with node, diffs every coordinate against
gis_export.py, and prints the max absolute difference per case.
Requires node (already present in this workspace); the core tests in
test_gis_export.py do not need node.

    ~/workspace/gis-venv/bin/python gis/crosscheck_js.py
"""

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gis.gis_export import box_centroid, box_to_polygon, pixel_to_lon_lat

HERE = Path(__file__).resolve().parent

NAGQU = {
    "width": 1165,
    "height": 1394,
    "zoom": 12,
    "tile_x0": 3127,
    "tile_y0": 1643,
    "crop_px": [192, 17, 1357, 1411],
    "bbox": [94.9, 95.3, 33.1, 33.5],
}
FIJI = {
    "width": 1165,
    "height": 1228,
    "zoom": 12,
    "tile_x0": 15,
    "tile_y0": 2257,
    "crop_px": [238, 115, 1403, 1343],
    "bbox": [-178.6, -178.2, -18.5, -18.1],
}


def max_diff(a, b):
    if isinstance(a, (list, tuple)):
        return max(max_diff(x, y) for x, y in zip(a, b))
    return abs(a - b)


def main():
    out = subprocess.run(
        ["node", str(HERE / "crosscheck_js.mjs")],
        capture_output=True,
        text=True,
        check=True,
    )
    js = json.loads(out.stdout)
    cases = {
        "nagquNW": (js["nagquNW"], pixel_to_lon_lat(0, 0, NAGQU)),
        "nagquSE": (js["nagquSE"], pixel_to_lon_lat(1165, 1394, NAGQU)),
        "nagquRing": (js["nagquRing"], box_to_polygon([776, 377, 831, 444], NAGQU)),
        "nagquCentroid": (
            js["nagquCentroid"],
            box_centroid([776, 377, 831, 444], NAGQU),
        ),
        "nagquBboxFallback": (
            js["nagquBboxFallback"],
            pixel_to_lon_lat(
                803.5,
                410.5,
                {"width": 1165, "height": 1394, "zoom": 12, "bbox": [94.9, 95.3, 33.1, 33.5]},
            ),
        ),
        "fijiRing": (js["fijiRing"], box_to_polygon([302, 1005, 418, 1068], FIJI)),
        "fijiCentroid": (
            js["fijiCentroid"],
            box_centroid([302, 1005, 418, 1068], FIJI),
        ),
    }
    worst = 0.0
    for name, (expected, actual) in cases.items():
        diff = max_diff(expected, actual)
        worst = max(worst, diff)
        print(f"crosscheck {name}: max_diff={diff:.3e} {'PASS' if diff <= 1e-6 else 'FAIL'}")
    print(f"crosscheck worst max_diff={worst:.3e} (tolerance 1e-6 deg)")
    if worst > 1e-6:
        raise SystemExit(1)
    print("crosscheck PASS")


if __name__ == "__main__":
    main()
