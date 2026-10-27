// Skill-agent unit tests — deterministic, no live calls, no network.
// The blind-reproduction harness is test/skill-agent-blind.mjs.
import { strict as assert } from "node:assert";
import {
  SAM_ROLE,
  getRoleDefinition,
  validateSkillDefinition,
  buildSkillPrompt,
  runSkill,
  mockRunSkill,
  buildSamSkill,
  buildTesterSkill,
  buildDebugSkill,
  buildVisualSkill,
  buildDemoSkill,
  buildBriefingSkill,
} from "../src/skill-agent.mjs";
import { fixtureTelemetry, makeAOI } from "../src/orchestrator.mjs";
import { brief } from "../src/orchestrator.mjs";
import { RECORDED_HOSTED_SHAPE } from "../src/sam-bridge.mjs";

let n = 0;
function check(name, fn) {
  fn();
  n += 1;
  console.log(`PASS ${name}`);
}

const image = {
  width: 1165,
  height: 1394,
  zoom: 12,
  tileX0: 3127,
  tileY0: 1643,
  cropPx: [192, 17, 1357, 1411],
  bbox: [94.9, 95.3, 33.1, 33.5],
};
const aoi = makeAOI(fixtureTelemetry());

check("sam role is defined here, base roles are reused", () => {
  assert.equal(SAM_ROLE.system.includes("COMPUTED MASK"), true);
  assert.equal(getRoleDefinition("tester").system.includes("testing agent"), true);
  assert.throws(() => getRoleDefinition("nope"), /unknown skill role/);
});

check("invalid skill definitions fail validation", () => {
  assert.ok(validateSkillDefinition(null).length > 0);
  assert.ok(validateSkillDefinition({ name: "x", role: "tester", allowedTools: [], steps: [] }).length > 0);
  assert.ok(
    validateSkillDefinition({
      name: "x",
      role: "tester",
      allowedTools: [],
      steps: [
        { id: "a", run: () => ({}) },
        { id: "a", run: () => ({}) },
      ],
    }).length > 0,
  );
  assert.ok(
    validateSkillDefinition({
      name: "x",
      role: "tester",
      allowedTools: [],
      steps: [{ id: "a" }],
    }).length > 0,
  );
});

check("skill prompt carries role, steps, tools, and only the given context", () => {
  const skill = buildDebugSkill({ failureReport: "timeout after 60s" });
  const prompt = buildSkillPrompt(skill, "Diagnose this", { checks: 3 });
  assert.ok(prompt.includes("debug agent"));
  assert.ok(prompt.includes("classify"));
  assert.ok(prompt.includes("Diagnose this"));
  assert.ok(prompt.includes('"checks":3'));
  assert.ok(!prompt.includes("expected"));
});

check("a step that throws fails closed and later steps do not run", () => {
  const ran = [];
  const skill = {
    name: "throws",
    role: "tester",
    allowedTools: [],
    steps: [
      { id: "boom", run: () => { throw new Error("boom"); } },
      { id: "later", run: () => { ran.push("later"); return {}; } },
    ],
  };
  const result = runSkill(skill, {});
  assert.equal(result.status, "FAIL");
  assert.equal(result.receipts.length, 1);
  assert.deepEqual(ran, []);
});

check("a step validator failure fails closed with receipts in order", () => {
  const skill = {
    name: "bad-step",
    role: "tester",
    allowedTools: [],
    steps: [
      { id: "ok", run: () => ({ summary: "ok" }) },
      {
        id: "bad",
        run: () => ({ value: 1 }),
        validator: () => ["value is unverified"],
      },
    ],
  };
  const result = runSkill(skill, {});
  assert.equal(result.status, "FAIL");
  assert.deepEqual(result.receipts.map((r) => r.step_id), ["ok", "bad"]);
  assert.deepEqual(result.receipts.map((r) => r.status), ["PASS", "FAIL"]);
});

check("disallowed tools fail before the step runs", () => {
  const skill = {
    name: "tools",
    role: "tester",
    allowedTools: ["label-gate"],
    steps: [{ id: "s", tools: ["spark-validator"], run: () => ({}) }],
  };
  const result = runSkill(skill, {});
  assert.equal(result.status, "FAIL");
  assert.ok(result.failures[0].includes("disallowed tools"));
});

check("a step returning nothing fails closed — unverified is FAIL", () => {
  const skill = {
    name: "empty",
    role: "tester",
    allowedTools: [],
    steps: [{ id: "s", run: () => null }],
  };
  assert.equal(runSkill(skill, {}).status, "FAIL");
});

check("SAM skill fails closed with no supplied SAM result — no mask is invented", () => {
  const skill = buildSamSkill({ aoi, samResult: null, image, imageSource: "x" });
  const result = runSkill(skill, {});
  assert.equal(result.status, "FAIL");
  assert.equal(result.receipts.length, 1);
  assert.equal(result.state["build-mask-record"], undefined);
});

check("SAM skill passes on the recorded hosted shape and projects the box", () => {
  const skill = buildSamSkill({
    aoi,
    samResult: RECORDED_HOSTED_SHAPE,
    image,
    imageSource: RECORDED_HOSTED_SHAPE.image_source,
  });
  const result = runSkill(skill, {});
  assert.equal(result.status, "PASS", JSON.stringify(result.failures));
  assert.equal(result.state["build-mask-record"].record.mask_label, "COMPUTED MASK");
  assert.equal(result.state["project-mask"].polygon.length, 5);
});

check("tester skill reports validator findings without failing on a bad artefact", () => {
  const badBriefing = { aoi: {}, labels: [], receipt: {} };
  const skill = buildTesterSkill({
    briefing: badBriefing,
    briefingText: "",
    aoi,
    receipt: { source: "fixture", generated_at: "2026-10-27T00:00:00Z" },
    maskRecord: null,
    geoJson: { type: "FeatureCollection", features: [] },
    image,
  });
  const result = runSkill(skill, {});
  assert.equal(result.status, "PASS");
  assert.ok(result.state["label-gate"].failures.length > 0);
  assert.ok(result.state["spark-validator"].failures.length > 0);
  assert.ok(result.state["gis-validator"].failures.length > 0);
});

check("tester skill passes on a good fixture briefing", () => {
  const good = brief(aoi, { source: "fixture", generated_at: "2026-10-27T00:00:00Z" });
  const skill = buildTesterSkill({
    briefing: good,
    briefingText: `${aoi.id} remains worth more observation.`,
    aoi,
    receipt: { source: "fixture", generated_at: "2026-10-27T00:00:00Z" },
    maskRecord: null,
    geoJson: null,
    image,
  });
  // GIS step is supplied no GeoJSON here, so its report is a
  // failure report — the tester still runs; only the GIS report
  // is non-empty. Assert the label and Spark reports are clean.
  const result = runSkill(skill, {});
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.state["label-gate"].failures, []);
  assert.deepEqual(result.state["spark-validator"].failures, []);
});

check("debug skill classifies and gives one next step, no new numbers", () => {
  const skill = buildDebugSkill({ failureReport: "live fetch timeout after 60s" });
  const result = runSkill(skill, {});
  assert.equal(result.status, "PASS");
  assert.equal(result.state.classify.category, "timeout");
  assert.ok(result.state["next-step"].next_step.includes("60s"));
});

check("visual and demo skills run mock only; a live request fails closed", () => {
  const visual = buildVisualSkill({
    aoi,
    file: "assets/generated-visual-fiji.webp",
    receipt: { source: "mock", generated_at: "2026-10-27T00:00:00Z" },
  });
  const visualResult = runSkill(visual, {});
  assert.equal(visualResult.status, "PASS");
  assert.equal(visualResult.state["build-and-validate-record"].record.visual_label, "GENERATED VISUAL");
  assert.equal(runSkill(visual, {}, { live: true }).status, "FAIL");
  const demo = buildDemoSkill({ beats: [{ name: "aoi", receipt: "r1", new_work: "src/orchestrator.mjs" }] });
  assert.equal(runSkill(demo, {}).status, "PASS");
  assert.equal(runSkill(demo, {}, { live: true }).status, "FAIL");
  const badDemo = buildDemoSkill({ beats: [{ name: "aoi" }] });
  assert.equal(runSkill(badDemo, {}).status, "FAIL");
  const mock = mockRunSkill(visual, "plan a visual", {});
  assert.equal(mock.receipt.source, "mock");
});

check("briefing skill builds the AOI and a Spark prompt, and sends nothing", () => {
  const skill = buildBriefingSkill({
    telemetry: fixtureTelemetry(),
    receipt: { source: "fixture", generated_at: "2026-10-27T00:00:00Z" },
    maskRecord: null,
  });
  const result = runSkill(skill, {});
  assert.equal(result.status, "PASS", JSON.stringify(result.failures));
  assert.equal(result.state["make-aoi"].aoi.id, "AOI-32N-94E");
  assert.ok(result.state["build-spark-prompt"].prompt.includes("AOI-32N-94E"));
});

console.log(`${n}/14 skill-agent tests PASS`);
