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

  // Prediction claims: affirmative only. "not a prediction" passes.
  const text = JSON.stringify(briefing);
  if (/will (occur|happen|strike)/i.test(text)) fail("prediction claim: will occur/happen/strike");
  if (/predicted to/i.test(text)) fail("prediction claim: predicted to");
  if (/earthquake prediction/i.test(text) && !/not a prediction/i.test(text)) {
    fail("prediction claim: earthquake prediction");
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
