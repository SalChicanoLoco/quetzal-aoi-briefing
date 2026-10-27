// Skill-agent — Quetzal AOI Briefing, hackathon-built, Oct 27, 2026.
// Local only, not pushed. For Salvador + Agent One to check.
//
// One skill-carrying agent. A skill is a definition, not a guess:
//   { name, role, steps, validator, allowedTools }
// Each step executes in order, in code, with an explicit receipt.
// A step that cannot be verified FAILS and stops the run:
// unverified is FAIL, never a warning, never a silent skip.
// The shared validator in src/base-agent.mjs is reused wherever a
// role exists there; it is not duplicated here. The SAM role has
// no base-agent role, so its prompt definition lives here and its
// validation reuses src/sam-bridge.mjs. Visual and demo roles are
// prompt definitions + mock runs only: any live request for them
// FAILS closed, and no live Spark run is ever made for them here.
//
// No keys in this file or repo. No live Meta call is made by this
// module: SAM/Spark/Image calls run on the owner's machine with
// their own key, and their results are handed to a skill as step
// input data, never invented by a step. Callers must not put an
// expected result in a skill prompt context; a test harness holds
// expected values and compares after the run. That separation is
// what makes a reproduction blind.

import {
  ROLES,
  buildAgentPrompt,
  validateAgentOutput,
  mockRun,
} from "./base-agent.mjs";
import { validateBriefing } from "./labels.mjs";
import { validateSamResult, buildMaskRecord } from "./sam-bridge.mjs";
import {
  buildSparkPrompt,
  validateSparkBriefing,
} from "./spark-briefing.mjs";
import {
  buildGeneratedVisualPrompt,
  buildVisualRecord,
  validateVisualRecord,
} from "./generated-visual.mjs";
import { makeAOI } from "./orchestrator.mjs";
import { boxToPolygon, boxCentroid, validateGisGeoJson } from "./gis-export.mjs";

// SAM has no role in src/base-agent.mjs. Its prompt definition is
// here, and only here, so the SAM skill still carries a role
// instruction without inventing a base-agent role.
export const SAM_ROLE = {
  system:
    "You are the Quetzal SAM agent. You validate a hosted SAM result and turn its box into a COMPUTED MASK record. You never invent a box, a mask, or a pixel count.",
  output:
    "A mask record: COMPUTED MASK, model, prompt, image source, box, mask pixels, receipt. No claim the mask is measured data.",
};

export function getRoleDefinition(role) {
  if (role === "sam") return SAM_ROLE;
  if (ROLES[role]) return ROLES[role];
  throw new Error(`unknown skill role: ${role}`);
}

export function validateSkillDefinition(skill) {
  const failures = [];
  if (!skill || typeof skill !== "object") return ["skill is not an object"];
  if (typeof skill.name !== "string" || skill.name.length === 0) {
    failures.push("skill is missing a name");
  }
  if (typeof skill.role !== "string" || !(skill.role === "sam" || ROLES[skill.role])) {
    failures.push(`skill role is unknown: ${JSON.stringify(skill.role)}`);
  }
  if (!Array.isArray(skill.allowedTools)) {
    failures.push("skill is missing allowedTools (an array, possibly empty)");
  }
  if (!Array.isArray(skill.steps) || skill.steps.length === 0) {
    failures.push("skill has no steps");
  } else {
    const seen = new Set();
    for (const step of skill.steps) {
      if (!step || typeof step.id !== "string" || step.id.length === 0) {
        failures.push("a step is missing an id");
        continue;
      }
      if (seen.has(step.id)) failures.push(`duplicate step id: ${step.id}`);
      seen.add(step.id);
      if (typeof step.run !== "function") failures.push(`step ${step.id} has no run function`);
      if (step.validator !== undefined && typeof step.validator !== "function") {
        failures.push(`step ${step.id} validator is not a function`);
      }
      if (step.tools !== undefined && !Array.isArray(step.tools)) {
        failures.push(`step ${step.id} tools is not an array`);
      }
    }
  }
  if (skill.validator !== undefined && typeof skill.validator !== "function") {
    failures.push("skill validator is not a function");
  }
  return failures;
}

// Build the prompt a skill-carrying agent is given. The prompt
// carries the task, the role instruction, the step list, the
// allowed tools, and ONLY the context the caller supplied.
// Expected results must never be in that context.
export function buildSkillPrompt(skill, task, context = {}) {
  const definitionFailures = validateSkillDefinition(skill);
  if (definitionFailures.length > 0) {
    throw new Error(`invalid skill definition: ${definitionFailures.join("; ")}`);
  }
  const role = getRoleDefinition(skill.role);
  const lines = [
    role.system,
    role.output,
    "Use ONLY the numbers and facts in the context below. Do not invent a number, probability, depth, location, or receipt.",
    "This is NOT a prediction: never say an event will occur at a specific time.",
    `Skill: ${skill.name}`,
    `Steps, in order: ${skill.steps.map((s) => s.id).join(", ")}`,
    `Allowed tools: ${skill.allowedTools.join(", ") || "(none)"}`,
    "",
    `Task: ${task}`,
    `Context: ${JSON.stringify(context)}`,
  ];
  return lines.join("\n");
}

function stepReceipt(step, status, failures, output) {
  const summary =
    output && typeof output.summary === "string" ? output.summary : null;
  return {
    step_id: step.id,
    step_name: step.name || step.id,
    status,
    failures: [...failures],
    tools_used: [...(step.tools || [])],
    generated_at: new Date().toISOString(),
    output_keys: output && typeof output === "object" ? Object.keys(output) : [],
    ...(summary ? { output_summary: summary } : {}),
  };
}

// Execute a skill. Returns a result object, never throws for a
// failed step: a failed step ends the run with status FAIL and
// the receipts gathered so far. Live requests for visual/demo
// roles fail closed before any step runs.
export function runSkill(skill, context = {}, options = {}) {
  const definitionFailures = validateSkillDefinition(skill);
  if (definitionFailures.length > 0) {
    return {
      skill: skill && skill.name ? skill.name : null,
      role: skill && skill.role ? skill.role : null,
      status: "FAIL",
      failures: definitionFailures,
      receipts: [],
      state: {},
    };
  }
  if ((skill.role === "visual" || skill.role === "demo") && options.live === true) {
    return {
      skill: skill.name,
      role: skill.role,
      status: "FAIL",
      failures: [`${skill.role} roles are prompt definitions + mock runs only; a live run is not allowed`],
      receipts: [],
      state: {},
    };
  }
  const allowed = new Set(skill.allowedTools);
  const receipts = [];
  const state = {};
  const failures = [];
  for (const step of skill.steps) {
    const tools = step.tools || [];
    const disallowed = tools.filter((t) => !allowed.has(t));
    if (disallowed.length > 0) {
      const msg = `step ${step.id} uses disallowed tools: ${disallowed.join(", ")}`;
      failures.push(msg);
      receipts.push(stepReceipt(step, "FAIL", [msg], null));
      break;
    }
    let output;
    try {
      output = step.run(context, state);
    } catch (err) {
      const msg = `step ${step.id} threw: ${err.message}`;
      failures.push(msg);
      receipts.push(stepReceipt(step, "FAIL", [msg], null));
      break;
    }
    if (output === null || output === undefined) {
      const msg = `step ${step.id} returned no result — unverified, FAIL`;
      failures.push(msg);
      receipts.push(stepReceipt(step, "FAIL", [msg], null));
      break;
    }
    state[step.id] = output;
    const stepFailures = step.validator ? step.validator(output, context, state) : [];
    if (stepFailures.length > 0) {
      failures.push(...stepFailures);
      receipts.push(stepReceipt(step, "FAIL", stepFailures, output));
      break;
    }
    receipts.push(stepReceipt(step, "PASS", [], output));
  }
  if (failures.length === 0 && skill.validator) {
    const globalFailures = skill.validator(state, context);
    failures.push(...globalFailures);
  }
  // Shared base-agent validator, reused for roles that have one,
  // when the final state carries agent output text. SAM has no
  // base-agent role, so it is checked by the SAM bridge instead.
  if (failures.length === 0 && skill.role !== "sam" && typeof state.output_text === "string") {
    const shared = validateAgentOutput(skill.role, state.output_text, context);
    failures.push(...shared);
  }
  return {
    skill: skill.name,
    role: skill.role,
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
    receipts,
    state,
  };
}

// Mock run for a skill: prompt definition + mockRun only, labelled
// mock, never live. Used for visual/demo, and as the dry-run shape
// for any role. It does not execute the skill's steps.
export function mockRunSkill(skill, task, context = {}) {
  const definitionFailures = validateSkillDefinition(skill);
  if (definitionFailures.length > 0) {
    throw new Error(`invalid skill definition: ${definitionFailures.join("; ")}`);
  }
  if (skill.role === "sam") {
    return {
      role: "sam",
      text: `Mock sam run: task "${task}" received, context recorded, no live call made.`,
      receipt: { source: "mock", generated_at: new Date().toISOString() },
    };
  }
  return mockRun(skill.role, task, context);
}

// --- Skill factories -------------------------------------------------
// Each factory wires real, already-tested modules as steps. A step
// receives only the input data the caller hands it; it never calls
// a Meta model and never invents a result.

// SAM skill: validate a supplied hosted SAM result, build its mask
// record, and project its box. samResult may be null only to prove
// the fail-closed path: the first step then FAILS, no mask is made.
export function buildSamSkill({ aoi, samResult, image, imageSource }) {
  return {
    name: "sam-mask",
    role: "sam",
    allowedTools: ["sam-bridge", "gis-export"],
    steps: [
      {
        id: "validate-sam-result",
        name: "Validate the supplied SAM result",
        tools: ["sam-bridge"],
        run: () => {
          const failures = validateSamResult({
            ...(samResult || {}),
            image_source: imageSource || (samResult && samResult.image_source) || "",
          });
          return {
            failures,
            summary: failures.length === 0 ? "SAM result shape valid" : "SAM result shape invalid",
          };
        },
        validator: (output) => output.failures,
      },
      {
        id: "build-mask-record",
        name: "Build the COMPUTED MASK record",
        tools: ["sam-bridge"],
        run: () => {
          const record = buildMaskRecord(aoi, {
            ...samResult,
            image_source: imageSource || samResult.image_source,
          });
          return { record, summary: `mask record for ${record.aoi_id}, ${record.mask_pixels} pixels` };
        },
      },
      {
        id: "project-mask",
        name: "Project the mask box to lon/lat",
        tools: ["gis-export"],
        run: () => {
          const polygon = boxToPolygon(samResult.box, image);
          const centroid = boxCentroid(samResult.box, image);
          return { polygon, centroid, summary: "mask box projected to EPSG:4326" };
        },
        validator: (output) => {
          const bad = output.polygon.some(
            ([lon, lat]) => lon < -180 || lon > 180 || lat < -90 || lat > 90,
          );
          return bad ? ["projected mask polygon is out of range"] : [];
        },
      },
    ],
  };
}

// Tester skill: run the label gate, the Spark briefing validator,
// and the GIS validator over artefacts the caller supplies. A
// tester reports failures; a step fails only if its report is
// malformed, not because the artefact under test failed.
export function buildTesterSkill({ briefing, briefingText, aoi, receipt, maskRecord, geoJson, image }) {
  return {
    name: "tester",
    role: "tester",
    allowedTools: ["label-gate", "spark-validator", "gis-validator"],
    steps: [
      {
        id: "label-gate",
        name: "Run the label and receipt gate",
        tools: ["label-gate"],
        run: () => ({ failures: validateBriefing(briefing), summary: "label gate run" }),
        validator: (output) => (Array.isArray(output.failures) ? [] : ["label gate report is malformed"]),
      },
      {
        id: "spark-validator",
        name: "Run the Spark briefing validator",
        tools: ["spark-validator"],
        run: () => ({
          failures: validateSparkBriefing(briefingText, aoi, receipt, maskRecord),
          summary: "Spark briefing validator run",
        }),
        validator: (output) => (Array.isArray(output.failures) ? [] : ["Spark validator report is malformed"]),
      },
      {
        id: "gis-validator",
        name: "Run the GIS GeoJSON validator",
        tools: ["gis-validator"],
        run: () => ({
          failures: validateGisGeoJson(geoJson, image),
          summary: "GIS validator run",
        }),
        validator: (output) => (Array.isArray(output.failures) ? [] : ["GIS validator report is malformed"]),
      },
    ],
  };
}

// Debug skill: classify a supplied failure report and give one
// next step. Classification is a fixed mapping over the report
// text; it adds no number that is not in the report.
export function buildDebugSkill({ failureReport }) {
  return {
    name: "debug",
    role: "debug",
    allowedTools: [],
    steps: [
      {
        id: "classify",
        name: "Classify the failure report",
        run: () => {
          const text = String(failureReport || "");
          let category = "unclassified";
          if (/timeout|abort/i.test(text)) category = "timeout";
          else if (/secret|key|token/i.test(text)) category = "secret-scan";
          else if (/prediction/i.test(text)) category = "label-gate";
          else if (/mask|box|pixel/i.test(text)) category = "sam-result";
          return { category, summary: `classified as ${category}` };
        },
        validator: (output) => (output.category ? [] : ["no category assigned"]),
      },
      {
        id: "next-step",
        name: "Give one next step",
        run: (_context, state) => {
          const next = {
            timeout: "Re-run with the 60s timeout and keep the receipt.",
            "secret-scan": "Remove the flagged pattern and re-run the rules check.",
            "label-gate": "Fix the labelled field and re-run the label gate.",
            "sam-result": "Re-check the SAM result shape and re-run the bridge validator.",
            unclassified: "Re-run the failing check and record its exact output.",
          }[state.classify.category];
          return { next_step: next, summary: "one next step given" };
        },
        validator: (output) => (output.next_step ? [] : ["no next step given"]),
      },
    ],
  };
}

// Visual skill: prompt definition + mock only. Builds the
// generated-visual prompt and record, validates the record.
// No live image call is made, and a live request fails closed
// in runSkill before any step runs.
export function buildVisualSkill({ aoi, file, receipt }) {
  return {
    name: "visual",
    role: "visual",
    allowedTools: ["visual-contract"],
    steps: [
      {
        id: "build-prompt",
        name: "Build the generated-visual prompt",
        tools: ["visual-contract"],
        run: () => {
          const prompt = buildGeneratedVisualPrompt(aoi);
          return { prompt, summary: "generated-visual prompt built" };
        },
        validator: (output) => (output.prompt ? [] : ["visual prompt is empty"]),
      },
      {
        id: "build-and-validate-record",
        name: "Build and validate the visual record",
        tools: ["visual-contract"],
        run: (_context, state) => {
          const record = buildVisualRecord({
            aoi,
            model: "muse-image-1.0",
            prompt: state["build-prompt"].prompt,
            file,
            receipt,
          });
          return { record, failures: validateVisualRecord(record), summary: "visual record built" };
        },
        validator: (output) => output.failures,
      },
    ],
  };
}

// Demo skill: prompt definition + mock only. Each beat must carry
// a receipt and a new-work mapping, or the skill fails closed.
// No live call, no video is produced here.
export function buildDemoSkill({ beats }) {
  return {
    name: "demo",
    role: "demo",
    allowedTools: [],
    steps: [
      {
        id: "check-beats",
        name: "Check every demo beat has a receipt and a new-work mapping",
        run: () => {
          const failures = [];
          if (!Array.isArray(beats) || beats.length === 0) failures.push("demo has no beats");
          for (const beat of beats || []) {
            if (!beat.receipt) failures.push(`beat ${beat.name || "?"} has no receipt`);
            if (!beat.new_work) failures.push(`beat ${beat.name || "?"} has no new-work mapping`);
          }
          return { beats: beats || [], failures, summary: `${(beats || []).length} demo beats checked` };
        },
        validator: (output) => output.failures,
      },
    ],
  };
}

// Briefing skill: the orchestrator AOI step plus the Spark prompt
// builder, as one explicit step graph. The Spark prompt is built,
// never sent, by this module.
export function buildBriefingSkill({ telemetry, receipt, maskRecord }) {
  return {
    name: "briefing",
    role: "briefing",
    allowedTools: ["orchestrator", "spark-prompt"],
    steps: [
      {
        id: "make-aoi",
        name: "Generate the AOI from telemetry",
        tools: ["orchestrator"],
        run: () => {
          const aoi = makeAOI(telemetry);
          return {
            aoi,
            summary: `${aoi.id}, ${aoi.events_used} events, max ${aoi.max_magnitude}`,
          };
        },
        validator: (output) =>
          output.aoi && Array.isArray(output.aoi.polygon) && output.aoi.polygon.length === 5
            ? []
            : ["AOI polygon is not a closed 5-point ring"],
      },
      {
        id: "build-spark-prompt",
        name: "Build the Spark briefing prompt",
        tools: ["spark-prompt"],
        run: (_context, state) => {
          const prompt = buildSparkPrompt(state["make-aoi"].aoi, receipt, maskRecord || null);
          // Note: the prompt itself is not fed back through the
          // shared output validator — it quotes the disclaimer
          // wording, which is instruction text, not a briefing.
          return { prompt, summary: "Spark briefing prompt built, not sent" };
        },
        validator: (output) => (output.prompt.includes("NOT a prediction") ? [] : ["Spark prompt lacks the prediction disclaimer"]),
      },
    ],
  };
}
