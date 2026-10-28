// Step 4 tests: SAM bridge contract, validator, and mask record.
// No live calls, no keys. The recorded shape is a call-shape test,
// not an AOI mask.
import {
  aoiBoundingBox,
  validateSamResult,
  buildMaskRecord,
  RECORDED_HOSTED_SHAPE,
} from "../src/sam-bridge.mjs";
import { makeAOI, fixtureTelemetry } from "../src/orchestrator.mjs";

const checks = [];
function check(name, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const aoi = makeAOI(fixtureTelemetry());
const box = aoiBoundingBox(aoi.polygon);
check("bounding box matches 2-degree cell", box.lon_min === 94 && box.lon_max === 96 && box.lat_min === 32 && box.lat_max === 34);
check("bounding box spans 2 degrees", box.lon_span_deg === 2 && box.lat_span_deg === 2);

const recordedFailures = validateSamResult(RECORDED_HOSTED_SHAPE);
check("recorded hosted shape passes validator", recordedFailures.length === 0, recordedFailures.join("; "));

const record = buildMaskRecord(aoi, RECORDED_HOSTED_SHAPE);
check("mask record labelled COMPUTED MASK", record.mask_label === "COMPUTED MASK");
check("mask record carries aoi id", record.aoi_id === aoi.id);
check("mask record carries image source", typeof record.image_source === "string" && record.image_source.length > 0);
check("mask record is not labelled satellite or measured",
  !/satellite|measured/i.test(JSON.stringify(record.mask_label)));

function expectFail(name, mutated) {
  const failures = validateSamResult(mutated);
  check(`validator fails: ${name}`, failures.length > 0, failures.join("; "));
}
const noMask = structuredClone(RECORDED_HOSTED_SHAPE); noMask.masks = 0;
expectFail("zero masks", noMask);
const diag = structuredClone(RECORDED_HOSTED_SHAPE); diag.diagnostics = ["timeout"];
expectFail("non-empty diagnostics", diag);
const noImage = structuredClone(RECORDED_HOSTED_SHAPE); delete noImage.image_source;
expectFail("missing image_source", noImage);
const localAsHosted = structuredClone(RECORDED_HOSTED_SHAPE);
localAsHosted.model = "meta-sam-vit_b-local"; localAsHosted.source = "hosted";
expectFail("local model claimed as hosted", localAsHosted);
const notCompleted = structuredClone(RECORDED_HOSTED_SHAPE); notCompleted.outcome = "failed";
expectFail("outcome not completed", notCompleted);
const noBox = structuredClone(RECORDED_HOSTED_SHAPE); delete noBox.box;
expectFail("missing box", noBox);
const shortBox = structuredClone(RECORDED_HOSTED_SHAPE); shortBox.box = [231, 403, 264];
expectFail("box with 3 numbers", shortBox);
const nanBox = structuredClone(RECORDED_HOSTED_SHAPE); nanBox.box = [231, 403, Number.NaN, 558];
expectFail("box with NaN", nanBox);
const fracBoxes = structuredClone(RECORDED_HOSTED_SHAPE); fracBoxes.boxes = 1.5;
expectFail("fractional boxes", fracBoxes);
const fracPixels = structuredClone(RECORDED_HOSTED_SHAPE); fracPixels.mask_pixels = 2197.5;
expectFail("fractional mask pixels", fracPixels);
const stringDiag = structuredClone(RECORDED_HOSTED_SHAPE); stringDiag.diagnostics = "()";
expectFail("diagnostics as string", stringDiag);
const errorDiag = structuredClone(RECORDED_HOSTED_SHAPE); errorDiag.diagnostics = "error!";
expectFail("diagnostics as error string", errorDiag);
const noSource = structuredClone(RECORDED_HOSTED_SHAPE); delete noSource.source;
expectFail("missing source", noSource);
const zeroPixels = structuredClone(RECORDED_HOSTED_SHAPE); zeroPixels.mask_pixels = 0;
expectFail("zero mask pixels", zeroPixels);
const zeroBoxes = structuredClone(RECORDED_HOSTED_SHAPE); zeroBoxes.boxes = 0;
expectFail("zero boxes", zeroBoxes);

let threw = false;
try { buildMaskRecord(aoi, noMask); } catch { threw = true; }
check("buildMaskRecord throws on invalid result", threw);

if (checks.some((c) => !c)) process.exit(1);
console.log("SAM bridge tests PASS");
