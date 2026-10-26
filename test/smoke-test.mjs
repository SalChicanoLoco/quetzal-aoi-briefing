// Mock smoke test for src/orchestrator.mjs
// Runs the skeleton and checks the shape of its output.
// Mock only — it does not verify any live Meta Model API call.
import { execSync } from "node:child_process";
const out = execSync("node src/orchestrator.mjs", { encoding: "utf8" });
const checks = [
  ["AOI-MOCK present", out.includes("AOI-MOCK")],
  ["measured label present", out.includes("measured")],
  ["computed label present", out.includes("computed")],
  ["inferred label present", out.includes("inferred")],
  ["receipt source mock", out.includes('"source": "mock"')],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("Mock smoke test PASS");
