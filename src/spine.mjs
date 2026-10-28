// Orchestration spine — Quetzal AOI Briefing, hackathon-built Oct 27, 2026.
// The single spine: one entry point, ordered steps, receipts, fail-closed
// gates, per-step timeout and retry budget, and a scored outcome ledger.
//
// What this file is: a static route TABLE plus a step runner. The order is
// fixed. A step's outcome (route, status, latency, cost estimate) is
// recorded in the ledger so a FUTURE learning router has scored data to
// learn from. Nothing here learns, scores, or reorders routes: there is
// no heuristic, no weights, no history-based selection in this file.
// A learning layer, if built later, must be built on top of the ledger,
// never by silently reordering these steps.
//
// What this file is not: a Meta API caller. No live call is made here.
// Live results (telemetry feed, SAM result, Spark text, image file) are
// supplied by the caller as input data, exactly as skill-agent steps
// receive them. The Spark and visual steps build prompts/records only.
//
// Steps, in order:
//   1 telemetry   parse supplied feed -> events (route: telemetry)
//   2 aoi         highest-energy 2-degree cell (route: aoi)
//   3 label-gate  validateBriefing, fail-closed (route: label-gate)
//   4 sam-validate validate supplied SAM result, build mask record
//   5 gis-project project mask box, build + validate GeoJSON
//   6 spark-prompt build the Spark prompt, never send it
//   7 visual-record build + validate the GENERATED VISUAL record
// A step that fails stops the run: status FAIL, later steps do not run,
// the ledger keeps every step attempted so far.
//
// src/e2e.mjs remains the live-feed continuous runner and replay harness.
// This spine is the demo/shoot-day entry point. Two entry points is a
// smell, recorded honestly: after Nov 4, fold e2e's live fetch into
// this spine or delete one of them. Do not present both as "the" runner.

import { parseTelemetry, makeAOI, brief } from "./orchestrator.mjs";
import { validateBriefing } from "./labels.mjs";
import { validateSamResult, buildMaskRecord } from "./sam-bridge.mjs";
import { normalizeSamRecord } from "./sam-record.mjs";
import { buildGisGeoJson, validateGisGeoJson } from "./gis-export.mjs";
import { buildSparkPrompt } from "./spark-briefing.mjs";
import { buildVisualRecord, validateVisualRecord } from "./generated-visual.mjs";

// Static route table. Fixed order, fixed timeouts, fixed retry budgets.
// Costed routes (a live Meta call) get retries: 0 — a retry is a second
// charge. Local routes get retries: 1, because a local retry costs $0.
export const ROUTES = {
  telemetry: { kind: "local", timeoutMs: 60000, retries: 1, costEstimateUsd: 0 },
  aoi: { kind: "local", timeoutMs: 5000, retries: 1, costEstimateUsd: 0 },
  "label-gate": { kind: "local", timeoutMs: 5000, retries: 0, costEstimateUsd: 0 },
  "sam-validate": { kind: "supplied-result", timeoutMs: 5000, retries: 0, costEstimateUsd: 0 },
  "gis-project": { kind: "local", timeoutMs: 5000, retries: 1, costEstimateUsd: 0 },
  "spark-prompt": { kind: "prompt-only", timeoutMs: 5000, retries: 0, costEstimateUsd: 0 },
  "visual-record": { kind: "record-only", timeoutMs: 5000, retries: 0, costEstimateUsd: 0 },
};

export const SPINE_STEPS = Object.keys(ROUTES);

// Run one step with its timeout. Steps are synchronous local code; the
// timeout guards a hung step via Promise.race, it does not cancel work
// already running. A timeout is a failure, not a fallback to mock.
async function runWithTimeout(stepFn, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`step timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(stepFn), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Run the spine. Input is caller-supplied data only:
//   { feed, samResult, image, visualFile, visualReceipt }
// Returns { status, failures, state, ledger }. Never throws for a failed
// step. The ledger is the scored record a future router learns from:
// one entry per step attempted, in order.
export async function runSpine(input = {}) {
  const ledger = [];
  const state = {};
  const failures = [];

  const steps = [
    {
      id: "telemetry",
      run: () => {
        const events = parseTelemetry(input.feed);
        return { events };
      },
    },
    {
      id: "aoi",
      run: () => {
        const aoi = makeAOI(state.telemetry.events);
        return { aoi };
      },
    },
    {
      id: "label-gate",
      run: () => {
        const receipt = { source: "spine-input", generated_at: new Date().toISOString() };
        const briefing = brief(state.aoi.aoi, receipt);
        const gateFailures = validateBriefing(briefing);
        return { briefing, failures: gateFailures };
      },
      validate: (output) => output.failures,
    },
    {
      id: "sam-validate",
      run: () => {
        // One home for SAM record shape handling: normalise the
        // caller-supplied record (explicit CompletedOutcome /
        // diagnostics-string translation, raw fields preserved),
        // then validate the normalised record. A record that
        // cannot be normalised fails this step; nothing is
        // laundered into a PASS.
        const { record: samResult, failures: normaliseFailures } = normalizeSamRecord(input.samResult);
        if (!samResult) return { failures: normaliseFailures };
        const samFailures = validateSamResult(samResult);
        if (samFailures.length > 0) return { failures: samFailures };
        const maskRecord = buildMaskRecord(state.aoi.aoi, samResult);
        return { maskRecord, samResult, failures: [] };
      },
      validate: (output) => output.failures,
    },
    {
      id: "gis-project",
      run: () => {
        const samResult = state["sam-validate"].samResult;
        const geoJson = buildGisGeoJson({
          aoi: state.aoi.aoi,
          maskBox: samResult.box,
          maskPixels: samResult.mask_pixels,
          prompt: samResult.prompt,
          model: samResult.model,
          image: input.image,
          imageSource: samResult.image_source,
        });
        const gisFailures = validateGisGeoJson(geoJson, input.image);
        return { geoJson, failures: gisFailures };
      },
      validate: (output) => output.failures,
    },
    {
      id: "spark-prompt",
      run: () => {
        const prompt = buildSparkPrompt(state.aoi.aoi, state["label-gate"].briefing.receipt, state["sam-validate"].maskRecord);
        return { prompt };
      },
      validate: (output) => (output.prompt && output.prompt.includes("NOT a prediction") ? [] : ["Spark prompt lacks the prediction disclaimer"]),
    },
    {
      id: "visual-record",
      run: () => {
        const record = buildVisualRecord({
          aoi: state.aoi.aoi,
          model: "muse-image-1.0",
          prompt: "Stylised concept illustration, not a map, not satellite data.",
          file: input.visualFile,
          receipt: input.visualReceipt,
        });
        return { record, failures: validateVisualRecord(record) };
      },
      validate: (output) => output.failures,
    },
  ];

  for (const step of steps) {
    const route = ROUTES[step.id];
    const started = Date.now();
    let attempts = 0;
    let output = null;
    let stepFailures = [];
    while (attempts <= route.retries) {
      attempts += 1;
      try {
        output = await runWithTimeout(step.run, route.timeoutMs);
        stepFailures = step.validate ? step.validate(output) : [];
        if (stepFailures.length === 0) break;
      } catch (err) {
        stepFailures = [`step ${step.id} threw: ${err.message}`];
        output = null;
      }
      if (attempts <= route.retries) stepFailures = [];
    }
    const entry = {
      step: step.id,
      route: step.id,
      kind: route.kind,
      status: stepFailures.length === 0 ? "PASS" : "FAIL",
      attempts,
      latency_ms: Date.now() - started,
      cost_estimate_usd: route.costEstimateUsd,
      failures: [...stepFailures],
    };
    ledger.push(entry);
    if (stepFailures.length > 0) {
      failures.push(...stepFailures);
      break;
    }
    state[step.id] = output;
  }

  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
    state,
    ledger,
  };
}
