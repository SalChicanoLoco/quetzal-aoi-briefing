// Spark briefing — step 5 of the production plan, v1.
// Refine later: prompt wording, length, and probability handling
// are v1 here, not final. The gates in this file are not v1 —
// they are the same label/receipt rules as steps 2-3.
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
    "Write exactly 2 sentences, forecast language only. Include the AOI id verbatim.",
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
      `Visual mask: ${maskRecord.mask_label}, model ${maskRecord.model}, prompt "${maskRecord.prompt}", image source: ${maskRecord.image_source}, mask pixels: ${maskRecord.mask_pixels}`,
    );
  } else {
    lines.push("Visual mask: none in this run — do not claim a mask.");
  }
  return lines.join("\n");
}

export function validateSparkBriefing(text, aoi) {
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
  return failures;
}
