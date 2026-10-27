// Spine tests — deterministic, no live calls, no network.
// The spine receives caller-supplied data only: fixture telemetry, a
// Nagqu-shaped SAM result, the real Nagqu z12 image sidecar, and a
// supplied visual file/receipt. It makes no Meta call.
import assert from "node:assert";
import { runSpine, ROUTES, SPINE_STEPS } from "../src/spine.mjs";
import { fixtureTelemetry } from "../src/orchestrator.mjs";

const image = {
  width: 1165,
  height: 1394,
  zoom: 12,
  tileX0: 3127,
  tileY0: 1643,
  cropPx: [192, 17, 1357, 1411],
  bbox: [94.9, 95.3, 33.1, 33.5],
};

const samResult = {
  model: "sam-3.1",
  source: "hosted",
  outcome: "completed",
  diagnostics: [],
  boxes: 1,
  masks: 1,
  mask_pixels: 2197,
  box: [776, 377, 831, 444],
  prompt: "snow",
  image_source: "Esri World Imagery z12 sub-bbox 94.9-95.3E, 33.1-33.5N",
  fetched_at: "2026-10-26T00:00:00Z",
};

const input = {
  feed: { features: fixtureTelemetry().map((e) => ({ properties: e, geometry: { coordinates: [e.longitude, e.latitude] } })) },
  samResult,
  image,
  visualFile: "assets/generated-visual-fiji.webp",
  visualReceipt: { source: "hosted", model: "muse-image-1.0" },
};

let passed = 0;

const result = await runSpine(input);
assert.equal(result.status, "PASS", JSON.stringify(result.failures));
assert.equal(result.state.aoi.aoi.id, "AOI-32N-94E");
assert.equal(result.state["sam-validate"].maskRecord.mask_pixels, 2197);
assert.equal(result.state["gis-project"].geoJson.features[1].properties.label, "COMPUTED MASK");
assert.ok(result.state["spark-prompt"].prompt.includes("AOI-32N-94E"));
assert.equal(result.state["visual-record"].record.visual_label, "GENERATED VISUAL");
passed += 1;
console.log("PASS spine passes end to end on fixture input");

assert.deepEqual(result.ledger.map((e) => e.step), SPINE_STEPS);
assert.ok(result.ledger.every((e) => e.status === "PASS"));
assert.ok(result.ledger.every((e) => e.cost_estimate_usd === 0));
assert.ok(result.ledger.every((e) => typeof e.latency_ms === "number" && e.attempts >= 1));
passed += 1;
console.log("PASS spine ledger records every step in order, with cost zero");

assert.equal(ROUTES["label-gate"].retries, 0);
assert.equal(ROUTES["spark-prompt"].retries, 0);
assert.equal(Object.keys(ROUTES).length, 7);
passed += 1;
console.log("PASS spine route table is static, costed routes get zero retries");

const bad = await runSpine({ ...input, samResult: { ...samResult, outcome: "failed" } });
assert.equal(bad.status, "FAIL");
assert.deepEqual(bad.ledger.map((e) => e.step), ["telemetry", "aoi", "label-gate", "sam-validate"]);
assert.equal(bad.state["gis-project"], undefined);
passed += 1;
console.log("PASS spine bad SAM result fails closed, later steps do not run");

const empty = await runSpine({ ...input, feed: { features: [] } });
assert.equal(empty.status, "FAIL");
assert.equal(empty.ledger.length, 1);
assert.equal(empty.ledger[0].step, "telemetry");
passed += 1;
console.log("PASS spine empty telemetry fails at the first step");

console.log(`${passed}/5 spine tests PASS`);
