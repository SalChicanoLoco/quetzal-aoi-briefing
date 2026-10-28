// E2E test — step 7, replay mode only, no live calls, no keys.
// Builds a feed JSON from the orchestrator fixture, runs the
// continuous script on it, and checks the receipt.
import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { fixtureTelemetry } from "../src/orchestrator.mjs";

const feed = { requestId: "test-feed-1", generatedAt: "2026-10-26T00:00:00Z", events: fixtureTelemetry() };
writeFileSync("/tmp/e2e-test-feed.json", JSON.stringify(feed));
execSync("node src/e2e.mjs --feed /tmp/e2e-test-feed.json --sam test/sam-fixture.json --out /tmp/e2e-test-receipt.json", { encoding: "utf8" });
const receipt = JSON.parse(readFileSync("/tmp/e2e-test-receipt.json", "utf8"));
assert.equal(receipt.status, "PASS");
assert.equal(receipt.fetch_mode, "replay");
assert.deepEqual(receipt.live_leg.label_failures, []);
assert.deepEqual(receipt.mask_leg.sam_failures, []);
assert.equal(receipt.mask_leg.mask_record.mask_pixels, 2197);
assert.ok(receipt.live_leg.spark_prompt.includes(receipt.live_leg.aoi.id));
console.log("PASS e2e replay receipt");

// --- B2 fail-closed cases: bad SAM records must FAIL with a
// receipt, never a fabricated PASS, and the source record's real
// fields must survive verbatim in the receipt. ---
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function runE2e(samFile, outFile) {
  return spawnSync("node", ["src/e2e.mjs", "--feed", "/tmp/e2e-test-feed.json", "--sam", samFile, "--out", outFile], { encoding: "utf8" });
}
function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj));
}
const goodFixture = JSON.parse(readFileSync("test/sam-fixture.json", "utf8"));

// 1. Failed outcome in recorded-string form: exit 1, FAIL receipt,
//    mask_record null, source outcome preserved verbatim.
writeJson("/tmp/e2e-sam-failed.json", { ...goodFixture, outcome: "CompletedOutcome(status='failed')" });
let r = runE2e("/tmp/e2e-sam-failed.json", "/tmp/e2e-failed-receipt.json");
let failedReceipt = JSON.parse(readFileSync("/tmp/e2e-failed-receipt.json", "utf8"));
assert.notEqual(r.status, 0, "failed-outcome run must exit non-zero");
assert.equal(failedReceipt.status, "FAIL");
assert.equal(failedReceipt.mask_leg.mask_record, null);
assert.equal(failedReceipt.mask_leg.source_record.outcome, "CompletedOutcome(status='failed')");
assert.ok(failedReceipt.mask_leg.sam_failures.length > 0);
console.log("PASS e2e failed-outcome SAM record fails closed with verbatim source record");

// 2. Diagnostics as a string: fail closed, string preserved.
writeJson("/tmp/e2e-sam-diag.json", { ...goodFixture, diagnostics: "timeout" });
r = runE2e("/tmp/e2e-sam-diag.json", "/tmp/e2e-diag-receipt.json");
failedReceipt = JSON.parse(readFileSync("/tmp/e2e-diag-receipt.json", "utf8"));
assert.notEqual(r.status, 0);
assert.equal(failedReceipt.status, "FAIL");
assert.equal(failedReceipt.mask_leg.mask_record, null);
assert.equal(failedReceipt.mask_leg.source_record.diagnostics, "timeout");
console.log("PASS e2e diagnostics-string SAM record fails closed");

// 3. Zero pixels: fail closed at the validator.
writeJson("/tmp/e2e-sam-zero.json", { ...goodFixture, mask_pixels: 0 });
r = runE2e("/tmp/e2e-sam-zero.json", "/tmp/e2e-zero-receipt.json");
failedReceipt = JSON.parse(readFileSync("/tmp/e2e-zero-receipt.json", "utf8"));
assert.notEqual(r.status, 0);
assert.equal(failedReceipt.status, "FAIL");
assert.equal(failedReceipt.mask_leg.mask_record, null);
console.log("PASS e2e zero-pixel SAM record fails closed");

// 4. Missing SAM file: exit 1, FAIL receipt naming the path, no crash.
r = runE2e("/tmp/e2e-sam-does-not-exist.json", "/tmp/e2e-missing-receipt.json");
failedReceipt = JSON.parse(readFileSync("/tmp/e2e-missing-receipt.json", "utf8"));
assert.notEqual(r.status, 0);
assert.equal(failedReceipt.status, "FAIL");
assert.equal(failedReceipt.mask_leg.mask_record, null);
assert.equal(failedReceipt.mask_leg.source_record, null);
assert.ok(failedReceipt.failures.join(" ").includes("e2e-sam-does-not-exist.json"), "failure must name the missing path");
console.log("PASS e2e missing SAM file fails closed with a named FAIL receipt");

// 5. The raw corrected-record shape (CompletedOutcome string,
//    diagnostics "()", no timestamp): fails closed on the missing
//    timestamp — no timestamp is ever invented.
writeJson("/tmp/e2e-sam-raw.json", {
  model: "sam-3.1", source: "hosted", prompt: "snow",
  image_source: "Esri World Imagery z12",
  outcome: "CompletedOutcome(status='completed')", diagnostics: "()",
  n_boxes: 1, n_masks: 1,
  boxes: [{ object_id: "0", box: [776, 377, 831, 444] }],
  masks: [{ object_id: "0", h: 67, w: 55, pixels: 2197 }],
});
r = runE2e("/tmp/e2e-sam-raw.json", "/tmp/e2e-raw-receipt.json");
failedReceipt = JSON.parse(readFileSync("/tmp/e2e-raw-receipt.json", "utf8"));
assert.notEqual(r.status, 0);
assert.equal(failedReceipt.status, "FAIL");
assert.equal(failedReceipt.mask_leg.mask_record, null);
assert.ok(failedReceipt.mask_leg.sam_failures.join(" ").includes("missing time"));
assert.equal(failedReceipt.mask_leg.source_record.outcome, "CompletedOutcome(status='completed')");
console.log("PASS e2e timestamp-less raw record fails closed, nothing invented");

// 6. Default SAM path (no --sam): the checked-in fixture resolves
//    inside the repo, so the run passes without the old
//    two-levels-up path. This is what the fresh-clone check relies on.
const def = spawnSync("node", ["src/e2e.mjs", "--feed", "/tmp/e2e-test-feed.json", "--out", "/tmp/e2e-default-receipt.json"], { encoding: "utf8" });
const defReceipt = JSON.parse(readFileSync("/tmp/e2e-default-receipt.json", "utf8"));
assert.equal(def.status, 0, def.stderr);
assert.equal(defReceipt.status, "PASS");
assert.equal(defReceipt.mask_leg.mask_record.mask_pixels, 2197);
assert.ok(defReceipt.mask_leg.sam_source_path.endsWith("test/sam-fixture.json"), defReceipt.mask_leg.sam_source_path);
assert.ok(existsSync(defReceipt.mask_leg.sam_source_path), "default SAM path must exist in this layout");
console.log("PASS e2e default SAM path resolves to the checked-in fixture");

console.log("1/1 e2e tests PASS");
