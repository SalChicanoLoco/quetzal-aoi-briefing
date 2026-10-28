// GIS export — georeferenced shapes for a SAM mask over a supplied image.
//
// Yes, the render has to change. Pixel coordinates are not geography.
// A mask box like [776, 377, 831, 444] means nothing in ArcGIS, QGIS,
// or ERDAS IMAGINE until it is projected: pixel -> Web Mercator ->
// WGS 84 lon/lat (EPSG:4326), with the image's own georeference
// (tile range + crop, or a supplied bbox) as the only source of truth.
// Any render that draws the mask must draw it from the projected
// polygon, through the same transform, never from pixel offsets alone.
//
// Rules, same as everywhere else in this repo:
//   - The image must be supplied by the owner, with its georeference.
//     No georeference, no GIS export. Never guess a bbox.
//   - The output is a COMPUTED MASK, never measured data, never
//     ground truth. The GeoJSON carries that label in its properties.
//   - The generated illustration (Step 6) is NEVER georeferenced and
//     NEVER overlaid on a map. It is concept art, not data.
//   - Esri World Imagery tiles are an RGB visual basemap, not
//     analysis-ready multispectral data. Analysis-ready sources are
//     Sentinel-2 L2A / Landsat Collection 2 Level-2 GeoTIFFs, which
//     arrive already georeferenced (own CRS, own transform) and must
//     be run through GDAL/rasterio, not through PNG tiles, for real
//     spectral work. This module handles the tile/PNG case honestly
//     and says so.

const TILE = 256;

// lon/lat -> fractional Web Mercator tile coordinates (same math as
// pull_satellite.py: asinh/tan, not a linear lat approximation).
export function lonLatToTileXY(lon, lat, zoom) {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  return [x, y];
}

// Fractional tile coordinates -> lon/lat (inverse Web Mercator).
export function tileXYToLonLat(x, y, zoom) {
  const n = 2 ** zoom;
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lon, lat];
}

// Pixel (px, py, origin top-left) in the supplied image -> [lon, lat].
// image must carry EITHER:
//   { width, height, zoom, tileX0, tileY0, cropPx: [px0, py0, px1, py1] }
//     — exact, from a pull_satellite.py sidecar, or
//   { width, height, bbox: [lonMin, lonMax, latMin, latMax], zoom }
//     — bbox corners converted to Mercator space, interpolated there,
//       then inverted. Still Web Mercator, never linear in latitude.
//       Approximate to the precision of the supplied bbox and to whole
//       pixels: the tile path above is exact, this one is within about
//       a pixel when the bbox is rounded. Prefer the tile path.
export function pixelToLonLat(px, py, image) {
  if (!image || typeof image.width !== "number" || typeof image.height !== "number") {
    throw new Error("gis-export: image needs width and height");
  }
  if (px < 0 || py < 0 || px > image.width || py > image.height) {
    throw new Error(`gis-export: pixel (${px}, ${py}) is outside the image ${image.width}x${image.height}`);
  }
  if (typeof image.zoom !== "number") throw new Error("gis-export: image needs a zoom");
  let gx;
  let gy;
  if (Number.isInteger(image.tileX0) && Number.isInteger(image.tileY0) && Array.isArray(image.cropPx)) {
    gx = image.tileX0 * TILE + image.cropPx[0] + px;
    gy = image.tileY0 * TILE + image.cropPx[1] + py;
  } else if (Array.isArray(image.bbox) && image.bbox.length === 4) {
    const [lonMin, lonMax, latMin, latMax] = image.bbox;
    const [xNW, yNW] = lonLatToTileXY(lonMin, latMax, image.zoom);
    const [xSE, ySE] = lonLatToTileXY(lonMax, latMin, image.zoom);
    gx = xNW + (px / image.width) * (xSE - xNW);
    gy = yNW + (py / image.height) * (ySE - yNW);
    // gx/gy here are fractional tile coords; convert to the same
    // global-pixel scale tileXYToLonLat expects by scaling.
    return tileXYToLonLat(gx, gy, image.zoom);
  } else {
    throw new Error("gis-export: image needs tileX0/tileY0/cropPx or a bbox — no georeference, no export");
  }
  return tileXYToLonLat(gx / TILE, gy / TILE, image.zoom);
}

// SAM box [x_min, y_min, x_max, y_max] in pixels -> closed lon/lat ring.
export function boxToPolygon(box, image) {
  if (!Array.isArray(box) || box.length !== 4) throw new Error("gis-export: box must be [x_min, y_min, x_max, y_max]");
  const [x0, y0, x1, y1] = box;
  const nw = pixelToLonLat(x0, y0, image);
  const ne = pixelToLonLat(x1, y0, image);
  const se = pixelToLonLat(x1, y1, image);
  const sw = pixelToLonLat(x0, y1, image);
  return [nw, ne, se, sw, nw];
}

export function boxCentroid(box, image) {
  const [x0, y0, x1, y1] = box;
  return pixelToLonLat((x0 + x1) / 2, (y0 + y1) / 2, image);
}

// World file (.pgw/.tfw) contents for the image, in degrees.
// Linear in degrees by design of the world-file format: an affine
// transform only. For a small area (this AOI: 0.4 deg) the error
// against true Mercator is metres, not kilometres, and the file is
// labelled approximate in the docs. The GeoJSON below is the exact
// projected deliverable; the world file is a convenience for opening
// the PNG itself in a GIS, not the record.
export function worldFileContents(image) {
  if (!Array.isArray(image.bbox) || image.bbox.length !== 4) {
    throw new Error("gis-export: world file needs a bbox");
  }
  const [lonMin, lonMax, latMin, latMax] = image.bbox;
  const xScale = (lonMax - lonMin) / image.width;
  const yScale = -((latMax - latMin) / image.height);
  return [xScale, 0, 0, yScale, lonMin, latMax].map((v) => String(v)).join("\n") + "\n";
}

export const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

// GeoJSON FeatureCollection, EPSG:4326 (GeoJSON default: WGS 84,
// coordinates in [lon, lat] order). Features: AOI polygon, mask
// bbox polygon, mask centroid point. All properties carry the
// COMPUTED MASK label and the image source; nothing here is measured.
export function buildGisGeoJson({ aoi, maskBox, maskPixels, prompt, model, image, imageSource }) {
  if (!aoi || !Array.isArray(aoi.polygon)) throw new Error("gis-export: AOI polygon is required");
  if (!Array.isArray(maskBox)) throw new Error("gis-export: mask box is required");
  // B1 fix: makeAOI emits events_used / total_energy_joules; older
  // hand-built AOIs (and the recorded assets) use events /
  // total_energy. Accept the real shape first, fall back to the
  // legacy spelling, and fail closed if neither is present —
  // never silently ship an AOI feature with the fields dropped.
  const eventCount = aoi.events_used ?? aoi.events;
  const totalEnergy = aoi.total_energy_joules ?? aoi.total_energy;
  if (typeof eventCount !== "number" || typeof totalEnergy !== "number") {
    throw new Error("gis-export: AOI needs events_used/total_energy_joules (makeAOI) or events/total_energy");
  }
  const maskPolygon = boxToPolygon(maskBox, image);
  const centroid = boxCentroid(maskBox, image);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          kind: "AOI",
          aoi_id: aoi.id,
          label: "computed",
          crs: "EPSG:4326",
          max_magnitude: aoi.max_magnitude,
          event_count: eventCount,
          total_energy_j: totalEnergy,
        },
        geometry: { type: "Polygon", coordinates: [aoi.polygon] },
      },
      {
        type: "Feature",
        properties: {
          kind: "COMPUTED MASK",
          label: "COMPUTED MASK",
          crs: "EPSG:4326",
          prompt: prompt || "",
          model: model || "",
          mask_pixels: maskPixels ?? null,
          mask_box_px: maskBox,
          image_source: imageSource || "",
          note: "Computed mask over supplied imagery. Not measured data, not ground truth, not a prediction.",
        },
        geometry: { type: "Polygon", coordinates: [maskPolygon] },
      },
      {
        type: "Feature",
        properties: { kind: "mask centroid", label: "computed", crs: "EPSG:4326", prompt: prompt || "" },
        geometry: { type: "Point", coordinates: centroid },
      },
    ],
  };
}

// KML (OGC KML 2.2) for the SAME GeoJSON FeatureCollection — no new
// derivation, no wheel reinvented: the GeoJSON built above is the
// single source of truth, and this is a format conversion only, so
// the polygon opens in QGIS, Google Earth, and any KML reader with
// the same coordinates and the same COMPUTED MASK label. KML
// coordinates are lon,lat,0 in that order. All property values are
// XML-escaped; a prompt containing & < > must not break the document.
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function geoJsonToKml(fc) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("gis-export: KML needs a GeoJSON FeatureCollection");
  }
  const placemarks = fc.features.map((feature) => {
    const props = feature.properties || {};
    const name = escapeXml(props.kind || "feature");
    const data = Object.entries(props)
      .map(([k, v]) => `        <Data name="${escapeXml(k)}"><value>${escapeXml(v ?? "")}</value></Data>`)
      .join("\n");
    const geom = feature.geometry || {};
    let shape = "";
    if (geom.type === "Polygon") {
      const coords = geom.coordinates[0].map(([lon, lat]) => `${lon},${lat},0`).join(" ");
      shape = `      <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    } else if (geom.type === "Point") {
      const [lon, lat] = geom.coordinates;
      shape = `      <Point><coordinates>${lon},${lat},0</coordinates></Point>`;
    } else {
      throw new Error(`gis-export: KML does not support geometry type ${geom.type}`);
    }
    return `    <Placemark>\n      <name>${name}</name>\n      <ExtendedData>\n${data}\n      </ExtendedData>\n${shape}\n    </Placemark>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>COMPUTED MASK — Quetzal AOI Briefing</name>\n    <description>Computed mask over supplied imagery. Not measured data, not ground truth, not a prediction.</description>\n${placemarks.join("\n")}\n  </Document>\n</kml>\n`;
}

// Validate a built GeoJSON against the image georeference.
export function validateGisGeoJson(fc, image) {
  const failures = [];
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features) || fc.features.length !== 3) {
    return ["GIS GeoJSON must be a FeatureCollection with exactly 3 features (AOI, mask, centroid)"];
  }
  const mask = fc.features[1];
  const ring = mask.geometry && mask.geometry.coordinates && mask.geometry.coordinates[0];
  if (!ring || ring.length !== 5) failures.push("mask polygon is not a closed 5-point ring");
  if (ring) {
    if (ring[0][0] !== ring[4][0] || ring[0][1] !== ring[4][1]) failures.push("mask polygon is not closed");
    for (const [lon, lat] of ring) {
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) failures.push(`mask coordinate out of range: ${lon}, ${lat}`);
      if (image.bbox) {
        const [lonMin, lonMax, latMin, latMax] = image.bbox;
        if (lon < lonMin - 0.001 || lon > lonMax + 0.001 || lat < latMin - 0.001 || lat > latMax + 0.001) {
          failures.push(`mask coordinate ${lon}, ${lat} is outside the image bbox`);
        }
      }
    }
  }
  if (mask.properties.label !== "COMPUTED MASK") failures.push("mask feature is missing the COMPUTED MASK label");
  if (!mask.properties.image_source) failures.push("mask feature is missing image_source");
  return failures;
}
