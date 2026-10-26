// Step 3 tests: label and receipt gate.
// Passes good briefings, and proves the gate itself fails bad ones.
import { validateBriefing } from "../src/labels.mjs";
import { makeAOI, fixtureTelemetry, mockTelemetry, brief } from "../src/orchestrator.mjs";

const checks = [];
function check(name, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// 1. Good fixture briefing passes.
const fixtureBrief = brief(makeAOI(fixtureTelemetry()), {
  source: "fixture",
  generated_at: new Date().toISOString(),
});
check("fixture briefing passes gate", validateBriefing(fixtureBrief).length === 0,
  validateBriefing(fixtureBrief).join("; "));

// 2. Good mock briefing passes, and is labelled mock, not live.
const mockBrief = brief({ ...makeAOI(mockTelemetry()), id: "AOI-MOCK" }, {
  source: "mock",
  generated_at: new Date().toISOString(),
});
check("mock briefing passes gate", validateBriefing(mockBrief).length === 0);
check("mock briefing source is mock", mockBrief.receipt.source === "mock");

// 3. Good live-shaped briefing passes (shape only, no live call here).
const liveBrief = brief(makeAOI(fixtureTelemetry()), {
  source: "quetzal-live",
  url: "https://example.invalid/live",
  fetched_at: new Date().toISOString(),
  events_received: 3,
});
check("live-shaped briefing passes gate", validateBriefing(liveBrief).length === 0);

// 4. Gate fails bad briefings — each one must produce at least one failure.
function expectFail(name, mutated) {
  const failures = validateBriefing(mutated);
  check(`gate fails: ${name}`, failures.length > 0, failures.join("; "));
}

const computedAsMeasured = structuredClone(fixtureBrief);
computedAsMeasured.aoi.total_energy_label = "measured";
expectFail("computed energy labelled measured", computedAsMeasured);

const noReceipt = structuredClone(fixtureBrief);
delete noReceipt.receipt;
expectFail("missing receipt", noReceipt);

const noTime = structuredClone(fixtureBrief);
delete noTime.receipt.generated_at;
expectFail("receipt without time", noTime);

const liveNoUrl = structuredClone(liveBrief);
delete liveNoUrl.receipt.url;
expectFail("live receipt without url", liveNoUrl);

const prediction = structuredClone(fixtureBrief);
prediction.aoi.interpretation = "An earthquake will occur here tomorrow.";
expectFail("prediction claim", prediction);

const missingLabel = structuredClone(fixtureBrief);
missingLabel.labels = ["measured", "computed"];
expectFail("labels missing inferred", missingLabel);

if (checks.some((c) => !c)) process.exit(1);
console.log("Label and receipt tests PASS");
