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
console.log("1/1 e2e tests PASS");
