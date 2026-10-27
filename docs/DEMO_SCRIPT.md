# Demo script — Quetzal AOI Briefing (DRAFT, Salvador-approved narration pending)

Target: 2:50, hard cap 3:00. Voiceover is Salvador's human voice; no AI
voiceover is used or claimed. Every number on screen must be traced to
a demo-day receipt before shooting — Oct 26 receipts below are the
template, not the demo-day numbers. No segment may be shot before this
script is approved (G1). Pre-existing work is credited on screen in
every segment that touches it (C5).

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

- Visual: ONE continuous terminal run, demo-day fresh live run of
  `src/e2e.mjs` (60s timeout). Show the live request, event count,
  cell count, top AOI id, measured magnitude, computed energy.
  Label on screen: LIVE TELEMETRY (measured values only) /
  COMPUTED (energy, polygon, centroid).
- Narration (draft): "Live seismic telemetry in. The highest-energy
  2-degree cell becomes the area of interest. Magnitude is measured.
  Energy is computed, and labelled computed."
- Demo-day numbers go here from the fresh run receipt only. Template
  from Oct 26 (do NOT read these as demo-day numbers): request
  qz-req-296740b69ea2, 197 events, 68 cells, Fiji AOI--20N--180E,
  M5.5 measured, 1.122e13 J computed.
- Maps to: Steps 2–3, Step 7, `assets/e2e-live-receipt.json`
  (demo-day receipt to be added).

### 4. Spark briefing — 1:20–1:45 (API + Multimodal: text)

- Visual: the live Spark briefing appears, exactly 2 sentences, AOI id
  verbatim, no new magnitudes, "not a prediction" language visible.
  Show the request id and validator result (0 failures) beside it.
- Narration (draft): "Spark writes the briefing from the AOI and
  nothing else. Two sentences, the same numbers, no new claims."
- Label on screen: COMPUTED BRIEFING — muse-spark-1.3, receipt id
  from the demo-day run.
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
- Demo-day numbers go here from the fresh SAM receipt only. Template
  from Oct 27 blind re-run (do NOT read as demo-day numbers): box
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

## Before shooting

1. Salvador approves this script (and rewrites narration as he likes).
2. Fresh demo-day live run: E2E + Spark + SAM, receipts saved to
   `assets/`, script numbers updated to those receipts only.
3. Frame-by-frame secrets/credit check on the edit.
4. Video hosted on CV/YouTube (not a GitHub binary); script, link,
   and thumbnail go in the repo at packaging (G2).
