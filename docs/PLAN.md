# Quetzal AOI Briefing — plan, Oct 26 to Nov 4, 2026

Track: Startup. Problem statement: Push the Frontier.
Demo scope: Quetzal-tools-only orchestration. Forecast regimes are
Salvador's background wiring, not a blocker, and not claimed as hackathon-built.

State at HEAD `975fb91` (Oct 27): Steps 2–7 built and pushed,
skill-agent + blind reproduction built and pushed, GIS/KML/viewer
pushed, meta-checker pushed, labels prediction-gate tightening
pushed, demo script approved and pushed, logged-out repo check
done Oct 27. Fresh-clone CHECK PASS. What remains: orchestration
spine (this refactor), shoot-day fresh live run, demo video,
packaging, submission.

## 1. Orchestration first — the single spine

`src/spine.mjs` is the single entry point for the demo. One fixed
order, one ledger, fail-closed gates, per-step timeout and retry
budget. Design and verdicts in `docs/ORCHESTRATOR_DESIGN.md`
(SANGRE KV1 is a belief store and kvrouter_v1 is a static route
table — neither is a learning router, neither is imported). `src/e2e.mjs` remains the live-feed replay harness; the
spine is what the demo shows. After Nov 4, fold one into the other.

Agent capability, honestly, at HEAD:

- Capable now ($0): tester skill (validators), debug skill
  (fixed classification), checker, meta-checker, rules gate.
- Capable in code, live only via the owner's call: briefing skill
  (AOI + prompt, sends nothing), SAM skill (supplied results).
- NOT capable live, CUT from any live claim: visual and demo
  skills (prompt + mock only, fail closed), base-agent visual/demo
  roles (prompt definitions only). The demo shows their prompts
  and records, never a live run.
- Tester role ran live via Spark once (Oct 26). Briefing, visual,
  and demo roles never ran live as agents. Do not claim otherwise.

## 2. The demo in one paragraph

Live seismic telemetry in, automated area of interest out, SAM visual
for a human reader, Spark briefing with labels and a receipt.
Every number labelled measured / computed / inferred.
Nothing in the demo is presented as a deterministic prediction.

## 3. Milestones — true state

### Done: Mon Oct 26 — Kickoff, scope freeze, Steps 2–7

Repo live, Spark + Image + SAM image smoke tests PASS, Nagqu
discrete snow mask PASS (2197 px), AOI-scale SAM 0 masks recorded
honestly, scope freeze (Spark, Image, hosted SAM image only),
Steps 2–7 pushed, full check PASS. Solo startup: TEAM.md deleted.

### Done: Tue Oct 27 — Agents, GIS, gates, script, spine

Skill-agent + blind reproduction pushed; fresh-clone fix + KML +
Leaflet viewer pushed; meta-checker + debug-agent exit-code fix
pushed; labels prediction-gate tightening pushed; demo script
approved and pushed (shoot-day wording, opening line crediting
pre-existing Quetzal); logged-out repo check PASS; orchestration
spine + design doc + credit plan (this refactor).

### Wed Oct 28 — Agents 102, no rebuild

Session: Agents 102, 12:00 PM ET. No new features. Verify the
spine in a fresh clone; fix only what the spine test proves broken.

### Thu Oct 29 — Visual bridge, already built

SAM mask + Image visual integrated, sources labelled. No new
visual work unless the shoot-day run proves a leg broken.

### Fri Oct 30 — Partner check, only if time

Session: Fireworks, 12:00 PM ET. Baseten / Modal / Fireworks
only as stretch. Core must still work without them.

### Sat Oct 31 — Demo video v1 (target)

3-minute video, hackathon-built features only. Numbers only from
the shoot-day receipt. Salvador's human voiceover.

### Sun Nov 1 — No new features after this date

Fix only what breaks the demo. No new features after Nov 1.
This date is the feature freeze, not the first full run — the
full run happens on the shoot day, with receipts.

### Mon Nov 2 — Hardening + Codex, separate track

Hardening, no new features. Codex x TwitchCon submission
deadline 3:00 PM MST, separate track, time-boxed; it must not
eat Meta hardening time. Aspen appointment 1:30 PM MST.

### Tue Nov 3 — Packaging

Repo clean, README, NEW_IN_HACKATHON.md, demo video link, all
public and accessible. Logged-out check repeated at packaging.

### Wed Nov 4 — Submit early

Submit via the CV platform by 9:00 PM ET. Target: noon ET, not
at the deadline. Judging Nov 5–8, closing Nov 9, community
vote winner Nov 16.

## 4. Judging — weights conflict, unresolved

Participant guide (pasted by Salvador): Impact 30%, Meta tooling
25%, Demo 25%, Technical depth 20%. A Discord snapshot summary
described scoring as equal across the four criteria. The conflict
is UNRESOLVED — do not replace the guide weights without
organizer clarification, and do not present equal weighting as
the rule. The demo script is built to hit all four either way:
impact (civil hazard use), Meta tooling (Spark + SAM + Image
with receipts), demo (working live run), technical depth
(labelled, receipted, verifiable orchestration).

## 5. Credit budget — two buckets, do not confuse them

Meta Model API credits: ~$149.85 remaining ($0.00 spend Oct 21–27).
The 67% figure is Muse subscription usage, NOT Meta credits —
that bucket is the binding constraint. No refill assumed for
either. Full plan: `docs/CREDIT_PLAN.md`.
Lean shoot-day run: $0.042 nominal, $0.084 with the 2x buffer
(rates unverified, secondary sources only). Hard stop: $10 Meta
floor, two-failure rule, count tokens/frames before every call.
Muse efficiency: fewer, larger batches, local $0 work first, no
redundant re-reads or re-runs, no live call until fully verified
locally.

## 6. What we will not do

- No deterministic prediction claims, ever.
- No contributor models for proprietary work.
- No keys, tokens, or secrets in the repo, in Discord, or in chat.
- No new features after Nov 1.
- No claiming mock, generated, or pre-existing work as live, measured, or hackathon-built.
- No SAM video, Wonder, or Voice Transcribe claim — untested, cut.
- No learning-router claim — no scored ledger data yet; the
  spine stays static and the ledger is what a future router
  would learn from.
