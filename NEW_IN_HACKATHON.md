# What was built during the hackathon

Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026.
Startup track, Push the Frontier.

This file is the new-work record judges are asked to check. Anything not listed here as hackathon-built is not claimed as hackathon-built.

## Built during the hackathon (in this repository)

- This repository itself, created Oct 26, 2026, as a clean public submission repo.
- `README.md` and this file — the project description and new-work record.
- `src/orchestrator.mjs` — orchestration skeleton, then v1 Oct 26: live Quetzal telemetry adapter (GeoJSON / events / data shapes, unrecognised payload throws, not silent zero), real 2°-grid AOI generation (highest total Gutenberg-Choy energy cell, closed polygon, energy-weighted centroid), labelled measured / computed / inferred output with receipt. Mock mode preserved for the original smoke test; `--live` falls back to labelled mock on failure. `test/orchestrator-v1.mjs` — 10/10 PASS on a fixed fixture, plus a live run Oct 26 (200 events, 66 cells, top cell Fiji-area M5.5, receipt source quetzal-live).
- Step 3, Oct 26: `src/labels.mjs` + `test/label-receipt.mjs` — label and receipt gate. Good fixture, mock, and live-shaped briefings pass; the gate itself is proven to fail 6 bad briefings (computed-as-measured, missing receipt, receipt without time, live receipt without URL, prediction claim, missing inferred label). The actual live run Oct 26 also passes the gate (0 failures). Stale "lone 6.0 cell" comment in the v1 test fixed in this batch.
- Step 4, Oct 26: `src/sam-bridge.mjs` + `test/sam-bridge.mjs` — SAM visual bridge contract, 13/13 PASS. AOI polygon to bounding box, SAM result validator (completed outcome, empty diagnostics, >=1 box and mask, positive pixels, named prompt and image_source, hosted/local not swapped), mask record labelled COMPUTED MASK only, never satellite or measured. HONEST LIMIT: a true AOI mask is NOT yet produced — it needs a real basemap image supplied by the owner (e.g. the Nagqu basemap from the Mac report, or a named public map). The recorded Oct 26 hosted shape (1 box, 1 mask, stock photo, prompt "person") is a call-shape test only, not an AOI mask. No mask is invented here, and no generated or procedural image is presented as an AOI mask.
- The labelling/receipt discipline as implemented in this skeleton: measured / computed / inferred, with receipt attached to every briefing.
- The human visual bridge concept as implemented here: machine AOI output rendered for a human reader via SAM segmentation, without repainting the mask.
- The briefing template and demo script, as they are added to this repository during the hackathon period.
- `docs/PLAN.md`, `docs/API.md`, `docs/TEAM.md`, `docs/smoke-test-checklist.md`, `test/smoke-test.mjs` — plan, API inventory, team onboarding, smoke checklist, and mock smoke test, all built Oct 26, 2026.
- `docs/RULES_ADHERENCE_AGENT.md`, `test/rules-check.mjs` — Rules Adherence Agent and pre-commit scan, built Oct 26, 2026. The agent gates every commit, demo, and submission against disqualification risks (new-work-only, Meta tooling, secrets, false claims, label discipline); scan PASS on first run, 10 files scanned.
- `docs/CREATIVE_AND_COMMUNITY_GUARDRAILS.md` — Creative + community-vote guardrails, built Oct 26, 2026. Creative bonus and community-vote bonus ($5k / $10k per guide) chased only with truth guardrails: generated ≠ data, no vote manipulation, no vote ask before voting opens, Discord post gate before every paste.
- Live smoke tests Oct 26: Muse Spark 1.3 and Muse Image 1.0, with receipts recorded in `docs/API.md`. SAM 3.1 hosted image smoke test PASS Oct 26 (1 box, 1 mask, Completed, 2.7s, receipt in `docs/API.md`); SAM hosted video smoke test is not yet run and is not claimed.

## Predates the hackathon (not claimed as hackathon-built)

- The underlying Quetzal geophysics system, including its forecast regimes and telemetry work. Salvador's background wiring of those regimes continues during the hackathon, but the system itself predates it and is identified as such.
- Any pre-existing Quetzal code, models, or data not in this repository.

## Verification rule

A feature is marked verified only when it has actually been run and its receipt recorded. Mock results are labelled mock. Live results are labelled with their source, time, and receipt. Nothing in this repo is presented as measured when it is computed, or as hackathon-built when it predates the hackathon.
