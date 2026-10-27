// Debug-agent report contract: the JSON report must carry the
// checker's own exit code, and status must be FAIL when that exit
// code is nonzero — even when the output contains no FAIL line
// (a test file that crashes prints an assertion error, not FAIL).
// This is the regression test for the unused-exitCode blind spot:
// before the fix, a crashing single test reported a vacuous PASS.
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS debug-agent-report ${name}`);
}

function runAgent(dir, single) {
  const r = spawnSync("node", ["test/debug-agent.mjs", "--single", single], {
    cwd: dir,
    encoding: "utf8",
  });
  return { status: r.status, report: JSON.parse(r.stdout) };
}

const starter = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "debug-agent-report-"));
try {
  const passing = join(dir, "passing.mjs");
  writeFileSync(passing, "console.log('PASS ok');\n");
  const crashing = join(dir, "crashing.mjs");
  writeFileSync(crashing, "import assert from 'node:assert';\nassert.fail('boom, no FAIL line');\n");

  check("passing single test reports PASS with exit_code 0", () => {
    const { status, report } = runAgent(starter, passing);
    assert.equal(report.status, "PASS");
    assert.equal(report.exit_code, 0);
    assert.equal(status, 0);
    assert.equal(report.passed, 1);
  });

  check("crashing single test reports FAIL with nonzero exit_code", () => {
    const { status, report } = runAgent(starter, crashing);
    assert.equal(report.status, "FAIL");
    assert.notEqual(report.exit_code, 0);
    assert.notEqual(status, 0);
    assert.equal(report.failures, 0, "no FAIL line exists in crashing output — the exit code is the signal");
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`${passed}/2 debug-agent-report tests PASS`);
