import assert from "node:assert";
import {
  pixelToLonLat,
  boxToPolygon,
  boxCentroid,
  worldFileContents,
  buildGisGeoJson,
  validateGisGeoJson,
  geoJsonToKml,
} from "../src/gis-export.mjs";

// Real Nagqu z12 sidecar: bbox 94.9-95.3E, 33.1-33.5N, zoom 12,
// tiles x 3127-3132, y 1643-1648, crop [192, 17, 1357, 1411],
// image 1165x1394. Expected values computed independently in Python
// (inverse Web Mercator, same tile math as pull_satellite.py).
const image = {
  width: 1165,
  height: 1394,
  zoom: 12,
  tileX0: 3127,
  tileY0: 1643,
  cropPx: [192, 17, 1357, 1411],
  bbox: [94.9, 95.3, 33.1, 33.5],
};

function close(actual, expected, tol, label) {
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual} != ${expected} (tol ${tol})`);
}

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS gis-export ${name}`);
}

check("corners round-trip to the bbox", () => {
  const [lonNW, latNW] = pixelToLonLat(0, 0, image);
  const [lonSE, latSE] = pixelToLonLat(1165, 1394, image);
  close(lonNW, 94.89990234375, 1e-6, "NW lon");
  close(latNW, 33.499892236382436, 1e-6, "NW lat");
  close(lonSE, 95.29987335205078, 1e-6, "SE lon");
  close(latSE, 33.09988258453637, 1e-6, "SE lat");
});

check("bbox fallback agrees with tile path within one pixel", () => {
  // Bbox corners are rounded to 0.1 deg and the crop is rounded to
  // whole pixels, so the bbox path is approximate, not exact: about
  // 0.00012 deg (~11 m) off the exact tile path here, under one pixel
  // (~0.00035 deg). Tile path is exact; bbox path is the fallback for
  // a supplied image with only a bbox.
  const byTile = pixelToLonLat(803.5, 410.5, image);
  const byBbox = pixelToLonLat(803.5, 410.5, { width: 1165, height: 1394, zoom: 12, bbox: [94.9, 95.3, 33.1, 33.5] });
  close(byBbox[0], byTile[0], 0.0004, "fallback lon");
  close(byBbox[1], byTile[1], 0.0004, "fallback lat");
});

check("mask box projects to the Python-verified polygon", () => {
  const ring = boxToPolygon([776, 377, 831, 444], image);
  assert.equal(ring.length, 5);
  close(ring[0][0], 95.16632080078125, 1e-6, "mask NW lon");
  close(ring[0][1], 33.391892775778075, 1e-6, "mask NW lat");
  close(ring[2][0], 95.1852035522461, 1e-6, "mask SE lon");
  close(ring[2][1], 33.372685170762125, 1e-6, "mask SE lat");
  const c = boxCentroid([776, 377, 831, 444], image);
  close(c[0], 95.17576217651367, 1e-6, "centroid lon");
  close(c[1], 33.38228950363706, 1e-6, "centroid lat");
});

check("no georeference, no export", () => {
  assert.throws(() => pixelToLonLat(10, 10, { width: 100, height: 100, zoom: 12 }), /no georeference/);
  assert.throws(() => pixelToLonLat(2000, 10, image), /outside the image/);
});

check("world file is the bbox affine transform", () => {
  const lines = worldFileContents(image).trim().split("\n");
  assert.equal(lines.length, 6);
  close(Number(lines[0]), 0.4 / 1165, 1e-12, "x scale");
  close(Number(lines[3]), -0.4 / 1394, 1e-12, "y scale");
  close(Number(lines[4]), 94.9, 1e-12, "top-left lon");
  close(Number(lines[5]), 33.5, 1e-12, "top-left lat");
});

check("GeoJSON builds and validates, labelled COMPUTED MASK", () => {
  const aoi = {
    id: "AOI-32N-94E",
    polygon: [[94, 32], [96, 32], [96, 34], [94, 34], [94, 32]],
    max_magnitude: 5.2,
    events: 3,
    total_energy: 5070196799348.359,
  };
  const fc = buildGisGeoJson({
    aoi,
    maskBox: [776, 377, 831, 444],
    maskPixels: 2197,
    prompt: "snow",
    model: "sam-3.1",
    image,
    imageSource: "Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12",
  });
  assert.equal(validateGisGeoJson(fc, image).length, 0);
  assert.equal(fc.features[1].properties.label, "COMPUTED MASK");
  assert.equal(fc.features[1].geometry.type, "Polygon");
  // Mask outside the image must fail validation.
  const bad = buildGisGeoJson({ aoi, maskBox: [776, 377, 831, 444], maskPixels: 2197, prompt: "snow", model: "sam-3.1", image, imageSource: "x" });
  bad.features[1].geometry.coordinates[0][0] = [0, 0];
  assert.ok(validateGisGeoJson(bad, image).length > 0);
});

check("KML is a format conversion of the same GeoJSON, lon,lat order", () => {
  const aoi = {
    id: "AOI-32N-94E",
    polygon: [[94, 32], [96, 32], [96, 34], [94, 34], [94, 32]],
    max_magnitude: 5.2,
    events: 3,
    total_energy: 5070196799348.359,
  };
  const fc = buildGisGeoJson({
    aoi,
    maskBox: [776, 377, 831, 444],
    maskPixels: 2197,
    prompt: "snow & ice <test>",
    model: "sam-3.1",
    image,
    imageSource: "Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12",
  });
  const kml = geoJsonToKml(fc);
  assert.ok(kml.includes('xmlns="http://www.opengis.net/kml/2.2"'), "KML namespace");
  assert.ok(kml.includes("COMPUTED MASK"), "KML keeps the COMPUTED MASK label");
  assert.ok(kml.includes("snow &amp; ice &lt;test&gt;"), "KML escapes property values");
  assert.ok(!kml.includes("snow & ice"), "no unescaped & in KML");
  // Mask ring coordinates, lon first, same numbers as the GeoJSON ring.
  const ring = fc.features[1].geometry.coordinates[0];
  const expectedCoords = ring.map(([lon, lat]) => `${lon},${lat},0`).join(" ");
  assert.ok(kml.includes(`<coordinates>${expectedCoords}</coordinates>`), "KML mask coords match GeoJSON ring exactly");
  assert.throws(() => geoJsonToKml(null), /FeatureCollection/);
  assert.throws(() => geoJsonToKml({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } }] }), /does not support/);
});

console.log(`${passed}/7 gis-export tests PASS`);
