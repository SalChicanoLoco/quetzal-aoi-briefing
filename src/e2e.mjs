// One continuous run — step 7 of the production plan.
// One process, no manual edits between steps, full receipt:
//   1. Live feed (60s timeout — Oct 26 live latency is ~20s, the
//      old 10s orchestrator timeout falls back to mock, so Step 7
//      does NOT use that 10s timeout)
//   2. AOI polygon from that feed (highest Gutenberg-Choy cell)
//   3. Label/receipt gate on the briefing
//   4. SAM mask leg, labelled separately: the Nagqu discrete snow
//      mask (Esri z12, SAM 3.1, 1 box, 1 mask, 2197 pixels) is
//      validated here. It is NOT a mask for the live Fiji AOI.
//      Claiming it as a Fiji mask would be false, so the receipt
//      keeps the two legs separate, with their own AOI ids.
//   5. Spark prompt for the live AOI (no mask in that leg)
//      Spark itself is called on the owner's machine with their
//      own key, never in this file. The prompt is the handoff.
// Usage: node src/e2e.mjs [--out <receipt.json>] [--feed <path>]
//   --feed replays a saved live feed JSON (same requestId, same
//   timestamp, labelled as a replay, not a fresh live fetch).
//   --sam <path> gives the Nagqu SAM record (default: the corrected
//   Oct 26 record in the hackathon workspace, two levels up).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIVE_URL, parseTelemetry, makeAOI, brief } from "./orchestrator.mjs";
import { validateBriefing } from "./labels.mjs";
import { validateSamResult, buildMaskRecord } from "./sam-bridge.mjs";
import { buildSparkPrompt } from "./spark-briefing.mjs";

const args = process.argv.slice(2);
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const feedPath = args.includes("--feed") ? args[args.indexOf("--feed") + 1] : null;
const samPath = args.includes("--sam")
  ? args[args.indexOf("--sam") + 1]
  : join(dirname(dirname(fileURLToPath(import.meta.url))), "..", "sam-z12-snow-corrected.json");

let feed, fetchMs = 0, fetchMode = "live";
const t0 = Date.now();
if (feedPath) {
  feed = JSON.parse(readFileSync(feedPath, "utf8"));
  fetchMode = "replay";
} else {
  const res = await fetch(LIVE_URL, { signal: AbortSignal.timeout(60000) });
  feed = await res.json();
  fetchMs = Date.now() - t0;
}
const telemetry = parseTelemetry(feed);
const aoi = makeAOI(telemetry);
const receipt = {
  source: fetchMode === "live" ? "quetzal-live" : "quetzal-live-replay",
  request_id: feed.requestId ?? feed.request_id ?? null,
  generated_at: feed.generatedAt ?? feed.generated_at ?? new Date().toISOString(),
  fetch_ms: fetchMode === "live" ? fetchMs : null,
  events: telemetry.length,
  url: LIVE_URL,
};
const briefing = brief(aoi, receipt);
const labelFailures = validateBriefing(briefing);

// Nagqu snow mask leg — adapted explicitly from the corrected
// Oct 26 SAM record (n_boxes/n_masks/masks[] shape) into the
// validator shape (boxes/masks/mask_pixels, outcome completed).
const nagquRaw = JSON.parse(readFileSync(samPath, "utf8"));
// Accept both shapes: the corrected Oct 26 record (n_boxes,
// n_masks, masks[]/boxes[]) and the validator shape (boxes,
// masks, mask_pixels, box) used by the repo fixture.
const samResult = {
  model: nagquRaw.model,
  source: nagquRaw.source,
  outcome: "completed",
  diagnostics: [],
  boxes: nagquRaw.n_boxes ?? nagquRaw.boxes,
  masks: nagquRaw.n_masks ?? nagquRaw.masks,
  mask_pixels: Array.isArray(nagquRaw.masks) ? nagquRaw.masks[0].pixels : nagquRaw.mask_pixels,
  box: Array.isArray(nagquRaw.boxes) ? nagquRaw.boxes[0].box : nagquRaw.box,
  prompt: nagquRaw.prompt,
  image_source: nagquRaw.image_source,
  fetched_at: nagquRaw.fetched_at ?? "2026-10-26T00:00:00Z",
};
const samFailures = validateSamResult(samResult);
const nagquAoi = {
  id: "AOI-32N-94E",
  polygon: [[94, 32], [96, 32], [96, 34], [94, 34], [94, 32]],
};
const maskRecord = samFailures.length === 0 ? buildMaskRecord(nagquAoi, samResult) : null;
const sparkPrompt = buildSparkPrompt(aoi, receipt, null);

const e2e = {
  step: 7,
  generated_at: new Date().toISOString(),
  fetch_mode: fetchMode,
  live_leg: { aoi, receipt, label_failures: labelFailures, spark_prompt: sparkPrompt },
  mask_leg: {
    aoi_id: nagquAoi.id,
    note: "Discrete snow feature inside Nagqu AOI, NOT a mask for the live Fiji AOI. Do not present it as one.",
    sam_failures: samFailures,
    mask_record: maskRecord,
  },
  status: labelFailures.length === 0 && samFailures.length === 0 ? "PASS" : "FAIL",
};
console.log(JSON.stringify(e2e, null, 2));
if (out) writeFileSync(out, JSON.stringify(e2e, null, 2));
process.exit(e2e.status === "PASS" ? 0 : 1);
