// Orchestrator v1 tests — real computation on a fixed fixture.
// No live calls, no keys, no randomness.
import { makeAOI, fixtureTelemetry, energyJoules, parseTelemetry } from "../src/orchestrator.mjs";

const checks = [];
function check(name, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const fixture = fixtureTelemetry();
const aoi = makeAOI(fixture);
check("top cell is 32N-94E", aoi.id === "AOI-32N-94E", aoi.id);
check("3 events in top cell", aoi.events_used === 3, String(aoi.events_used));
check("max magnitude 5.2 measured", aoi.max_magnitude === 5.2 && aoi.max_magnitude_label === "measured");
const expectedEnergy = energyJoules(5.2) + energyJoules(4.8) + energyJoules(4.1);
check("total energy is Gutenberg-Choy sum, computed",
  Math.abs(aoi.total_energy_joules - expectedEnergy) < 1 && aoi.total_energy_label === "computed",
  String(aoi.total_energy_joules));
check("polygon is the 2-degree cell, closed",
  aoi.polygon.length === 5 && JSON.stringify(aoi.polygon[0]) === JSON.stringify(aoi.polygon[4]) &&
  aoi.polygon[0][0] === 94 && aoi.polygon[0][1] === 32);
check("centroid is energy-weighted inside cell",
  aoi.centroid.latitude >= 32 && aoi.centroid.latitude <= 34 &&
  aoi.centroid.longitude >= 94 && aoi.centroid.longitude <= 96);
check("interpretation labelled inferred, explicitly not a prediction",
  aoi.interpretation_label === "inferred" && aoi.interpretation.includes("not a prediction"));
check("2 cells ranked total", aoi.cells_ranked === 2, String(aoi.cells_ranked)); // 32N-94E + the lone 3.0 cell

// Parser shapes
const geojson = { type: "FeatureCollection", features: [
  { properties: { mag: 4.5, place: "test" }, geometry: { coordinates: [100.0, 20.0] } },
]};
const parsed = parseTelemetry(geojson);
check("GeoJSON parser yields 1 usable event", parsed.length === 1 && parsed[0].magnitude === 4.5);
let threw = false;
try { parseTelemetry({ nonsense: true }); } catch { threw = true; }
check("unrecognised payload throws, not silent zero", threw);

if (checks.some((c) => !c)) process.exit(1);
console.log("Orchestrator v1 tests PASS");
