// Generated visual tests — step 6 contract.
import { strict as assert } from "node:assert";
import { buildGeneratedVisualPrompt, buildVisualRecord, validateVisualRecord } from "../src/generated-visual.mjs";

const aoi = { id: "AOI--20N--180E" };
let n = 0;
function check(name, fn) { fn(); n++; console.log(`PASS ${name}`); }

check("prompt asks for illustration, not a map, no text or numbers in picture", () => {
  const p = buildGeneratedVisualPrompt(aoi);
  assert.ok(p.includes("not a map"));
  assert.ok(p.includes("no text"));
  assert.ok(p.includes(aoi.id));
});
check("good record passes", () => {
  const r = buildVisualRecord({ aoi, model: "muse-image-1.0", prompt: "ocean illustration", file: "assets/generated-visual-fiji.webp", receipt: { source: "meta-image-live", generated_at: "2026-10-26T00:00:00Z" } });
  assert.equal(r.visual_label, "GENERATED VISUAL");
  assert.deepEqual(validateVisualRecord(r), []);
});
check("satellite source fails", () => {
  const r = buildVisualRecord({ aoi, model: "muse-image-1.0", prompt: "x", file: "x.webp", receipt: { source: "meta-image-live" } });
  r.image_source = "satellite";
  assert.ok(validateVisualRecord(r).length > 0);
});
check("missing label fails", () => {
  const r = buildVisualRecord({ aoi, model: "muse-image-1.0", prompt: "x", file: "x.webp", receipt: { source: "meta-image-live" } });
  r.visual_label = "MAP";
  assert.ok(validateVisualRecord(r).length > 0);
});
check("computed mask claim fails", () => {
  const r = buildVisualRecord({ aoi, model: "muse-image-1.0", prompt: "x", file: "x.webp", receipt: { source: "meta-image-live" } });
  r.note = "computed mask";
  assert.ok(validateVisualRecord(r).length > 0);
});
check("missing receipt fails", () => {
  const r = buildVisualRecord({ aoi, model: "muse-image-1.0", prompt: "x", file: "x.webp", receipt: null });
  assert.ok(validateVisualRecord(r).length > 0);
});
console.log(`${n}/6 generated-visual tests PASS`);
