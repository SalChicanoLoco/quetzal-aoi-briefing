# What was built during the hackathon

Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026.
Startup track, Push the Frontier.

This file is the new-work record judges are asked to check. Anything not listed here as hackathon-built is not claimed as hackathon-built.

## Built during the hackathon (in this repository)

- This repository itself, created Oct 26, 2026, as a clean public submission repo.
- `README.md` and this file — the project description and new-work record.
- `src/orchestrator.mjs` — the orchestration skeleton: mock telemetry in, labelled AOI briefing out, with receipt fields.
- The labelling/receipt discipline as implemented in this skeleton: measured / computed / inferred, with receipt attached to every briefing.
- The human visual bridge concept as implemented here: machine AOI output rendered for a human reader via SAM segmentation, without repainting the mask.
- The briefing template and demo script, as they are added to this repository during the hackathon period.
- `docs/PLAN.md`, `docs/API.md`, `docs/TEAM.md`, `docs/smoke-test-checklist.md`, `test/smoke-test.mjs` — plan, API inventory, team onboarding, smoke checklist, and mock smoke test, all built Oct 26, 2026.
- `docs/RULES_ADHERENCE_AGENT.md`, `test/rules-check.mjs` — Rules Adherence Agent and pre-commit scan, built Oct 26, 2026. The agent gates every commit, demo, and submission against disqualification risks (new-work-only, Meta tooling, secrets, false claims, label discipline); scan PASS on first run, 10 files scanned.
- Live smoke tests Oct 26: Muse Spark 1.3 and Muse Image 1.0, with receipts recorded in `docs/API.md`. SAM hosted smoke test is not yet run and is not claimed.

## Predates the hackathon (not claimed as hackathon-built)

- The underlying Quetzal geophysics system, including its forecast regimes and telemetry work. Salvador's background wiring of those regimes continues during the hackathon, but the system itself predates it and is identified as such.
- Any pre-existing Quetzal code, models, or data not in this repository.

## Verification rule

A feature is marked verified only when it has actually been run and its receipt recorded. Mock results are labelled mock. Live results are labelled with their source, time, and receipt. Nothing in this repo is presented as measured when it is computed, or as hackathon-built when it predates the hackathon.
