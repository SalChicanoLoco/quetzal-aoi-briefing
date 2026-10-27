// Testing + Debug Agent Framework — Quetzal AOI Briefing
// What it is: a read-only diagnostic agent. It runs the checker,
// classifies every failure, and writes a debug report with a
// suggested fix. It NEVER edits code, never waives a rule, and
// never commits. A human (Salvador, final approver) applies fixes.
// What it is not: an auto-fixer, a rule waiver, or a live-run
// substitute. Live runs are measured separately, not hidden.
//
// Usage:
//   node test/debug-agent.mjs                 # run + report to stdout
//   node test/debug-agent.mjs --report <path> # also write JSON report
//   node test/debug-agent.mjs --dir <path>    # run checker in that dir
//   node test/debug-agent.mjs --single <file> # run one test file only
import { execSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  if (i + 1 >= args.length) {
    console.error(`debug-agent: ${flag} needs a value`);
    process.exit(2);
  }
  return args[i + 1];
}
const dir = argVal("--dir") ?? process.cwd();
const reportPath = argVal("--report");
const single = argVal("--single");

function classify(line) {
  if (/syntax/.test(line)) return { category: "syntax", severity: "block", fix: "Fix the syntax error in the named file; re-run node --check on it." };
  if (/rules-check/.test(line)) return { category: "rules", severity: "block", fix: "Read docs/RULES_ADHERENCE_AGENT.md for the failing gate; do not waive it." };
  if (/lint/.test(line)) {
    const fixes = [];
    if (/var/.test(line)) fixes.push("Replace var with const/let");
    if (/loose/.test(line)) fixes.push("Replace loose equality with strict equality");
    if (/TODO/.test(line)) fixes.push("Resolve or remove the open TODO");
    if (/secret/.test(line)) fixes.push("Remove the secret pattern; rotate the credential if it was real");
    if (/console\.log/.test(line)) fixes.push("Remove logging from the library file; keep it in the CLI entry only");
    return { category: "lint", severity: "block", fix: (fixes.join("; ") || "Fix the lint violation in the named file") + "." };
  }
  if (/test /.test(line)) return { category: "test", severity: "block", fix: "Read the test output below, fix the code or the fixture (not both silently), and re-run that test file alone." };
  return { category: "unknown", severity: "block", fix: "Read the full output; classify by hand before fixing." };
}

let output = "";
let exitCode = 0;
if (single) {
  const r = spawnSync("node", [single], { cwd: dir, encoding: "utf8" });
  output = (r.stdout || "") + (r.stderr || "");
  if (r.error) output += String(r.error);
  exitCode = r.status ?? 1;
} else {
  try {
    output = execSync("node test/check.mjs", { cwd: dir, encoding: "utf8" });
  } catch (e) {
    output = (e.stdout || "") + (e.stderr || "");
    exitCode = 1;
  }
}

const failures = [];
for (const line of output.split("\n")) {
  if (!line.startsWith("FAIL")) continue;
  const c = classify(line);
  failures.push({ line, ...c });
}

const passed = (output.match(/^PASS /gm) || []).length;
// exitCode is the checker's own verdict, not decoration: a test file
// can crash (assertion, syntax) without printing a FAIL line, and
// parsing FAIL lines alone would then report a vacuous PASS. A
// nonzero checker exit is a failure even when no FAIL line exists.
const checkerExitCode = exitCode;
const report = {
  generated_at: new Date().toISOString(),
  dir,
  mode: single ? `single:${single}` : "full-check",
  passed,
  failures: failures.length,
  exit_code: checkerExitCode,
  status: failures.length === 0 && checkerExitCode === 0 ? "PASS" : "FAIL",
  items: failures,
  agent_rule: "read-only: this agent diagnoses only, it does not edit, commit, or waive rules",
};

console.log(JSON.stringify(report, null, 2));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
process.exit(report.status === "PASS" ? 0 : 1);
