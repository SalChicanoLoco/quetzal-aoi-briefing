// Generated visual — step 6 of the production plan.
// What this file is, and what it is not:
//   IS: the contract for a briefing illustration made by a Meta
//       image model. It builds a prompt that asks for a stylised
//       concept illustration, builds a record that labels the
//       result GENERATED VISUAL, and validates that record.
//   IS NOT: data, a map, a satellite image, or a SAM mask.
//       It must never repaint a SAM mask, never be called
//       satellite, and never carry a number the AOI did not contain.
//       The image model is asked for NO text, NO numbers, NO map
//       in the picture itself — those would be invented by the model.
// A live call runs on the owner's machine with their own key
// (docs/API.md: muse-image-1.0). No key is in this repo.

export function buildGeneratedVisualPrompt(aoi) {
  return [
    "Stylised concept illustration, not a map, not a satellite photo, not scientific data:",
    "a wide ocean horizon at dusk with a small network of observation buoys and a faint grid of watch zones over the sea,",
    "calm, editorial, high-contrast illustration style, no text, no numbers, no labels, no map outlines, no coastline detail.",
    `Inspiration only (not depicted as data): AOI ${aoi.id}, Pacific ocean watch area.`,
  ].join(" ");
}

export function buildVisualRecord({ aoi, model, prompt, file, receipt }) {
  return {
    visual_label: "GENERATED VISUAL",
    image_source: "generated",
    model,
    prompt,
    file,
    aoi_id: aoi.id,
    receipt,
    note: "Illustration only. Not a map, not satellite imagery, not a SAM mask, not data.",
  };
}

export function validateVisualRecord(record) {
  const failures = [];
  if (!record || typeof record !== "object") return ["visual record is missing"];
  if (record.visual_label !== "GENERATED VISUAL") failures.push("visual label must be GENERATED VISUAL");
  if (record.image_source !== "generated") failures.push("image source must be generated, never satellite or live");
  if (!record.model || !record.model.includes("muse-image")) failures.push("model must be a Meta image model");
  if (!record.prompt) failures.push("visual prompt is missing");
  if (!record.file) failures.push("visual file is missing");
  if (!record.aoi_id) failures.push("visual record must name its AOI id");
  if (!record.receipt || !record.receipt.source) failures.push("visual receipt is missing");
  const bad = JSON.stringify(record).toLowerCase();
  if (bad.includes("satellite image") && !bad.includes("not a satellite")) {
    // The note itself says "not satellite" — that phrasing is allowed.
    // A bare claim of satellite imagery is not, and is caught by the
    // image_source check above; this is a second, stricter read.
    if (!bad.includes("not satellite imagery")) failures.push("visual must never be claimed as satellite imagery");
  }
  if (bad.includes("computed mask")) failures.push("generated visual must never be claimed as a computed mask");
  return failures;
}
