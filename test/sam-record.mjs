// SAM record module tests — B2 fix, Oct 28.
// No live calls, no keys. Proves the recorded-shape translation is
// explicit and reversible, and that bad records fail closed with
// their real fields preserved — never laundered into a PASS.
import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
import { loadSamRecord, normalizeSamRecord } from "../src/sam-record.mjs";
import { validateSamResult } from "../src/sam-bridge.mjs";

let passed = 0;
function ok(name, cond, detail = "") {
  assert.ok(cond, `${name} ${detail}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

// The real corrected Oct 26 record shape, rebuilt here (outcome as a
// CompletedOutcome string, diagnostics as "()", n_boxes/n_masks with
// boxes[]/masks[]), plus the timestamp the on-disk record lacks —
// added here ONLY as a fixture field so this shape can pass; the
// no-timestamp case below proves the loader never invents one.
const correctedShape = {
  model: "sam-3.1",
  source: "hosted",
  prompt: "snow",
  image_source: "Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12, 1165x1394",
  outcome: "CompletedOutcome(status='completed')",
  diagnostics: "()",
  n_boxes: 1,
  n_masks: 1,
  boxes: [{ object_id: "0", box: [776, 377, 831, 444] }],
  masks: [{ object_id: "0", h: 67, w: 55, pixels: 2197 }],
  fetched_at: "2026-10-26T19:30:00Z",
};

const good = normalizeSamRecord(correctedShape);
ok("corrected shape normalises with no failures", good.failures.length === 0, good.failures.join("; "));
ok("normalised outcome is completed", good.record.outcome === "completed");
ok("raw outcome preserved", good.record.outcome_raw === "CompletedOutcome(status='completed')");
ok("diagnostics normalised to empty array", Array.isArray(good.record.diagnostics) && good.record.diagnostics.length === 0);
ok("raw diagnostics preserved", good.record.diagnostics_raw === "()");
ok("counts/box/pixels carried through", good.record.boxes === 1 && good.record.masks === 1 && good.record.mask_pixels === 2197 && good.record.box.join(",") === "776,377,831,444");
ok("timestamp carried verbatim", good.record.fetched_at === "2026-10-26T19:30:00Z");
ok("normalised corrected shape passes the validator", validateSamResult(good.record).length === 0);

// The on-disk corrected record has NO timestamp. Normalisation must
// fail closed on it — no invented fetched_at, ever.
const { failures: noTimeFailures } = normalizeSamRecord((() => {
  const r = { ...correctedShape };
  delete r.fetched_at;
  return r;
})());
ok("record without a timestamp fails closed", noTimeFailures.length > 0 && /missing time/.test(noTimeFailures.join(" ")), noTimeFailures.join("; "));

// Failed outcome, in recorded-string form, must fail — never map to completed.
const failedOutcome = normalizeSamRecord({ ...correctedShape, outcome: "CompletedOutcome(status='failed')" });
ok("failed CompletedOutcome string fails", failedOutcome.record === null && failedOutcome.failures.length > 0, failedOutcome.failures.join("; "));
const plainFailed = normalizeSamRecord({ ...correctedShape, outcome: "failed" });
ok("plain failed outcome fails", plainFailed.record === null && plainFailed.failures.length > 0);
const running = normalizeSamRecord({ ...correctedShape, outcome: "running" });
ok("unknown outcome fails", running.record === null && running.failures.length > 0);

// Diagnostics: a non-empty string is a failure, not a dropped field.
const diagString = normalizeSamRecord({ ...correctedShape, diagnostics: "timeout" });
ok("diagnostics error string fails", diagString.record === null && diagString.failures.length > 0, diagString.failures.join("; "));
const diagTuple = normalizeSamRecord({ ...correctedShape, diagnostics: "('timeout',)" });
ok("diagnostics tuple string fails", diagTuple.record === null && diagTuple.failures.length > 0);
const diagArray = normalizeSamRecord({ ...correctedShape, diagnostics: ["timeout"] });
ok("non-empty diagnostics array normalises verbatim", diagArray.record !== null && diagArray.record.diagnostics.join(",") === "timeout");
ok("non-empty diagnostics array fails the validator", validateSamResult(diagArray.record).length > 0);
const diagMissing = normalizeSamRecord((() => {
  const r = { ...correctedShape };
  delete r.diagnostics;
  return r;
})());
ok("missing diagnostics fails", diagMissing.record === null && diagMissing.failures.length > 0);

// Counts: zero boxes / zero pixels fail at the validator; an
// inconsistent recorded shape fails at normalisation.
const zeroBoxes = normalizeSamRecord({ ...correctedShape, n_boxes: 0, boxes: [] });
ok("zero boxes fails", zeroBoxes.record === null || validateSamResult(zeroBoxes.record).length > 0);
const zeroPixels = normalizeSamRecord({
  ...correctedShape,
  masks: [{ object_id: "0", h: 67, w: 55, pixels: 0 }],
});
ok("zero pixels fails the validator", validateSamResult(zeroPixels.record).length > 0);
const inconsistent = normalizeSamRecord({ ...correctedShape, n_boxes: 2 });
ok("n_boxes inconsistent with boxes[] fails", inconsistent.record === null && inconsistent.failures.length > 0, inconsistent.failures.join("; "));
const mixed = normalizeSamRecord({ ...correctedShape, boxes: 1, masks: 1, mask_pixels: 2197 });
ok("mixed recorded + validator shapes fail", mixed.record === null && mixed.failures.length > 0, mixed.failures.join("; "));

// Validator-shape input passes through unchanged.
const fixture = JSON.parse(JSON.stringify({
  box: [776, 377, 831, 444], boxes: 1, diagnostics: [], fetched_at: "2026-10-26T00:00:00Z",
  image_source: "Esri z12", mask_pixels: 2197, masks: 1, model: "sam-3.1",
  outcome: "completed", prompt: "snow", source: "hosted",
}));
const fixtureNorm = normalizeSamRecord(fixture);
ok("validator-shape fixture normalises clean", fixtureNorm.failures.length === 0, fixtureNorm.failures.join("; "));
ok("validator-shape fields preserved", fixtureNorm.record.mask_pixels === 2197 && fixtureNorm.record.box[0] === 776);

// Loader: missing file and bad JSON throw named errors, never a record.
let threwMissing = false;
try { loadSamRecord("/tmp/definitely-not-here-sam-record.json"); } catch (e) { threwMissing = /cannot read SAM record file/.test(e.message) && /definitely-not-here/.test(e.message); }
ok("missing SAM file throws naming the path", threwMissing);
writeFileSync("/tmp/sam-record-bad.json", "{not json");
let threwBadJson = false;
try { loadSamRecord("/tmp/sam-record-bad.json"); } catch (e) { threwBadJson = /not valid JSON/.test(e.message); }
ok("invalid JSON throws naming the file", threwBadJson);
writeFileSync("/tmp/sam-record-good.json", JSON.stringify(correctedShape));
const loaded = loadSamRecord("/tmp/sam-record-good.json");
ok("loader returns the parsed record verbatim", loaded.outcome === "CompletedOutcome(status='completed')" && loaded.diagnostics === "()");

console.log(`${passed} sam-record tests PASS`);
