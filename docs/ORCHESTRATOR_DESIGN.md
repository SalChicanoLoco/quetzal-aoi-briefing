# Orchestrator design — the spine (Oct 27, 2026)

## Decision

The orchestrator is the single spine. Everything the demo shows runs
through `src/spine.mjs`, in one fixed order, with one ledger. If a step
is not in the spine, it is not in the demo.

## What the spine is

`src/spine.mjs` — `runSpine(input)`:

1. `telemetry` — `parseTelemetry` on a caller-supplied feed.
2. `aoi` — `makeAOI`, highest-energy 2° cell.
3. `label-gate` — `validateBriefing`, fail-closed.
4. `sam-validate` — `validateSamResult` + `buildMaskRecord` on a
   caller-supplied SAM result.
5. `gis-project` — `buildGisGeoJson` + `validateGisGeoJson`.
6. `spark-prompt` — `buildSparkPrompt`. Prompt only, never sent.
7. `visual-record` — `buildVisualRecord` + `validateVisualRecord`.
   Record only, never a call.

The spine makes no Meta call and no network call. Live results are
input data, supplied by the caller (the owner, on their machine, with
their key), exactly as skill-agent steps receive them. This keeps the
repo key-free and keeps a mock from ever looking live: a step with no
supplied result fails, it does not invent one.

## Route table, not a router

`ROUTES` in `src/spine.mjs` is a static table: fixed order, fixed
timeout (60s telemetry, 5s local), fixed retry budget. Costed routes
get retries: 0 — a retry is a second charge. Local routes get retries:
1 — a local retry costs $0. There is no heuristic scoring, no
weights, no history-based selection, no reordering, in this file.

## The ledger — the scored record a future router learns from

Every step attempted appends one ledger entry, in order:
`{ step, route, kind, status, attempts, latency_ms, cost_estimate_usd,
failures }`. The ledger is returned by `runSpine`, never thrown away
on failure. A future learning router reads this ledger; it does not
get to rewrite the spine's order. Until scored ledger data exists in
volume, any "learning router" claim is false, and the spine stays
static.

## SANGRE KV1 and kvrouter_v1 — brutal verdict, evidence-based

Do not import either into this repo. Do not call either a learning
router.

- **SANGRE KV1** (`sangre_kv.py`, 170 lines, Sept 22, 2026, read on
  the Mac): a persistent belief/knowledge store for perceptual
  entities — bbox history, 3 persistence tiers, Bayesian decay,
  snapshot/restore. It stores what was seen. It routes nothing and
  learns nothing. Useful, if ever, as a memory pattern for a
  perception store. Not a router.
- **kvrouter_v1** (`kvrouter_v1.py`, 467 lines, Sept 29, 2026, read
  in full): a clean static route-table dispatcher — `tool_name` ->
  `RouteSpec` -> http/mcp/model/function/queue, stdlib-only,
  fail-closed protected routes, JiT token cache. No heuristic
  scoring, no learning, no history, no weights, no adaptive
  selection, no fallback ranking. Model dispatch is a placeholder
  returning text; the queue target is unimplemented ("not yet
  activated"). It is a route-table pattern, and the spine's `ROUTES`
  is the JS equivalent of that pattern — nothing more. Porting its
  Python MCP dispatcher into the JS orchestrator would add a second
  dispatch layer, a language boundary, and unimplemented targets,
  for zero demo value. The learning/heuristic layer, if wanted,
  must be built new, on top of a route table, with scored outcomes
  recorded per route — which is exactly what the ledger is for.

Salvador's memory of KV1 as "a powerful heuristic, learning router"
is wrong on the evidence of the two files read. Corrected here, in
the repo, with file and line evidence, not argued in chat.

## Fail-closed rules

- First failing step stops the run. Later steps do not run.
- A timeout is a failure, not a fallback to mock. (The old
  orchestrator `--live` mock fallback is retained in
  `src/orchestrator.mjs` for its own smoke shape, labelled mock;
  the spine never falls back.)
- A missing input fails the step that needs it. No invented box,
  mask, number, or receipt.
- Retries never exceed the route's budget, and a retried step
  re-records its attempts in the ledger.

## Two entry points — the remaining smell

`src/e2e.mjs` remains the live-feed continuous runner and replay
harness. The spine is the demo/shoot-day entry point. That is two
entry points, and it is recorded as a smell, not hidden: after
Nov 4, fold e2e's live fetch into the spine or delete one of them.
For the demo, the spine is the one shown on screen.

## Agent capability, in one line each

- Briefing skill: capable in code (AOI + prompt, sends nothing);
  capable live only via the owner's Spark call + validator.
- SAM skill: capable in code on supplied results; live only via
  the owner's SAM call.
- Tester skill: capable now, $0, validators only.
- Debug skill: capable now, $0, fixed classification mapping —
  it classifies, it does not diagnose novel failures.
- Visual/demo skills: NOT capable live — prompt + mock only,
  fail closed. Cut from any live claim; demo shows the prompt
  and the record, never a live visual/demo run.
- Base-agent roles: prompt definitions + shared validator only.
  Tester role ran live via Spark once (Oct 26); briefing/visual/
  demo roles never ran live as agents. Do not claim otherwise.
- Checker / meta-checker / rules gate: capable now, $0. The
  meta-checker stripper is heuristic, not a parser — the ESLint
  draft (not installed, not run) is the follow-on, post-Nov 4.

## What is NOT in the spine, and why

- SAM video, Wonder, Voice Transcribe: untested, unclaimed, cut.
- Any learning router: no scored data yet, no learning claim.
- Forecast regimes / MCP wiring: Salvador's background work,
  not a demo blocker, not claimed as hackathon-built.
- KV1 / kvrouter imports: see verdict above.
