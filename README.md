# Quetzal AOI Briefing

**Live seismic data → AOI polygons → SAM visualization → Muse Spark briefing**

Quetzal AOI Briefing is a scientific observation and analysis tool I'm building to make geophysical data easier to examine, visualize, and understand.

The idea is simple: take live seismic telemetry, identify geographic areas that deserve closer observation, turn those results into something a human can actually interpret, and generate a short briefing explaining what the data tells us.

Most importantly, **we separate what we measured, what we calculated, and what we're inferring.** Every reported number needs a source and a receipt.

This isn't a claim that we can predict earthquakes. It's a way to bring existing geophysics, automated analysis, computer vision, and AI together into a workflow that can be tested and verified.

Built for the **Meta Global AI Developer Hackathon**, Startup Track — *Push the Frontier*.

- Development period: October 26 – November 4, 2026
- Submission deadline: November 4, 9:00 PM ET
- Demo: 3-minute video, coming before submission

## What it does

We're connecting four basic components:

1. **Observe:** Collect live seismic telemetry from the Quetzal geophysics system.
2. **Compute:** Generate areas of interest (AOI polygons) using geophysical analysis. These identify places worth investigating further, not guaranteed future earthquake locations.
3. **Visualize:** Use Meta's Segment Anything Model (SAM) to help translate the geographic output into something people can understand visually, without altering the underlying scientific results.
4. **Explain:** Use Muse Spark to generate a short, readable briefing that separates observations, calculations, and interpretations.

The goal is to make the entire process traceable, from the original data to the final briefing.

## No mystery numbers

I want to make this part especially clear.

Every numerical result belongs to one of three categories:

- **Measured:** Values obtained from instruments or observation sources.
- **Computed:** Values produced by an algorithm, mathematical operation, or model.
- **Inferred:** Interpretations or conclusions drawn from the available evidence.

An inference is not a measurement, and a computed forecast is not an observed event.

Each briefing should include the supporting source information and verification receipt so someone else can examine how we arrived at the result.

If we can't support a claim, we don't present it as verified.

**Keep it simple, but keep the science intact.**

## What's new for this hackathon?

I've been developing the underlying Quetzal geophysics system since before this competition. I'm not claiming that earlier research or infrastructure was built during the hackathon.

What we're building here is a new workflow that connects those capabilities with Meta's AI tools.

The new work includes:

- The AOI briefing orchestration pipeline.
- The measured / computed / inferred classification and receipt system.
- The SAM-based visual bridge for human interpretation.
- The Muse Spark briefing workflow and templates.
- Testing, verification, and rules-adherence checks.
- The public demonstration and supporting documentation.

I've documented the distinction between previous research and new work in [`NEW_IN_HACKATHON.md`](NEW_IN_HACKATHON.md).

I want the judges and other developers to be able to see exactly what was built, what was reused, and what has actually been tested.

## Running the prototype

The repository includes an orchestration skeleton that can run with mock telemetry, without requiring API credentials.

```bash
node src/orchestrator.mjs
```

Mock data is explicitly labelled as mock.

Live integrations require their respective API credentials, which are kept outside the public repository.

No API keys, tokens, or other secrets belong in GitHub commits.

## Current status — October 26, 2026

This is an active build, not a finished production system.

The initial repository and orchestration skeleton are in place. Live smoke tests for Muse Spark 1.3, Muse Image 1.0, and SAM 3.1 (image path) have been run and documented, with receipts in `docs/API.md`.

The hosted SAM video integration still needs its own verified smoke test. The full end-to-end demonstration remains in progress.

As each component is tested, we'll document the results and supporting receipts. I'm not interested in presenting a mock result as a live scientific observation.

## The bigger picture

Geophysics produces an enormous amount of information, but turning that information into something useful often requires specialized software, expertise, and a lot of manual interpretation.

I'm interested in reducing that friction without throwing away the underlying science.

Quetzal is part of a larger effort to build systems that can observe, compute, learn, and communicate their results while remaining accountable to the actual data.

For this hackathon, we're concentrating on one practical piece of that problem: **a working, verifiable seismic AOI briefing pipeline that people can understand.**

I'm keeping the repository public and welcome technical feedback, especially from developers working with geospatial data, segmentation, scientific visualization, and agent orchestration.

Let's see what we can actually build and prove.
