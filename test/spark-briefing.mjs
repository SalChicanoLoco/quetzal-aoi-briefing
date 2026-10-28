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
{
  const failures = validateSparkBriefing(good, aoi);
  check("good briefing passes", failures.length === 0, failures.join("; "));
}

const badPred = good.replace("not a prediction", "an earthquake will occur tomorrow");
check("validator fails prediction", validateSparkBriefing(badPred, aoi).length > 0);
const badMag = good.replace("M5.2", "M7.8");
check("validator fails invented magnitude", validateSparkBriefing(badMag, aoi).length > 0);
const noId = good.replace(aoi.id, "somewhere");
check("validator fails missing AOI id", validateSparkBriefing(noId, aoi).length > 0);

// v2 — bare numbers, not just M-prefixed magnitudes.
const badBare = `${good} The chance is 42 percent.`;
check("validator fails invented bare number", validateSparkBriefing(badBare, aoi).length > 0);
const goodEnergy = `${good} Total radiated energy is ${aoi.total_energy_joules} joules computed.`;
{
  const failures = validateSparkBriefing(goodEnergy, aoi);
  check("validator passes context energy number", failures.length === 0, failures.join("; "));
}

// v2 — combined AOI + mask briefing, Nagqu snow mask fixture.
// Fixture AOI here is the orchestrator fixture (AOI-32N-94E);
// the mask is the real Nagqu snow mask record shape, not a Fiji mask.
import { readFileSync } from "node:fs";
const maskFixture = JSON.parse(readFileSync(new URL("./sam-fixture.json", import.meta.url), "utf8"));
const maskRecord = {
  mask_label: "COMPUTED MASK",
  model: maskFixture.model,
  prompt: maskFixture.prompt,
  image_source: maskFixture.image_source,
  mask_pixels: maskFixture.mask_pixels,
  box: maskFixture.box,
};
const nagquPrompt = buildSparkPrompt(aoi, receipt, maskRecord);
check("combined prompt includes mask pixels", nagquPrompt.includes(String(maskRecord.mask_pixels)));
check("combined prompt says COMPUTED MASK only", /Describe that mask only as a COMPUTED MASK/i.test(nagquPrompt));
check("combined prompt forbids rounding", /Do not round/i.test(nagquPrompt));
const combinedGood = `${good} The COMPUTED MASK for this AOI has ${maskRecord.mask_pixels} mask pixels.`;
check("combined briefing passes with mask context", validateSparkBriefing(combinedGood, aoi, receipt, maskRecord).length === 0,
  validateSparkBriefing(combinedGood, aoi, receipt, maskRecord).join("; "));
check("combined briefing fails without mask context", validateSparkBriefing(combinedGood, aoi, receipt).length > 0);

// B3 — free-text context numbers must NOT whitelist invented numbers.
// Probe from the code walk: with a receipt carrying request_id
// "qz-req-296740b69ea2" and fetch_ms 12345, and a mask record
// whose image_source names the sub-bbox 94.9-95.3E, 33.1-33.5N
// at zoom 12, the briefing below passed with ZERO failures
// before the fix. Every number in it is invented (depth,
// latency-as-fact, probability) and must now fail.
const probeReceipt = { source: "quetzal-live", request_id: "qz-req-296740b69ea2", fetch_ms: 12345, fetched_at: "2026-10-26T00:00:00Z" };
const probeMask = {
  mask_label: "COMPUTED MASK",
  model: "sam-3.1",
  prompt: "snow",
  image_source: "Esri World Imagery, sub-bbox 94.9-95.3E, 33.1-33.5N, zoom 12, 1165x1394",
  mask_pixels: 2197,
  boxes: 1,
  masks: 1,
  box: [776, 377, 831, 444],
};
const probeText = `${good} AOI-32N-94E: depth 33.1 km, fetch took 12345 ms, probability 12 percent.`;
{
  const failures = validateSparkBriefing(probeText, aoi, probeReceipt, probeMask);
  check("validator fails probe numbers from free-text context", failures.length > 0, failures.join("; "));
  check("validator flags each invented probe number", ["33.1", "12345", "12"].every((n) => failures.some((f) => f.includes(n))),
    failures.join("; "));
}
// Each free-text source on its own must not whitelist its numbers.
check("validator fails image-source bbox number alone", validateSparkBriefing(`${good} The area spans 94.9 degrees.`, aoi, receipt, maskRecord).length > 0);
check("validator fails fetch_ms number alone", validateSparkBriefing(`${good} The fetch took 12345 ms.`, aoi, probeReceipt, probeMask).length > 0);
check("validator fails request-id number alone", validateSparkBriefing(`${good} Request 296740b69ea2 is on file.`, aoi, probeReceipt, probeMask).length > 0);
// Legitimate numbers still pass: AOI fields, mask numeric fields,
// box coordinates, and receipt time components — and only those.
const legitWithContext = `${good} The COMPUTED MASK has ${maskRecord.mask_pixels} mask pixels, box ${JSON.stringify(maskRecord.box)}, recorded 2026-10-26.`;
{
  const failures = validateSparkBriefing(legitWithContext, aoi, receipt, maskRecord);
  check("validator passes legitimate mask/box/receipt-time numbers", failures.length === 0, failures.join("; "));
}
check("validator fails invented date", validateSparkBriefing(`${good} Recorded 2027-01-01.`, aoi, receipt, maskRecord).length > 0);

if (checks.some((c) => !c)) process.exit(1);
console.log("Spark briefing tests PASS");
