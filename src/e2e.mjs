// One continuous run — step 7 of the production plan.
// One process, no manual edits between steps, full receipt:
//   1. Live feed (60s timeout) or a replayed feed file
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
//
// SAM record handling (B2 fix, Oct 28): the SAM record is loaded
// and normalised by src/sam-record.mjs and then validated by
// src/sam-bridge.mjs. The record's own outcome, diagnostics, and
// timestamp are carried through verbatim — never hardcoded, never
// invented. A missing, unreadable, or failed record fails the run
// closed: status FAIL, mask_record null, the source record (when
// readable) preserved in the receipt, exit 1. No mock, no fallback.
// The default SAM path is the checked-in fixture
// test/sam-fixture.json, so the run works in a fresh clone; --sam
// overrides it explicitly.
//
// Failure handling: every failure path (feed fetch/read, SAM
// load/normalise/validate, receipt write) writes a FAIL receipt to
// --out when given, prints it, and exits 1. A run that cannot
// write its receipt is a failure, not a silent PASS.
// Usage: node src/e2e.mjs [--out <receipt.json>] [--feed <path>]
//   --feed replays a saved live feed JSON (same requestId, same
//   timestamp, labelled as a replay, not a fresh live fetch).
//   --sam <path> gives the SAM record (default: test/sam-fixture.json).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIVE_URL, parseTelemetry, makeAOI, brief } from "./orchestrator.mjs";
import { validateBriefing } from "./labels.mjs";
import { validateSamResult, buildMaskRecord } from "./sam-bridge.mjs";
import { loadSamRecord, normalizeSamRecord } from "./sam-record.mjs";
import { buildSparkPrompt } from "./spark-briefing.mjs";

const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  if (i + 1 >= args.length) throw new Error(`e2e: ${flag} needs a value`);
  return args[i + 1];
}
const out = argVal("--out");
const feedPath = argVal("--feed");
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const samPath = argVal("--sam") ?? join(repoRoot, "test", "sam-fixture.json");

function writeReceipt(receipt) {
  const text = JSON.stringify(receipt, null, 2);
  console.log(text);
  if (out) {
    try {
      writeFileSync(out, text);
    } catch (err) {
      console.error(`e2e: cannot write receipt to ${out}: ${err.message}`);
      process.exit(1);
    }
  }
}

// Fail closed: emit a FAIL receipt (with every leg completed so
// far, and the failure named) and exit 1. Never exit 0 without a
// PASS receipt, never print a PASS for a failed leg.
function failClosed(failures, partial = {}) {
  const receipt = {
    step: 7,
    generated_at: new Date().toISOString(),
    fetch_mode: partial.fetchMode ?? null,
    status: "FAIL",
    failures,
    live_leg: partial.liveLeg ?? null,
    mask_leg: partial.maskLeg ?? {
      aoi_id: "AOI-32N-94E",
      note: "Discrete snow feature inside Nagqu AOI, NOT a mask for the live Fiji AOI. Do not present it as one.",
      sam_source_path: samPath,
      source_record: partial.sourceRecord ?? null,
      sam_result: null,
      sam_failures: failures,
      mask_record: null,
    },
  };
  writeReceipt(receipt);
  process.exit(1);
}

async function run() {
  // --- Feed leg: fetch or replay, with res.ok / read errors as
  // failures, never a fallback. ---
  let feed;
  let fetchMs = 0;
  let fetchMode = "live";
  const t0 = Date.now();
  if (feedPath) {
    fetchMode = "replay";
    try {
      feed = JSON.parse(readFileSync(feedPath, "utf8"));
    } catch (err) {
      failClosed([`e2e: cannot read feed file ${feedPath}: ${err.message}`], { fetchMode });
    }
  } else {
    let res;
    try {
      res = await fetch(LIVE_URL, { signal: AbortSignal.timeout(60000) });
    } catch (err) {
      failClosed([`e2e: live feed fetch failed: ${err.message}`], { fetchMode });
    }
    if (!res.ok) {
      failClosed([`e2e: live feed fetch HTTP ${res.status} ${res.statusText} from ${LIVE_URL}`], { fetchMode });
    }
    try {
      feed = await res.json();
    } catch (err) {
      failClosed([`e2e: live feed response is not JSON: ${err.message}`], { fetchMode });
    }
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
  const liveLeg = {
    aoi,
    receipt,
    label_failures: labelFailures,
    spark_prompt: buildSparkPrompt(aoi, receipt, null),
  };

  // --- SAM leg: load the actual record, normalise its shape
  // explicitly, validate the normalised record. The source record
  // is preserved verbatim in the receipt; its outcome, diagnostics,
  // and timestamp are never replaced with literals. ---
  const nagquAoi = {
    id: "AOI-32N-94E",
    polygon: [[94, 32], [96, 32], [96, 34], [94, 34], [94, 32]],
  };
  let sourceRecord;
  try {
    sourceRecord = loadSamRecord(samPath);
  } catch (err) {
    failClosed([err.message], {
      fetchMode,
      liveLeg,
      maskLeg: {
        aoi_id: nagquAoi.id,
        note: "Discrete snow feature inside Nagqu AOI, NOT a mask for the live Fiji AOI. Do not present it as one.",
        sam_source_path: samPath,
        source_record: null,
        sam_result: null,
        sam_failures: [err.message],
        mask_record: null,
      },
    });
  }
  const { record: samResult, failures: normaliseFailures } = normalizeSamRecord(sourceRecord, { sourcePath: samPath });
  const samFailures = samResult ? validateSamResult(samResult) : normaliseFailures;
  const maskLeg = {
    aoi_id: nagquAoi.id,
    note: "Discrete snow feature inside Nagqu AOI, NOT a mask for the live Fiji AOI. Do not present it as one.",
    sam_source_path: samPath,
    source_record: sourceRecord,
    sam_result: samResult,
    sam_failures: samFailures,
    mask_record: null,
  };
  if (samFailures.length === 0) {
    maskLeg.mask_record = buildMaskRecord(nagquAoi, samResult);
  }

  const e2e = {
    step: 7,
    generated_at: new Date().toISOString(),
    fetch_mode: fetchMode,
    live_leg: liveLeg,
    mask_leg: maskLeg,
    status: labelFailures.length === 0 && samFailures.length === 0 ? "PASS" : "FAIL",
  };
  writeReceipt(e2e);
  process.exit(e2e.status === "PASS" ? 0 : 1);
}

run().catch((err) => {
  // Last-resort guard: an unexpected throw anywhere is a FAIL
  // receipt, never an uncaught crash with no receipt.
  failClosed([`e2e: unexpected failure: ${err.message}`]);
});
