# Credit plan — Quetzal AOI Briefing (Oct 27, 2026, corrected)

## Correction: two different buckets, do not confuse them

Salvador clarified Oct 27, 16:11 MDT: **the 67% figure is Muse
subscription usage, not Meta Model API credits.** The earlier
instruction to plan for $37.50 Meta credits was wrong and is
withdrawn. The binding constraint for the rest of this week is
Muse usage at 67%, not Meta credits. Do not assume a refill of
either bucket.

## Bucket 1 — Meta Model API credits: ~$149.85 remaining

Evidence: Meta Usage page, Oct 21–27, 2026: $0.00 spend.
Screenshot Oct 27: **$149.85 free credits left** of $150. Salvador:
he has "NOT used much for the contest stuff and contest credits."
The cost estimator's past-work estimate is ~$0.11; the $0.15 implied
by $149.85 left is consistent within rate uncertainty. Treat
$149.85 as the working budget, not $150, not a refill.

**Rates are UNVERIFIED.** The estimator
(`cost-forecast/cost_estimator.py`) uses rates from secondary
write-ups of Meta's pricing page, not Meta's own pricing/billing
page. Every rate below carries that warning. All costs below are
therefore doubled (2x buffer) before they are compared to the
budget. If Meta's page contradicts a rate, Meta's page wins and
this plan is re-costed before the next live call.

Unverified rates used: Spark Standard $1.25/1M input, $4.25/1M
output; Muse Image $0.01/image; SAM 3.1 $2.50/1,000 images,
$0.20/1,000 video frames; Voice Transcribe $0.003/min; Wonder
$4.00/$20.00 per 1M in/out. Wonder is CUT from this plan regardless.

## Lean shoot-day run, call by call (2x buffer applied)

Unit costs from observed receipts (Step 7 briefing: 233 input /
635 output tokens; combined run up to 1,885 total tokens):

| Call | Count | Nominal | Buffered (2x) |
|---|---|---|---|
| Spark briefing (233 in / 635 out) | 4 (1 primary + up to 3 fixes) | $0.012 | $0.024 |
| SAM image (discrete feature, z12) | 8 | $0.020 | $0.040 |
| Muse Image (1 generated visual) | 1 | $0.010 | $0.020 |
| **Lean total** | | **$0.042** | **$0.084** |

$0.084 buffered is 0.06% of $149.85. The lean run is not what
eats credits. Loops eat credits: 35M Spark output tokens, 60,000
SAM images, or 750,000 video frames would each eat $150 alone.

## Contingency lines — NOT in the lean total, gated separately

- SAM video, one 150-frame clip: $0.030 nominal, $0.060 buffered.
  Gate: only after the local SAM2 Mac run works on the same clip,
  and only one take. No video claim until a hosted smoke test
  passes. Currently CUT.
- Voice Transcribe, 3 min captions: $0.009 nominal, $0.018
  buffered. Gate: only if captions are needed; voiceover is
  Salvador's human voice in any case. Currently CUT.
- Wonder: $0, CUT. No Wonder call in this plan, at any tier.

## Hard-stop rules (Meta bucket)

1. **$10 floor:** stop all live Meta calls when the remaining
   balance would fall below $10 — i.e. a spend cap of $139.85
   from this plan's date. Check the billing page before the
   shoot-day run; if the balance is not ~$149.85, re-cost first.
2. **Two-failure rule:** if a live run fails twice, stop. Diagnose
   locally ($0), fix, re-verify in a fresh clone. No third live
   attempt without Salvador's explicit say-so.
3. **Count before every call:** tokens for Spark, frames for SAM
   video, images for Image. An uncounted call does not run.
4. **No loops, no batches without a receipt per call.** The Spark
   review pass (20,616 tokens, 4 batches) was the largest single
   spend to date and is not repeated without a reason.

## $0 / local — everything that costs nothing

All tests, fresh-clone checks, rules scans, GIS export (JS +
Python), SAM2 local tiny video proof, the spine, the checkers,
the demo script, and packaging. Local work is unlimited by
credits and is always done first: a run is not called live until
it passes locally.

## Bucket 2 — Muse usage: 67% used (the binding constraint)

No refill assumed. Efficiency rules from now on:

- **Fewer, larger batches.** One agent, one clear brief, one
  receipt — not a stream of small asks that each re-read the
  whole repo. Reuse handoffs; do not re-derive what a prior
  receipt already proves.
- **Local $0 work first.** Tests, audits, docs, and verification
  before any live call, and before asking Salvador anything.
- **No redundant re-reads or re-runs.** If a file was read and
  verified, cite the receipt; do not re-run the same check to
  "be sure" unless the file changed.
- **No live calls until a run is fully verified locally.**
  Fresh-clone CHECK PASS is the gate, not a nice-to-have.
- **Verdict before volume.** A short brutal audit beats a long
  re-derivation. If an agent cannot prove capability with a
  receipt, it is CUT from the demo, not carried.
- **Salvador's time is the scarcest bucket of all.** One-tap
  decisions, receipts in the message, no repeated asks.

## What gets cut first if a run fails twice

1. SAM video (already cut — stays cut).
2. Wonder (already cut — stays cut).
3. Extra Spark fixes beyond the 4 budgeted; the last good
   briefing stands, labelled with its receipt.
4. Extra SAM image attempts beyond the 8 budgeted; the Nagqu
   snow mask already receipted (2197 px) stands.
5. The generated visual is re-used from its receipted run
   (SHA-256 in `assets/ASSETS.md`), never re-called to "improve" it.
6. Never cut: the label/receipt gate, the fresh-clone check, the
   logged-out repo check, or the opening-line credit. Those are
   what keep the submission disqualification-proof.
