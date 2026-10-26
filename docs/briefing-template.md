# Briefing template

Copy this structure for every briefing. No briefing ships without labels and a receipt.

## Title
Quetzal AOI Briefing — [AOI id] — [date/time UTC]

## Area of interest
- AOI id:
- Polygon / bounds: [geographic bounds, not a placeholder box, unless labelled mock]
- Why this area: [more observation needed because …]

## Numbers, with labels
| Value | Label | Source |
|---|---|---|
| Example: event magnitude | measured | instrument feed, time |
| Example: forecast probability | computed | model, window, receipt |
| Example: interpretation | inferred | analyst, labelled as interpretation |

Rules:
- measured = instrument values only.
- computed = model-derived, never presented as measured.
- inferred = interpretation, never presented as measurement.

## Visual
- Basemap source: [labelled, e.g. vector basemap, or generated — if generated, say GENERATED]
- Mask source: [SAM live, SAM open-weights local, or mock — never present a generated image as a SAM mask]
- Mask confidence: [clipped, if applicable — never quote an unclipped score above 1.0 as IoU]

## Receipt
- Source:
- Time (UTC):
- Request id / snapshot id:
- Freshness:
- Trace id (if available):

## What this is not
Not a deterministic prediction. A forecast hotspot / area of interest is a
geographic polygon marking where more observation is needed, not a claim
that a specific event will occur at a specific time.
