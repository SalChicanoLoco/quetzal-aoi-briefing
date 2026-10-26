# Quetzal AOI Briefing — great plan, Oct 26 to Nov 4, 2026

Track: Startup. Problem statement: Push the Frontier.
Demo scope: Quetzal-tools-only orchestration. Forecast regimes are
Salvador's background wiring, not a blocker, and not claimed as hackathon-built.

## The demo in one paragraph

Live seismic telemetry in, automated area of interest out, SAM visual
for a human reader, Spark briefing with labels and a receipt.
Every number labelled measured / computed / inferred.
Nothing in the demo is presented as a deterministic prediction.

## Milestones

### Mon Oct 26 — Kickoff, scope freeze by end of day
- Repo live, starter + smoke batch pushed. DONE.
- Spark + Image smoke tests PASS. DONE.
- SAM hosted gate: confirm image vs video path, then one call. If it fails, fallback is local open-weights SAM, labelled local.
- Team formation: Builders replies, up to 3 seats, max team 4.
- Scope freeze EOD: only verified tools stay in. Everything else is parked.

### Tue Oct 27 — Orchestrator v1
- Live telemetry adapter (mock to live, with labels kept).
- AOI generation to briefing template, end to end, one AOI.
- Session: Agents 101, 12:00 PM ET.

### Wed Oct 28 — Verifiable agents
- Receipt and label tests: measured vs computed vs inferred, no mixing.
- Mock vs live results labelled, every time.
- Session: Agents 102, 12:00 PM ET.

### Thu Oct 29 — Visual bridge
- SAM mask + Image visual integrated into the briefing, with sources labelled.
- Generated basemap, if used, labelled GENERATED. Never present a generated image as satellite data. Never repaint a SAM mask.

### Fri Oct 30 — Partner check, only if time
- Session: Fireworks, 12:00 PM ET.
- Evaluate Baseten / Modal / Fireworks open-weights only as stretch. Core must still work without them.

### Sat Oct 31 — Demo video v1
- 3-minute video, hackathon-built features only, live product holding up.
- Script, screen capture, narration if Voice Transcribe is used, otherwise human narration.

### Sun Nov 1 — First full end-to-end run
- Telemetry to AOI to SAM to Spark to briefing, one full pass, receipts recorded.
- Fix only what breaks the demo. No new features after this date.

### Mon Nov 2 — Hardening + Codex, separate track
- Hardening all day, no new features.
- Codex x TwitchCon submission deadline 3:00 PM MST, separate from Meta. Do not let it eat Meta hardening time; time-box it.

### Tue Nov 3 — Packaging
- Last full day for submission questions and troubleshooting, per the guide.
- Repo clean, README, NEW_IN_HACKATHON.md, demo video link, all public and accessible.

### Wed Nov 4 — Submit early
- Final office hours in Discord.
- Submit via the CV platform by 9:00 PM ET. Target: submit by noon ET, not at the deadline.
- Judging Nov 5-8, closing Nov 9, community vote winner Nov 16.

## Judging, in our favour
- Impact 30%: real civil hazard use — where more observation is needed.
- Meta tooling 25%: Spark + SAM + Image, used together, not a basic integration.
- Demo 25%: working live demo, 3-minute video that holds up.
- Technical depth 20%: labelled, receipted, verifiable orchestration.

## What we will not do
- No deterministic prediction claims, ever.
- No contributor models for proprietary work.
- No keys, tokens, or secrets in the repo, in Discord, or in chat.
- No new features after Nov 1.
- No claiming mock, generated, or pre-existing work as live, measured, or hackathon-built.
