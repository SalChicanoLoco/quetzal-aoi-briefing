# Quetzal AOI Briefing

Quetzal AOI Briefing — automated forecast polygons from live seismic telemetry, rendered as a human visual with SAM, briefed with Muse Spark, with every number labelled measured / computed / inferred and a receipt attached.

Built for the Meta Global AI Developer Hackathon, Startup track, Push the Frontier.
Submission deadline: Wed Nov 4, 9:00 PM ET. Demo video: 3 minutes, to be added before submission.

## What it does

A scientific briefing tool, not a prediction claim. It:

1. Watches live seismic telemetry.
2. Generates automated areas of interest — geographic forecast polygons marking where more observation is needed.
3. Segments those areas for a human reader, using SAM as the human visual bridge.
4. Produces a short briefing that says exactly what was measured, what was computed, and what was inferred, with a receipt attached.

## Label discipline

- **measured** — instrument values only.
- **computed** — model-derived values, labelled as such.
- **inferred** — interpretations, labelled as such, never presented as measurement.

No number in a briefing is presented without its label and receipt.

## What is new in this hackathon

See `NEW_IN_HACKATHON.md`. In short: the orchestration in this repository, the labelling/receipt discipline as implemented here, the human visual bridge, and the briefing template were built during the hackathon, Oct 26 – Nov 4, 2026.

The underlying geophysics system predates the hackathon and is identified as such in that file. It is not presented as hackathon-built work.

## Run the skeleton (mock, no keys)

```bash
node src/orchestrator.mjs
```

The skeleton runs on mock telemetry only. Live Meta Model API calls (Spark, SAM, Image) are added by the owner on their own machine, with their own key, never committed to this repository. No keys, tokens, or secrets belong in this repo.

## Status

Starter commit, Oct 26, 2026. Smoke tests, SAM/Image integration, demo script, and demo video are in progress, and will be marked as verified only when actually run.
