# Demo script — Quetzal AOI Briefing (DRAFT, Salvador-approved narration pending)

Target: 2:50, hard cap 3:00. Voiceover is Salvador's human voice; no AI
voiceover is used or claimed. Every number on screen must be traced to
a shoot-day receipt before shooting — Oct 26 receipts below are the
template, not the shoot-day numbers. No segment may be shot before this
script is approved (G1). Pre-existing work is credited on screen in
every segment that touches it (C5).

## Opening line — first seconds of Segment 1 (0:00, spoken + on screen, within the 2:50 runtime)

> "The Quetzal geophysics system underneath this predates the hackathon; everything in this demo — the AOI briefing, SAM bridge, Spark briefing, generated visual, GIS/KML/viewer, skill-agent, and checks — was built during the event, Oct 26–Nov 4, 2026."

Delivered at the very start, before any other narration. It does not
add time: it is the first line of Segment 1 (0:00–0:20).

## What the judges should see, and where

Judging: impact 30%, Meta tooling 25%, demo 25%, technical depth 20%.
This script hits all four on purpose, in this order:

- **Meta tooling (API):** three live Meta models, each with a receipt —
  muse-spark-1.3 (briefing text), sam-3.1 (image segmentation),
  muse-image-1.0 (generated visual). No contributor models, no local
  model called Meta, no SAM video claim (not smoke-tested).
- **Agentic framework:** an orchestrator plus skill-carrying agents
  (sam, tester, debug, visual, demo) that run ordered steps with
  receipts and fail closed. The gate firing is shown, not just the
  happy path.
- **Multimodal:** five modalities in one pipeline — numeric seismic
  telemetry, satellite imagery, briefing text, generated image, and a
  georeferenced map (GeoJSON/KML/Leaflet). Nothing is a single-model
  text demo.
- **Impact / technical depth:** the manual job this replaces (hunting
  a polygon in ArcGIS/ERDAS after SAM), and the computed-not-guessed
  discipline (labels, receipts, fresh-clone CHECK PASS).

## Segments

### 1. The problem — 0:00–0:20 (Impact)

- Visual: screen recording, a GIS app open on a satellite image, cursor
  hunting for a feature. Label on screen: PROCEDURAL (staged
  illustration of the manual workflow, not data).
- Narration (draft): "Right now, finding an area of interest means a
  human hunting a polygon in a GIS after the model runs. This pipeline
  does the hunting, and proves every step."
- On screen: "Quetzal AOI Briefing — automated areas of interest.
  Underlying Quetzal system pre-existing; bridge built Oct 26–Nov 4."
- Maps to: NEW_IN_HACKATHON.md, "Predates the hackathon" (Quetzal credit).

### 2. The agents — 0:20–0:50 (Agentic framework, Technical depth)

- Visual: orchestrator step graph on screen (orchestrator -> SAM
  skill-agent -> tester -> debug -> visual -> demo), then a terminal
  run of `node test/check.mjs` ending CHECK PASS, then the blind
  harness result (AOI reproduced exactly, GIS leg reproduced).
- Narration (draft): "An orchestrator runs skill-carrying agents. Each
  skill is ordered steps with receipts, and it fails closed — if a step
  can't verify, the run stops instead of guessing."
- Show the gate firing (10 seconds): a briefing with a prediction
  claim fails the validator; the corrected briefing passes. Label:
  PROCEDURAL (test fixture, not a live briefing).
- Maps to: Step 2 orchestrator, skill-agent + blind reproduction,
  Rules Adherence Agent G0/G1.

### 3. Live telemetry to AOI — 0:50–1:20 (API + Multimodal: numeric)

- Visual: ONE continuous terminal run, shoot-day fresh live run of
  `src/e2e.mjs` (60s timeout). Show the live request, event count,
  cell count, top AOI id, measured magnitude, computed energy.
  Label on screen: LIVE TELEMETRY (measured values only) /
  COMPUTED (energy, polygon, centroid).
- Narration (draft): "Live seismic telemetry in. The highest-energy
  2-degree cell becomes the area of interest. Magnitude is measured.
  Energy is computed, and labelled computed."
- Shoot-day numbers go here from the fresh run receipt only. Template
  from Oct 26 (do NOT read these as shoot-day numbers): request
  qz-req-296740b69ea2, 197 events, 68 cells, Fiji AOI--20N--180E,
  M5.5 measured, 1.122e13 J computed.
- Maps to: Steps 2–3, Step 7, `assets/e2e-live-receipt.json`
  (shoot-day receipt to be added).

### 4. Spark briefing — 1:20–1:45 (API + Multimodal: text)

- Visual: the live Spark briefing appears, exactly 2 sentences, AOI id
  verbatim, no new magnitudes, "not a prediction" language visible.
  Show the request id and validator result (0 failures) beside it.
- Narration (draft): "Spark writes the briefing from the AOI and
  nothing else. Two sentences, the same numbers, no new claims."
- Label on screen: COMPUTED BRIEFING — muse-spark-1.3, receipt id
  from the shoot-day run.
- Maps to: Step 5, Spark review pass.

### 5. SAM mask to map — 1:45–2:25 (API + Multimodal: image + map)

- Visual: satellite image (Esri World Imagery, source + bbox + zoom on
  screen) -> SAM prompt -> COMPUTED MASK polygon -> the same polygon
  in the Leaflet viewer (`viewer/map-viewer.html`, OpenStreetMap) and
  as KML opened in a KML reader. Three views, one polygon, one set of
  coordinates on screen.
- Narration (draft): "SAM segments the feature in the image. The mask
  becomes a real polygon — GeoJSON, KML, and a browser map — so nobody
  has to hunt for it in a GIS. The mask is computed, never measured."
- Shoot-day numbers go here from the fresh SAM receipt only. Template
  from Oct 27 blind re-run (do NOT read as shoot-day numbers): box
  [776,377,831,444], mask 55x67, 2198 pixels vs 2197 expected.
  Nagqu leg labelled Nagqu; Fiji leg labelled Fiji; never present
  Nagqu as Fiji.
- Label on screen, every frame: COMPUTED MASK. Image source named.
- Maps to: Step 4 SAM bridge, GIS export + KML + viewer,
  `assets/nagqu-snow-mask.geojson` / `.kml`.

### 6. Generated visual, labelled — 2:25–2:40 (Multimodal: generated image)

- Visual: the Step 6 image, full frame, with GENERATED VISUAL burned
  in. Cut to the mask map beside it for contrast.
- Narration (draft): "This picture is generated. It is illustration,
  never data, and it never touches the map."
- Label on screen: GENERATED VISUAL — muse-image-1.0, SHA-256 receipt
  in `assets/ASSETS.md`.
- Maps to: Step 6.

### 7. Close — 2:40–2:50 (Impact, solo startup)

- Visual: repo page (public), fresh-clone CHECK PASS, viewer link,
  KML download. On screen: "Solo startup: Salvador Sena + agents.
  Bridge built Oct 26–Nov 4, 2026. Underlying Quetzal system
  pre-existing."
- Narration (draft): "Clone it, run the check, open the map. The
  receipts are in the repo."
- Maps to: packaging (G2), solo-startup decision.

## Never in the demo

- No SAM video, no Wonder, no Voice Transcribe — untested, unclaimed.
- No "earthquake prediction," no standalone "predictive model," no
  computed value presented as measured, no generated image presented
  as satellite or data, no pre-existing Quetzal feature presented as
  hackathon-built.
- No secrets in any frame: no keys, no tokens, no terminal history
  showing credentials. Frame-by-frame check before publish (G1).
- No music or footage without a rights note; none is planned.

## Methods + Footnotes (approved 2026-10-28, from the AST audit draft, §8 of `ast-audit-2026-10-28.md`)

Methods — for the demo description / repo README methods section. Oct 26 numbers below are templates; shoot-day numbers replace them, from the shoot-day receipt only.

How the briefing is made. Live seismic telemetry from the Quetzal Cloud Run backend is fetched by one continuous run (`src/e2e.mjs`, 60-second timeout). The highest-energy 2-degree cell — energy by the Gutenberg–Choy relation, `log10(E) = 4.8 + 1.5M` — becomes the area of interest; its polygon and centroid are computed locally and labelled computed, while magnitude, location, and event count are labelled measured. A label and receipt gate (`src/labels.mjs`) fails the run closed on any prediction claim or missing receipt.

The briefing text is written by Muse Spark 1.3 (standard tier), called by the operator with the prompt this code builds (`src/spark-briefing.mjs`): the prompt contains only numbers from the area of interest, the receipt, and the mask record, asks for exactly two sentences in forecast language, and forbids prediction claims and new numbers. Spark does not run inside the shipped code — there is no API call in the repository; the operator makes the call with their own key and records the request ID. The returned text is checked by the briefing validator (`src/spark-briefing.mjs`, `validateSparkBriefing`, bare-number and prediction checks) before it is shown. [Shoot-day: insert the fresh request ID and token counts here, and the validator result, from the shoot-day receipt only.]

Segmentation is Muse SAM 3.1 (hosted), called the same way: the operator supplies a satellite image and a text prompt, SAM returns boxes and masks, and this code validates the supplied result (`src/sam-bridge.mjs` — completed outcome, empty diagnostics, at least one box and mask, positive pixels, named image source) and labels it COMPUTED MASK. The mask box is projected to a real polygon — GeoJSON and KML, in the WGS 84 / EPSG:4326 frame — so the feature can be opened in a GIS without hunting for it. [Shoot-day: insert the fresh SAM receipt — box, mask pixels, image source, bbox, zoom — here.]

The illustration is Muse Image 1.0, called the same way; its record (`src/generated-visual.mjs`) labels it GENERATED VISUAL, illustration only, never data, never a map, never a mask. [Shoot-day: insert the fresh image receipt — SHA-256 and file — here.]

Orchestration is a fixed seven-step spine (`src/spine.mjs`): static routes, fixed order, per-step timeouts, fail-closed gates, and a per-step ledger of route, outcome, latency, and cost estimate. Nothing in the spine learns or reorders steps; the ledger is the scored record a future router would learn from. A human approves every step — the operator runs the live calls, checks the validators, and shoots the demo. Pre-existing work is credited on screen: the Quetzal geophysics system underneath predates the hackathon; the briefing pipeline, gates, GIS export, skill agents, and checks were built during the event, Oct 26–Nov 4, 2026.

Footnotes — for the demo page / submission form footnotes.

1. Spark briefing: Muse Spark 1.3 (standard tier), `reasoning_effort: minimal`, `max_tokens: 8192`. Oct 26 receipted briefings: `chatcmpl-01a17967-…` (Bonin smoke, 263 tokens), `chatcmpl-01a179fb-…` (Fiji AOI, 698 tokens), `chatcmpl-01a17a97-…` (continuous-run Fiji AOI, 868 tokens), `chatcmpl-01a17a9a-…` (reproducibility run, 1,647 tokens), `chatcmpl-01a17ac3-…` (Nagqu fixture AOI + snow mask, 1,885 tokens; fixture, not a live feed). Full IDs in `docs/API.md` and `NEW_IN_HACKATHON.md`. The shipped code builds the prompt and validates the text; it does not call the API. Shoot-day numbers replace these template numbers.
2. SAM segmentation: Muse SAM 3.1 (hosted image path). Oct 26–27 receipted masks: Nagqu snow, 1 box [776,377,831,444], 1 mask, 2,197 pixels; blind re-run 2,198 pixels; Fiji island, 1 mask, 3,523 pixels. Hosted SAM video was not tested and is not claimed. Local SAM2 work is separate and is not presented as hosted SAM.
3. Generated visual: Muse Image 1.0, 1600×1600 WebP, SHA-256 `b3281c30a576d1abad4ea1db39559f9192d4e3452691ff850ef5e24091a34a52` (`assets/generated-visual-fiji.json`). Illustration only.
4. Labels: measured = magnitude, location, event count; computed = energy, polygon, centroid, mask; inferred = interpretation. Forecast language only — "forecast hotspot", "worth more observation" — never "earthquake prediction." Every number shown traces to a shoot-day receipt; Oct 26 numbers in this document are templates.
5. Models not used: Muse Wonder 1.0 and Muse Voice Transcribe 1.0 were listed but never called; no contributor-tier model was used for proprietary work; no local model is presented as a Meta model. Voiceover in the demo is the founder's human voice.
6. Verification: fresh-clone `node test/check.mjs` CHECK PASS; AST audit Oct 28 (acorn 8.15.0 + ESLint 10.0.0, first real ESLint run: 5 unused-binding findings, no undefined names, no unreachable code); Python GIS suite 22/22 in the working copy. The Spark text validator runs in the tester skill and tests; on the shoot-day run the operator runs it on the returned text and records the result — it is not wired into `src/e2e.mjs` or `src/spine.mjs` as coded. That is the one gate gap on the demo path, and it is closed by the operator step at shoot-day, not by a code change claimed here.

## Before shooting

1. Salvador approves this script (and rewrites narration as he likes).
2. Fresh shoot-day live run: E2E + Spark + SAM, receipts saved to
   `assets/`, script numbers updated to those receipts only.
3. Frame-by-frame secrets/credit check on the edit.
4. Video hosted on CV/YouTube (not a GitHub binary); script, link,
   and thumbnail go in the repo at packaging (G2).
