// Spark briefing — step 5 of the production plan, v2 (refined Oct 26).
// Refinements: (1) prompt polish — copy numbers exactly, no
// rounding/abbreviation/conversion, no new counts, percentages,
// depths, or probabilities; a mask is described only as a
// COMPUTED MASK of its named image, never satellite or measured
// data. (2) Bare-number validator — every number in the output
// must appear in the AOI, receipt, or mask context, not just
// M-prefixed magnitudes. (3) Combined AOI + mask briefing —
// buildSparkPrompt already took a maskRecord; v2 tests it with
// the real Nagqu snow mask, on a fixture AOI, labelled fixture,
// because the live day feed Oct 26-27 had 0 Nagqu events.
//
// What this file does:
//   buildSparkPrompt(aoi, receipt, maskRecord?) -> prompt string
//     Prompt contains ONLY numbers from the AOI/receipt/mask.
//     It asks for 2 sentences, forecast language only, and
//     explicitly forbids prediction claims and new numbers.
//   validateSparkBriefing(text, aoi) -> failures[]
//     Fails on prediction phrases, on a missing AOI id, and on
//     any magnitude value in the text that is not the AOI's
//     max magnitude (a common hallucination shape).
// What this file does NOT do: call the API. The live call runs
// on the owner's machine with their own key (docs/API.md call
// shape: muse-spark-1.3, reasoning_effort minimal, max_tokens
// 8192). No key is in this repo.

export function buildSparkPrompt(aoi, receipt, maskRecord = null) {
  const lines = [
    "You are writing a Quetzal AOI Briefing. Use ONLY the numbers below. Do not invent any number, probability, depth, or location.",
    "Copy every number exactly as given. Do not round, abbreviate, convert to scientific notation, or add any count, percentage, depth, or probability that is not listed below.",
    "Write exactly 2 sentences, forecast language only, in your own words. Include the AOI id verbatim. Do not repeat the input lines verbatim — summarise the cell, its magnitude and energy, and (if given) its mask, in plain briefing language.",
    "This is NOT a prediction: say the area is worth more observation, never that an event will occur at a specific time.",
    "",
    `AOI id: ${aoi.id}`,
    `Polygon (lon, lat, closed ring): ${JSON.stringify(aoi.polygon)}`,
    `Centroid: ${aoi.centroid.latitude}, ${aoi.centroid.longitude} [computed]`,
    `Events used in this cell: ${aoi.events_used} [measured]`,
    `Max magnitude in this cell: ${aoi.max_magnitude} [measured]`,
    `Total radiated energy in this cell: ${aoi.total_energy_joules} joules [computed, Gutenberg-Choy]`,
    `Receipt source: ${receipt.source}`,
    `Receipt time: ${receipt.fetched_at ?? receipt.generated_at}`,
  ];
  if (maskRecord) {
    lines.push(
      `Visual mask: ${maskRecord.mask_label}, model ${maskRecord.model}, prompt "${maskRecord.prompt}", image source: ${maskRecord.image_source}, mask pixels: ${maskRecord.mask_pixels}, box: ${JSON.stringify(maskRecord.box ?? null)}`,
      "Describe that mask only as a COMPUTED MASK of the named image above. Never call it satellite data, never call it measured data, and never use it to claim a magnitude, depth, or event.",
    );
  } else {
    lines.push("Visual mask: none in this run — do not claim a mask.");
  }
  return lines.join("\n");
}

// Numbers allowed in a briefing: every number in the AOI, the
// receipt, and (if given) the mask record, plus the numbers
// inside the AOI id itself (which is required verbatim).
// Receipt time components (year, month, day, hour, minute,
// second) are allowed only when a receipt is passed, so a
// briefing that echoes its receipt time does not fail, but a
// briefing that invents a date does.
export function allowedNumbers(aoi, receipt = null, maskRecord = null) {
  const out = new Set();
  const addText = (s) => {
    if (s === null || s === undefined) return;
    for (const m of String(s).matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)) {
      out.add(m[0]);
      out.add(String(Number(m[0])));
    }
  };
  addText(aoi.id);
  if (aoi.polygon) addText(JSON.stringify(aoi.polygon));
  if (aoi.centroid) { addText(aoi.centroid.latitude); addText(aoi.centroid.longitude); }
  addText(aoi.events_used); addText(aoi.max_magnitude); addText(aoi.total_energy_joules);
  if (aoi.cells_ranked) addText(aoi.cells_ranked);
  if (receipt) {
    addText(receipt.source);
    addText(receipt.fetched_at ?? receipt.generated_at);
    addText(receipt.request_id); addText(receipt.events); addText(receipt.fetch_ms);
  }
  if (maskRecord) {
    addText(maskRecord.mask_pixels); addText(maskRecord.boxes); addText(maskRecord.masks);
    if (maskRecord.box) addText(JSON.stringify(maskRecord.box));
    // Image source and model strings carry numbers too (sub-bbox
    // coordinates, zoom, image size, model version sam-3.1).
    // A briefing that echoes them is using context numbers, not
    // inventing new ones — so they are allowed, not flagged.
    addText(maskRecord.image_source); addText(maskRecord.model); addText(maskRecord.prompt);
  }
  return out;
}

export function validateSparkBriefing(text, aoi, receipt = null, maskRecord = null) {
  const failures = [];
  if (typeof text !== "string" || text.length === 0) return ["briefing text is empty"];
  if (!text.includes(aoi.id)) failures.push("briefing does not include the AOI id verbatim");
  if (/will (occur|happen|strike)/i.test(text)) failures.push("prediction claim: will occur/happen/strike");
  if (/predicted to/i.test(text)) failures.push("prediction claim: predicted to");
  if (/earthquake prediction/i.test(text) && !/not a prediction/i.test(text)) {
    failures.push("prediction claim: earthquake prediction");
  }
  // Magnitude hallucination check: any "M<digits>" in the text must
  // be the AOI's max magnitude (within string form).
  const mags = [...text.matchAll(/M\s?(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
  const want = String(aoi.max_magnitude);
  for (const m of mags) {
    if (m !== want && Number(m) !== Number(want)) {
      failures.push(`magnitude ${m} in briefing is not the AOI max magnitude ${want}`);
    }
  }
  // Bare-number check (v2): every number in the text, outside the
  // AOI id itself, must be in the allowed context numbers.
  // The AOI id is stripped first, so its own numbers do not
  // count as free numbers — but they are also in the polygon,
  // so this is belt-and-braces, not a loophole.
  const allowed = allowedNumbers(aoi, receipt, maskRecord);
  const stripped = text.split(aoi.id).join(" ");
  for (const m of stripped.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)) {
    const n = m[0];
    if (!allowed.has(n) && !allowed.has(String(Number(n)))) {
      failures.push(`number ${n} in briefing is not in the AOI, receipt, or mask context`);
    }
  }
  return failures;
}
