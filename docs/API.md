# What is available in the Meta Model API — verified 2026-10-26

Source: `GET https://api.meta.ai/v1/models`, status 200, via the registered
Meta Model API connection. No keys in this repo.

## Verified live (Oct 26, 2026)

| Model | Use in this project | Status |
|---|---|---|
| `muse-spark-1.3` (standard) | Briefing brain: plans and writes the AOI briefing, with receipts | PASS. Request chatcmpl-01a17967-8b87-73a0-a49b-5dc11747e28f, 46 prompt / 217 completion (163 reasoning) / 263 total, 2-sentence Bonin briefing, forecast language only |
| `muse-image-1.0` | Briefing visual, one per AOI | PASS. Status 200, 442K WebP saved. Output is GENERATED VISUAL, labelled as such, never data |
| `sam-3.1` | Human visual bridge: segment an AOI for a human reader | PASS (image path, Oct 26). Responses API, model `sam-3.1`, prompt `person`, public Pexels stock photo (person standing outdoors), stream=True, metadata mask_encoding one_bit, parser `meta-sam-parser` 0.0.5 with `image_segmentation_format()`. Outcome Completed, diagnostics empty, 2.7s, 1 box [231,403,264,558], 1 mask 33x155, 3076 mask pixels. Video path is documented (input_video + video_segmentation_format, 15,000 frames / 16 objects per frame) but NOT yet smoke-tested — do not claim video until a video call runs. Fallback remains local open-weights SAM ViT-B, already verified on Nagqu, labelled local, not hosted |

## Listed, not yet smoke-tested

| Model | Intended use | Gate |
|---|---|---|
| `muse-wonder-1.0` | Optional stronger reasoning for a final briefing, only if Spark hits a limit | Test one call, check cost first. Not the default. Do not use it blindly for every briefing |
| `muse-voice-transcribe-1.0` | Optional demo narration / stream captions | Only if the demo needs it. Not core |

## Listed, do not use for this project

| Model | Why not |
|---|---|
| `muse-spark-1.3-contributor`, `muse-spark-1.2-contributor` | Contributor tier: prompts may be stored and used for training. Use standard for anything proprietary. Cost discipline in the starter README applies |
| `muse-spark-1.2`, `muse-spark-1.1` | Older checkpoints. No reason to downgrade from 1.3 |

## Spark call-shape lesson (do not repeat the mistake)

Spark is a reasoning model. Reasoning tokens count toward the output cap.
Caps of 200 and 1000 with no reasoning effort returned status 200 with
content null and finish `length`, because reasoning consumed the whole cap.
For a short briefing: `reasoning_effort: minimal`, `max_tokens: 8192`.
Log prompt / completion / reasoning tokens on every call.

## Partner and open-weights models (separate, not in this API list)

- Baseten: `meta-models/muse-spark-open-1026`, $100 + 2M TPM, up to 2,000 participants, not guaranteed, request separately.
- Modal: $100, first 1,000 participants, not guaranteed.
- Fireworks: $25, shortlist teams only, not guaranteed.
- These are stretch, not core. Core demo must work on Meta Model API alone.

## Credits discipline

- $150 Meta Model API credits, founder's account, claimed Oct 26. No teammate credits are used, shared, or claimed for anyone else — solo startup, Oct 26.
- A card must be on the account to make an API call. Set a Spend Limit notification on the Billing page first.
- Log every live call: model, tokens, time, request id, receipt.
- Tiny prompts, one AOI at a time, standard tier, not contributor, for proprietary work.
- Step 7 live receipts, Oct 26: E2E feed qz-req-296740b69ea2 (197 events, 68 cells, Fiji AOI--20N--180E, M5.5) and qz-req-f2948c998ac3 (reproducibility run, same top AOI/magnitude); Spark chatcmpl-01a17a97-7bad-7364-bc65-3d6654fa8f4f (233/635/868) and chatcmpl-01a17a9a-21d2-75d3-a7b8-ba15718e652f (233/1414/1647, validator 0). Live latency varied 1s–20s Oct 26 — Step 7 uses a 60s live timeout, not the old 10s one.
