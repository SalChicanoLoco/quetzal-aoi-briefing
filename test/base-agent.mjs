// Base agent tests — role registry, prompt, validator, mock run.
import { strict as assert } from "node:assert";
import { ROLES, buildAgentPrompt, validateAgentOutput, mockRun } from "../src/base-agent.mjs";

let n = 0;
function check(name, fn) { fn(); n++; console.log(`PASS ${name}`); }

check("five roles registered", () => {
  assert.deepEqual(Object.keys(ROLES).sort(), ["briefing", "debug", "demo", "tester", "visual"]);
});
check("prompt contains task and context, and role system", () => {
  const p = buildAgentPrompt("tester", "Classify this failure", { checks_passed: 21 });
  assert.ok(p.includes("Classify this failure"));
  assert.ok(p.includes("21"));
  assert.ok(p.includes(ROLES.tester.system));
});
check("unknown role throws", () => {
  assert.throws(() => buildAgentPrompt("nope", "x"), /unknown role/);
});
check("validator fails prediction", () => {
  assert.ok(validateAgentOutput("briefing", "It will occur tomorrow.", {}).length > 0);
});
check("validator fails hallucinated magnitude", () => {
  assert.ok(validateAgentOutput("briefing", "Max M9.9 in the cell.", { max_magnitude: 5.5 }).length > 0);
});
check("validator passes clean output with correct magnitude", () => {
  assert.deepEqual(validateAgentOutput("briefing", "Cell with max M5.5 is worth more observation.", { max_magnitude: 5.5 }), []);
});
check("mock run is labelled mock, not live", () => {
  const r = mockRun("tester", "Classify this failure", {});
  assert.equal(r.receipt.source, "mock");
  assert.ok(r.text.includes("tester"));
});
console.log(`${n}/7 base-agent tests PASS`);
