// One-command check: syntax, unit tests, rules scan, secret scan.
// Zero dependencies, Node 24 only. Fast by design: unit tests only,
// no live calls. Live runs are checked separately with --live.
// Usage: node test/check.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

function run(args, label) {
  try {
    execFileSync("node", args, { encoding: "utf8", stdio: "pipe" });
    console.log(`PASS ${label}`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label}`);
    console.log((e.stdout || "") + (e.stderr || ""));
    return false;
  }
}

let ok = true;
for (const f of readdirSync("src").filter((x) => x.endsWith(".mjs"))) {
  ok = run(["--check", `src/${f}`], `syntax src/${f}`) && ok;
}
for (const f of readdirSync("test").filter((x) => x.endsWith(".mjs") && x !== "check.mjs" && x !== "debug-agent.mjs")) {
  // debug-agent.mjs is a runner, not a unit test: running it inside
  // check.mjs would recurse (it runs check.mjs itself).
  ok = run([`test/${f}`], `test ${f}`) && ok;
}
ok = run(["test/rules-check.mjs"], "rules-check") && ok;

// Strict, dependency-free lint: no var, no ==/!= (loose), no TODO,
// no secret patterns in src/test. CLI console.log in orchestrator
// main is allowed; library files must not log.
const secretRe = /(api_key|bearer\s+[A-Za-z0-9]|sk-[A-Za-z0-9]{8,})/i;
for (const dir of ["src", "test"]) {
  // check.mjs and debug-agent.mjs are excluded: they contain the
  // lint patterns themselves as detection/fix strings, not as
  // violations in shipped code.
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs") && x !== "check.mjs" && x !== "debug-agent.mjs")) {
    const text = readFileSync(`${dir}/${f}`, "utf8");
    const bad = [];
    if (/\bvar\s/.test(text)) bad.push("var");
    if (/(?<![=!])==(?!=)/.test(text)) bad.push("loose ==");
    if (/TODO|FIXME/.test(text)) bad.push("TODO/FIXME");
    if (secretRe.test(text)) bad.push("possible secret pattern");
    if (dir === "src" && !["orchestrator.mjs", "e2e.mjs"].includes(f) && /console\.log/.test(text)) bad.push("console.log in library");
    console.log(`${bad.length ? "FAIL" : "PASS"} lint ${dir}/${f}${bad.length ? ` — ${bad.join(", ")}` : ""}`);
    if (bad.length) ok = false;
  }
}

console.log(ok ? "CHECK PASS" : "CHECK FAIL");
process.exit(ok ? 0 : 1);
