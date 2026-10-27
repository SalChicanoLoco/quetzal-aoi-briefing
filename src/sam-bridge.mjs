// SAM visual bridge — step 4 of the production plan.
// What this file is, and what it is not:
//   IS: the contract between a live AOI and a hosted SAM result.
//       It turns an AOI polygon into a bounding box, validates a
//       SAM result, and labels the output as a COMPUTED MASK with
//       source, model, prompt, image source, and receipt.
//   IS NOT: a SAM call, a mask painter, or a basemap generator.
//       The hosted call itself runs on the owner's machine with
//       their own key (see docs/API.md for the verified Oct 26
//       call shape: Responses API, model sam-3.1, stream, one_bit
//       masks, meta-sam-parser). No key is in this repo, and no
//       mask is ever invented here.
//   BLOCKER, stated plainly: a true AOI mask needs a real basemap
//       image supplied by the owner (for example the Nagqu basemap
//       from the Mac report, or a named public map). Until that
//       image is in hand, this bridge validates recorded SAM
//       results and the call path, but does NOT claim an AOI mask.
//       A generated illustration, a procedural relief, or a stock
//       photo must never be presented as an AOI mask.
//
// Label rule: output is always "COMPUTED MASK", never "satellite",
// never "data", never "measured". The image_source field is what
// the reader checks: if it does not name a real basemap, the mask
// is not an AOI mask.

export function aoiBoundingBox(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 4) {
    throw new Error("sam-bridge: polygon is not a ring");
  }
  const lons = polygon.map((p) => p[0]);
  const lats = polygon.map((p) => p[1]);
  const lon_min = Math.min(...lons);
  const lon_max = Math.max(...lons);
  const lat_min = Math.min(...lats);
  const lat_max = Math.max(...lats);
  return {
    lon_min,
    lon_max,
    lat_min,
    lat_max,
    lon_span_deg: lon_max - lon_min,
    lat_span_deg: lat_max - lat_min,
    label: "computed",
  };
}

export function validateSamResult(result) {
  const failures = [];
  const fail = (msg) => failures.push(msg);
  if (!result || typeof result !== "object") return ["SAM result is not an object"];
  if (result.model !== "sam-3.1" && result.model !== "meta-sam-vit_b-local") {
    fail(`model is ${JSON.stringify(result.model)}, expected sam-3.1 or meta-sam-vit_b-local`);
  }
  if (result.outcome !== "completed") fail(`outcome is ${JSON.stringify(result.outcome)}, expected completed`);
  if (Array.isArray(result.diagnostics) && result.diagnostics.length > 0) {
    fail(`diagnostics not empty: ${result.diagnostics.join(", ")}`);
  }
  if (typeof result.boxes !== "number" || result.boxes < 1) fail("no boxes in SAM result");
  if (typeof result.masks !== "number" || result.masks < 1) fail("no masks in SAM result");
  if (typeof result.mask_pixels !== "number" || result.mask_pixels <= 0) fail("mask pixels not positive");
  if (typeof result.prompt !== "string" || result.prompt.length === 0) fail("missing SAM prompt");
  if (typeof result.image_source !== "string" || result.image_source.length === 0) {
    fail("missing image_source — a mask without a named image is not shippable");
  }
  if (result.model === "meta-sam-vit_b-local" && result.source === "hosted") {
    fail("local model claimed as hosted");
  }
  if (result.model === "sam-3.1" && result.source === "local") {
    fail("hosted model claimed as local");
  }
  if (!result.fetched_at && !result.generated_at) fail("SAM result missing time");
  return failures;
}

export function buildMaskRecord(aoi, samResult) {
  const failures = validateSamResult(samResult);
  if (failures.length > 0) {
    throw new Error(`sam-bridge: invalid SAM result: ${failures.join("; ")}`);
  }
  return {
    aoi_id: aoi.id,
    bounding_box: aoiBoundingBox(aoi.polygon),
    mask_label: "COMPUTED MASK",
    model: samResult.model,
    source: samResult.source,
    prompt: samResult.prompt,
    image_source: samResult.image_source,
    boxes: samResult.boxes,
    masks: samResult.masks,
    mask_pixels: samResult.mask_pixels,
    box: samResult.box ?? null,
    receipt: {
      source: samResult.source,
      model: samResult.model,
      fetched_at: samResult.fetched_at ?? samResult.generated_at,
      image_source: samResult.image_source,
      note: "Mask is a segmentation of the supplied image only. It is not a satellite image, not measured data, and not a prediction.",
    },
  };
}

// Recorded Oct 26 hosted SAM shape, for tests only.
// This is the call shape (1 box, 1 mask, Completed, empty
// diagnostics), not an AOI mask — the image was a stock photo,
// the prompt was "person". Do not present it as an AOI mask.
export const RECORDED_HOSTED_SHAPE = {
  model: "sam-3.1",
  source: "hosted",
  outcome: "completed",
  diagnostics: [],
  boxes: 1,
  masks: 1,
  mask_pixels: 3076,
  box: [231, 403, 264, 558],
  prompt: "person",
  image_source: "Pexels stock photo, person standing outdoors (Oct 26 smoke test)",
  fetched_at: "2026-10-26T19:30:00Z",
};
