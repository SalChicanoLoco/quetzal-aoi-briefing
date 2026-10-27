// Cross-check helper: print the JS module's polygons as JSON so
// gis/crosscheck_js.py can diff them against the Python module.
// Read-only; not part of the demo pipeline.
import { pixelToLonLat, boxToPolygon, boxCentroid } from "../src/gis-export.mjs";

const nagqu = {
  width: 1165,
  height: 1394,
  zoom: 12,
  tileX0: 3127,
  tileY0: 1643,
  cropPx: [192, 17, 1357, 1411],
  bbox: [94.9, 95.3, 33.1, 33.5],
};
const fiji = {
  width: 1165,
  height: 1228,
  zoom: 12,
  tileX0: 15,
  tileY0: 2257,
  cropPx: [238, 115, 1403, 1343],
  bbox: [-178.6, -178.2, -18.5, -18.1],
};

console.log(
  JSON.stringify({
    nagquNW: pixelToLonLat(0, 0, nagqu),
    nagquSE: pixelToLonLat(1165, 1394, nagqu),
    nagquRing: boxToPolygon([776, 377, 831, 444], nagqu),
    nagquCentroid: boxCentroid([776, 377, 831, 444], nagqu),
    nagquBboxFallback: pixelToLonLat(803.5, 410.5, {
      width: 1165,
      height: 1394,
      zoom: 12,
      bbox: [94.9, 95.3, 33.1, 33.5],
    }),
    fijiRing: boxToPolygon([302, 1005, 418, 1068], fiji),
    fijiCentroid: boxCentroid([302, 1005, 418, 1068], fiji),
  }),
);
