// Meta-checker — the checker checking its own runners.
//
// test/check.mjs deliberately excludes its runner files (check.mjs,
// debug-agent.mjs) from its test/lint loops: they contain the lint
// patterns themselves as detection strings, and debug-agent runs
// check.mjs, so running them inside check.mjs would recurse. That
// exclusion was a documented blind spot: a real `var` added to a
// runner file was not caught. This file closes it.
//
// How: strip strings, regex literals, and comments from a runner
// file (a heuristic scanner, not a parser — documented limit), then
// run the same lint rules check.mjs runs on what is left: no var,
// no loose ==, no TODO/FIXME, no secret patterns. Comments are
// scanned separately for actionable TODO-colon / FIXME-colon
// only, so a real TODO in a comment is still caught while rule
// documentation that merely names the word TODO (as in check.mjs's
// own header) is not. Heuristic, documented as such: a TODO without
// a colon or dash after it is not flagged here.
// Each runner file must also still contain its detection strings in
// the original text (the allowlist): a scan that passes on an empty
// or gutted file is not a pass.
//
// This file is excluded from check.mjs's lint loop for the same
// reason the other runners are: it contains the patterns as
// fixtures. It is linted by itself, in the checks below.
// Zero dependencies, Node 24 only. No live calls.
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SECRET_RE = /(api_key|bearer\s+[A-Za-z0-9]|sk-[A-Za-z0-9]{8,})/i;
const LOOSE_EQ_RE = /(?<![=!])==(?!=)/;
const RUNNER_FILES = ["check.mjs", "debug-agent.mjs", "meta-check.mjs"];

// Strip strings, regex literals, and comments. Returns the code
// that is left plus the comment text, scanned separately.
export function stripCode(text) {
  let code = "";
  let comments = "";
  let i = 0;
  let prevSig = ""; // last significant character, for regex detection
  const isRegexStart = () => {
    if (prevSig === "") return true;
    if ("([,=:[!&|?{};".includes(prevSig)) return true;
    return false;
  };
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1] ?? "";
    if (ch === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      comments += text.slice(i, end === -1 ? text.length : end) + "\n";
      i = end === -1 ? text.length : end;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      comments += text.slice(i, stop) + "\n";
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i] === quote) { i += 1; break; }
        i += 1;
      }
      code += " ";
      prevSig = "x";
      continue;
    }
    if (ch === "/" && isRegexStart()) {
      // Regex literal: scan to the closing slash, honouring escapes
      // and character classes (a slash inside [...] does not end it).
      i += 1;
      let inClass = false;
      while (i < text.length) {
        const c = text[i];
        if (c === "\\") { i += 2; continue; }
        if (c === "[") inClass = true;
        if (c === "]") inClass = false;
        if (c === "/" && !inClass) break;
        if (c === "\n") break;
        i += 1;
      }
      while (i < text.length && /[a-z]/i.test(text[i])) i += 1;
      code += " ";
      prevSig = "x";
      continue;
    }
    code += ch;
    if (!/\s/.test(ch)) {
      // Track the previous word for keyword-based regex detection
      // only loosely: a slash after `return` etc. is handled by the
      // character rule above for the files in this repo.
      prevSig = ch;
    }
    i += 1;
  }
  return { code, comments };
}

export function scanRunnerText(text) {
  const failures = [];
  const { code, comments } = stripCode(text);
  if (/\bvar\s/.test(code)) failures.push("var declaration in runner code");
  if (LOOSE_EQ_RE.test(code)) failures.push("loose == in runner code");
  if (SECRET_RE.test(code)) failures.push("possible secret pattern in runner code");
  if (/TODO\s*:|TODO\s+-\s|FIXME\s*:|FIXME\s+-\s/.test(comments)) failures.push("TODO/FIXME in runner comment");
  if (/TODO|FIXME/.test(code)) failures.push("TODO/FIXME in runner code");
  return failures;
}

export function checkRunnerFile(path) {
  const text = readFileSync(path, "utf8");
  const failures = scanRunnerText(text);
  // Allowlist / positive control: the file must still carry its
  // detection strings. A gutted runner that scans clean is a FAIL.
  const hasDetection = /var|TODO|secret/i.test(text);
  if (!hasDetection) failures.push("runner file has no detection strings (allowlist empty)");
  if (text.trim().length < 100) failures.push("runner file suspiciously short");
  return failures;
}

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS meta-check ${name}`);
}

const here = dirname(fileURLToPath(import.meta.url));

check("real runner files scan clean", () => {
  for (const f of RUNNER_FILES) {
    const failures = checkRunnerFile(join(here, f));
    assert.deepEqual(failures, [], `${f}: ${failures.join("; ")}`);
  }
});

check("real var declaration is caught", () => {
  const failures = scanRunnerText("const a = 1;\nvar b = 2;\n");
  assert.ok(failures.some((f) => f.includes("var")), JSON.stringify(failures));
});

check("detection strings and regexes are not false positives", () => {
  assert.deepEqual(scanRunnerText('const re = /\\bvar\\s/;\nconst fix = "Replace var with const";\n'), []);
  assert.deepEqual(scanRunnerText("const s = 'a == b in a string';\n"), []);
  assert.deepEqual(scanRunnerText("const t = `template var == text`;\n"), []);
});

check("loose equality and comment TODO are caught, strict is not", () => {
  assert.ok(scanRunnerText("if (a == b) {}\n").some((f) => f.includes("loose")));
  assert.deepEqual(scanRunnerText("if (a === b) {}\n"), []);
  assert.ok(scanRunnerText("// TODO: fix this later\nconst a = 1;\n").some((f) => f.includes("TODO")));
});

check("injected violation in a runner copy is caught, naming the file", () => {
  const dir = mkdtempSync(join(tmpdir(), "meta-check-"));
  try {
    const copy = join(dir, "check.mjs");
    writeFileSync(copy, readFileSync(join(here, "check.mjs"), "utf8") + "\nvar injected = 1;\n");
    const failures = checkRunnerFile(copy);
    assert.ok(failures.some((f) => f.includes("var")), JSON.stringify(failures));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check("runner files pass node --check", () => {
  for (const f of RUNNER_FILES) {
    execFileSync("node", ["--check", join(here, f)], { encoding: "utf8" });
  }
});

console.log(`${passed}/6 meta-check tests PASS`);
