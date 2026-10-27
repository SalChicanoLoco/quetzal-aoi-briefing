// Label and receipt gate — step 3 of the production plan.
// Used by tests, and by any later step that produces a briefing
// (SAM mask step, Spark briefing step) before that briefing is
// allowed out. Returns a list of failures; empty = PASS.
// Unverified = FAIL: a missing label or receipt is a failure,
// not a warning.
//
// Expected label map, from the project's label discipline:
//   magnitude, location, depth, time, event count -> measured
//   energy, polygon, centroid -> computed
//   interpretation -> inferred
// A computed value labelled measured is a hard fail. A prediction
// claim is a hard fail. A denial ("not a prediction") is not.

export function validateBriefing(briefing) {
  const failures = [];
  const fail = (msg) => failures.push(msg);
  if (!briefing || typeof briefing !== "object") return ["briefing is not an object"];
  if (!briefing.aoi || typeof briefing.aoi !== "object") fail("missing aoi");
  if (!Array.isArray(briefing.labels)) fail("missing labels array");
  else {
    for (const label of ["measured", "computed", "inferred"]) {
      if (!briefing.labels.includes(label)) fail(`labels missing ${label}`);
    }
  }

  const aoi = briefing.aoi ?? {};
  const expected = {
    max_magnitude_label: "measured",
    events_used_label: "measured",
    total_energy_label: "computed",
    polygon_label: "computed",
    interpretation_label: "inferred",
  };
  for (const [field, want] of Object.entries(expected)) {
    if (aoi[field] !== want) fail(`${field} is ${JSON.stringify(aoi[field])}, expected ${want}`);
  }
  if (aoi.centroid?.label !== "computed") fail("centroid.label is not computed");
  if (typeof aoi.total_energy_joules !== "number") fail("total_energy_joules is not a number");
  if (typeof aoi.max_magnitude !== "number") fail("max_magnitude is not a number");
  if (!Array.isArray(aoi.polygon) || aoi.polygon.length !== 5) fail("polygon is not a closed 5-point ring");

  // Prediction claims: affirmative only. A denial ("not a prediction",
  // "not a predictive model") is scrubbed before scanning, so a denial
  // cannot whitewash an affirmative claim elsewhere in the briefing:
  // the whole briefing object is scanned, not just the interpretation.
  // Allowed forecast language — "forecast hotspot", "exceedance
  // probability", "worth investigating" — contains none of the claim
  // patterns below and still passes.
  const text = JSON.stringify(briefing);
  const denialRe =
    /\bnot a (deterministic )?prediction\b|\bnot a predictive model\b|\bno prediction\b|\bnever a prediction\b|\bnot imminent\b/gi;
  const scrubbed = text.replace(denialRe, "");
  const claimPatterns = [
    [/will (occur|happen|strike|hit|shake)/i, "prediction claim: will occur/happen/strike/hit/shake"],
    [/going to (occur|happen|strike|hit|shake)/i, "prediction claim: going to occur/happen/strike/hit/shake"],
    [/about to (occur|happen|strike|hit)/i, "prediction claim: about to occur/happen/strike/hit"],
    [/expected to (occur|happen|strike|hit)/i, "prediction claim: expected to occur/happen/strike/hit"],
    [/certain to (occur|happen|strike|hit)/i, "prediction claim: certain to occur/happen/strike/hit"],
    [/forecast(?:ed)? to (occur|happen|strike|hit)/i, "prediction claim: forecast to occur/happen/strike/hit"],
    [/predictive model/i, "prediction claim: predictive model"],
    [/earthquake prediction/i, "prediction claim: earthquake prediction"],
    [/predicts\b/i, "prediction claim: predicts"],
    [/predicting\b/i, "prediction claim: predicting"],
    [/predicted to/i, "prediction claim: predicted to"],
    [/predicted (an? )?(earthquake|quake|event)/i, "prediction claim: predicted earthquake/event"],
    [/\bprediction\b/i, "prediction claim: prediction"],
    [/\b(imminent|inevitable)\b/i, "prediction claim: imminent/inevitable"],
    [/(earthquake|quake|seismic event|event)\b[^.!?]{0,60}\bwill\b/i, "prediction claim: event + will"],
    [/\bwill\b[^.!?]{0,40}\b(earthquake|quake)\b/i, "prediction claim: will + earthquake/quake"],
  ];
  for (const [pattern, message] of claimPatterns) {
    if (pattern.test(scrubbed)) fail(message);
  }
  if (typeof aoi.interpretation !== "string" || aoi.interpretation.length === 0) {
    fail("interpretation missing");
  }
  if (aoi.interpretation && !/not a prediction/i.test(aoi.interpretation)) {
    fail("interpretation does not explicitly disclaim prediction");
  }

  // Receipt: source + a time, and live receipts must name their URL.
  const receipt = briefing.receipt ?? {};
  if (typeof receipt.source !== "string" || receipt.source.length === 0) fail("receipt missing source");
  if (!receipt.fetched_at && !receipt.generated_at) fail("receipt missing time (fetched_at or generated_at)");
  if (receipt.source === "quetzal-live" && typeof receipt.url !== "string") {
    fail("live receipt missing url");
  }
  if (receipt.source === "mock" && receipt.url) fail("mock receipt must not carry a live url");

  return failures;
}
