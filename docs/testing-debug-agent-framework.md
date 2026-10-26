# Testing + Debug Agent Framework — setup, local only

Status: SET UP locally, NOT pushed. Held with the check scaffold
until Salvador approves a push or a new teammate owns it.

## Pieces
1. `starter/test/check.mjs` — the checker (already built, CHECK PASS 1.7s)
   Syntax + all unit tests + rules scan + strict lint, zero deps.
2. `starter/test/debug-agent.mjs` — the debug agent (new, this setup)
   Read-only diagnostic layer on top of the checker:
   - Runs `check.mjs` (or one test file with `--single`)
   - Classifies every FAIL line: syntax / test / rules / lint
     (var, loose ==, TODO, secret pattern, console.log in library)
   - Gives a suggested fix per failure, with severity "block"
   - Writes a JSON report with `--report <path>`
   - NEVER edits code, never commits, never waives a rule.
     A human applies the fix; Salvador merges and overrules all.

## How a teammate uses it
```
node test/check.mjs                 # pass/fail, fast
node test/debug-agent.mjs           # classified report, stdout
node test/debug-agent.mjs --single test/sam-bridge.mjs
node test/debug-agent.mjs --report /tmp/debug.json
```
If the report says FAIL, fix the named file, re-run the single
test file, then re-run the full check. Do not fix the test and
the code in the same silent edit — say which one was wrong.

## Tested, Oct 26
- Clean repo: debug-agent PASS, 21 passed, 0 failures.
- Broken copy in /tmp (var + loose == appended to src/labels.mjs):
  correctly FAIL, 1 item, lint, fix "Replace var with const/let;
  Replace loose equality with strict equality."
- Bug found by testing it, fixed same day: the first version
  recursed forever because check.mjs ran debug-agent.mjs as a
  unit test, and debug-agent runs check.mjs. Fix: check.mjs
  excludes both runner files from its test loop and its lint
  loop (they contain the pattern strings as detection code).

## Meta-validation, Oct 26 — tool validating tool
- debug-agent on the repo: PASS, 21 passed, 0 failures.
- Syntax on both tools: node --check OK for check.mjs and
  debug-agent.mjs.
- Honest blind spot, found by trying: a var deliberately added
  to debug-agent.mjs in a /tmp copy was NOT caught, because
  check.mjs excludes the runner files from lint. The tool
  validates the repo, it does not fully validate itself.
- Single-mode on debug-agent itself gives a vacuous 0/0 PASS
  (it re-runs the agent and parses JSON, not PASS lines) —
  do not quote that as proof.
- Workaround, used Oct 26: an external grep scan of both
  runner files, read by a human. Every hit was a detection
  string, a regex, or a strict === comparison — no real var
  declaration, no loose equality, no open TODO in the tools
  themselves.

## What it does NOT do
- No auto-fix, no auto-commit, no auto-push.
- No live API calls. Live latency is measured separately
  (hour feed first for demo, day feed for full run, labelled
  mock fallback on timeout — Oct 26 live run hit 10s and fell
  back correctly, that is the bottleneck to measure, not hide).
- No secrets in reports. A secret-pattern failure says "remove
  it", it never prints the value.

## Ownership
- OPEN, held. Candidate if he joins: Idrissa Dicko
  (testing/refinement). See `newbie-check-scaffold.md` for the
  full work package this framework belongs to.
- Rofaida's visual work and Salvador's lead work are untouched
  by this framework; it only diagnoses their code when run.
