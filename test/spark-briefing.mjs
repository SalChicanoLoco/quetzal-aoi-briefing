// Step 5 tests, v1 — prompt contains only input numbers, and the
// validator passes good briefings and fails bad ones. No live calls.
import { buildSparkPrompt, validateSparkBriefing } from "../src/spark-briefing.mjs";
import { makeAOI, fixtureTelemetry } from "../src/orchestrator.mjs";

const checks = [];
function check(name, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const aoi = makeAOI(fixtureTelemetry());
const receipt = { source: "fixture", generated_at: "2026-10-26T00:00:00Z" };
const prompt = buildSparkPrompt(aoi, receipt);
check("prompt includes AOI id", prompt.includes(aoi.id));
check("prompt includes max magnitude", prompt.includes(String(aoi.max_magnitude)));
check("prompt includes total energy", prompt.includes(String(aoi.total_energy_joules)));
check("prompt forbids new numbers", /Do not invent any number/i.test(prompt));
check("prompt says not a prediction", /NOT a prediction/i.test(prompt));

const good = `Quetzal AOI Briefing — ${aoi.id}: this cell, with max magnitude M5.2 [measured], is worth more observation, not a prediction of a specific event. Its total radiated energy is computed from the events in this cell, as recorded in the receipt.`;
check("good briefing passes", validateSparkBriefing(good, aoi).length === 0,
  validateSparkBriefing(good, aoi).join("; "));

const badPred = good.replace("not a prediction", "an earthquake will occur tomorrow");
check("validator fails prediction", validateSparkBriefing(badPred, aoi).length > 0);
const badMag = good.replace("M5.2", "M7.8");
check("validator fails invented magnitude", validateSparkBriefing(badMag, aoi).length > 0);
const noId = good.replace(aoi.id, "somewhere");
check("validator fails missing AOI id", validateSparkBriefing(noId, aoi).length > 0);

if (checks.some((c) => !c)) process.exit(1);
console.log("Spark briefing tests PASS");
