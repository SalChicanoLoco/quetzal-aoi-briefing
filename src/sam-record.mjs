// SAM record loading and normalisation — the one home for turning a
// recorded SAM result on disk (or from a caller) into the validator
// shape, without laundering it.
//
// What this module is: a loader + explicit shape translation. The
// recorded Oct 26 Nagqu record and the live SAM call shape use
// `n_boxes` / `n_masks` / `boxes[]` / `masks[]`, an outcome string
// such as `CompletedOutcome(status='completed')`, and diagnostics as
// the string `"()"`. The validator shape (`src/sam-bridge.mjs`) uses
// `boxes` / `masks` / `mask_pixels`, `outcome: "completed"`, and
// `diagnostics: []`. Translating between those two shapes is
// legitimate ONLY when it is explicit, documented, and reversible:
// the normalised record always carries `outcome_raw` and
// `diagnostics_raw`, and callers keep the parsed source record
// verbatim in their receipt, so nothing the source said is lost.
//
// What this module never does:
//   - It never invents an outcome, diagnostics, or timestamp. A
//     record with a failed/unknown outcome, non-empty diagnostics,
//     or no `fetched_at` / `generated_at` is a FAILURE, returned as
//     a failure list — never a fabricated "completed" PASS.
//   - It never calls SAM, never touches a key, never fetches.
//   - It never falls back to mock data. A missing file, bad JSON,
//     or un-normalisable record fails closed.
//
// Callers: `src/e2e.mjs` (file records) and `src/spine.mjs`
// (caller-supplied records). Both must run the result through
// `validateSamResult` after normalisation; normalisation alone is
// not validation.
import { readFileSync } from "node:fs";

// Load a SAM record file. Throws a named error (never a fabricated
// record) when the file is missing or is not JSON. The expected path
// is always in the message, so an ENOENT in a fresh clone names
// exactly what is absent.
export function loadSamRecord(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`sam-record: cannot read SAM record file ${path}: ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`sam-record: SAM record file ${path} is not valid JSON: ${err.message}`);
  }
}

const COMPLETED_OUTCOME_RE = /^CompletedOutcome\(status=['"]completed['"]\)$/;

function fail(list, msg) {
  list.push(msg);
  return list;
}

// Normalise a parsed SAM record into the validator shape.
// Returns { record, failures }: `record` is null when failures is
// non-empty. This function never throws for bad data — bad data is
// a failure list, so callers can put it in a FAIL receipt.
// `record` carries the normalised fields PLUS `outcome_raw` and
// `diagnostics_raw`, so the source's own words stay in the receipt.
export function normalizeSamRecord(raw, { sourcePath = null } = {}) {
  const failures = [];
  const where = sourcePath ? ` (file ${sourcePath})` : "";
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { record: null, failures: [`SAM record is not an object${where}`] };
  }

  // Outcome: exactly two accepted forms, both explicit. Anything
  // else — "failed", "running", an unknown string — fails. The raw
  // string is preserved on outcome_raw.
  const outcomeRaw = raw.outcome;
  let outcome = null;
  if (outcomeRaw === "completed") {
    outcome = "completed";
  } else if (typeof outcomeRaw === "string" && COMPLETED_OUTCOME_RE.test(outcomeRaw)) {
    outcome = "completed";
  } else {
    fail(failures, `SAM outcome is ${JSON.stringify(outcomeRaw)}, expected "completed" or CompletedOutcome(status='completed')${where}`);
  }

  // Diagnostics: an array passes verbatim; the string "()" is the
  // recorded call shape's empty-diagnostics representation and maps
  // to [] ONLY in that exact form. Any other string is a failure:
  // a diagnostics string must never be silently dropped, because
  // that is how a failed run gets laundered into a PASS.
  const diagnosticsRaw = raw.diagnostics;
  let diagnostics = null;
  if (Array.isArray(diagnosticsRaw)) {
    diagnostics = diagnosticsRaw;
  } else if (diagnosticsRaw === "()") {
    diagnostics = [];
  } else {
    // Absent diagnostics is a failure, not an empty list: a record
    // that says nothing about diagnostics must not be read as
    // "diagnostics clean".
    fail(failures, `SAM diagnostics missing or not an array and not "()"${where}: ${JSON.stringify(diagnosticsRaw)}`);
  }

  // Counts and geometry: accept the recorded shape (n_boxes /
  // n_masks + boxes[] / masks[]) or the validator shape (boxes /
  // masks / mask_pixels / box). A record mixing the two shapes
  // inconsistently fails instead of picking whichever looks nicer.
  let boxes = null;
  let masks = null;
  let box = null;
  let maskPixels = null;
  const hasRecordedShape =
    raw.n_boxes !== undefined || raw.n_masks !== undefined || Array.isArray(raw.boxes) || Array.isArray(raw.masks);
  const hasValidatorShape =
    typeof raw.boxes === "number" || typeof raw.masks === "number" || raw.mask_pixels !== undefined;
  if (hasRecordedShape && hasValidatorShape) {
    fail(failures, `SAM record mixes recorded (n_boxes/n_masks/boxes[]/masks[]) and validator (boxes/masks/mask_pixels) shapes${where}`);
  } else if (hasRecordedShape) {
    if (typeof raw.n_boxes !== "number" || !Array.isArray(raw.boxes) || raw.boxes.length !== raw.n_boxes) {
      fail(failures, `SAM record n_boxes (${JSON.stringify(raw.n_boxes)}) does not match boxes[] length (${Array.isArray(raw.boxes) ? raw.boxes.length : "not an array"})${where}`);
    }
    if (typeof raw.n_masks !== "number" || !Array.isArray(raw.masks) || raw.masks.length !== raw.n_masks) {
      fail(failures, `SAM record n_masks (${JSON.stringify(raw.n_masks)}) does not match masks[] length (${Array.isArray(raw.masks) ? raw.masks.length : "not an array"})${where}`);
    }
    boxes = raw.n_boxes;
    masks = raw.n_masks;
    const firstBox = Array.isArray(raw.boxes) && raw.boxes.length > 0 ? raw.boxes[0] : null;
    box = firstBox && Array.isArray(firstBox.box) ? firstBox.box : null;
    if (!box) fail(failures, `SAM record has no first box in boxes[]${where}`);
    const firstMask = Array.isArray(raw.masks) && raw.masks.length > 0 ? raw.masks[0] : null;
    maskPixels = firstMask ? firstMask.pixels : null;
    if (typeof maskPixels !== "number") fail(failures, `SAM record has no pixel count in masks[0].pixels${where}`);
  } else {
    boxes = raw.boxes;
    masks = raw.masks;
    box = raw.box ?? null;
    maskPixels = raw.mask_pixels ?? null;
  }

  // Timestamp: carried verbatim, never invented. A record with no
  // fetched_at / generated_at fails here; the caller must supply a
  // record that carries its own time. (The corrected Oct 26 record
  // on disk has no timestamp — passing it via --sam fails closed
  // for exactly this reason. The checked-in fixture carries one.)
  const fetchedAt = raw.fetched_at ?? raw.generated_at ?? null;
  if (fetchedAt === null || fetchedAt === undefined || fetchedAt === "") {
    fail(failures, `SAM record missing time (fetched_at/generated_at)${where} — no timestamp invented`);
  }

  if (failures.length > 0) return { record: null, failures };

  return {
    record: {
      model: raw.model,
      source: raw.source,
      outcome,
      outcome_raw: outcomeRaw,
      diagnostics,
      diagnostics_raw: diagnosticsRaw,
      boxes,
      masks,
      mask_pixels: maskPixels,
      box,
      prompt: raw.prompt,
      image_source: raw.image_source,
      fetched_at: raw.fetched_at ?? null,
      generated_at: raw.generated_at ?? null,
    },
    failures: [],
  };
}
