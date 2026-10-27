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

### Mon Oct 26 — Kickoff, scope freeze, Steps 2–7 built
- Repo live, starter + smoke batch pushed. DONE.
- Spark + Image smoke tests PASS. DONE.
- SAM hosted image PASS, Nagqu discrete snow mask PASS (1 box, 1 mask, 2197 pixels). AOI-scale SAM gave 0 masks, recorded honestly. Video path documented, NOT smoke-tested.
- Scope freeze: only verified tools stay in — Spark, Image, hosted SAM image. Everything else is parked.
- Steps 2–7 pushed by end of day: orchestrator, label/receipt gate, SAM bridge, Spark briefing, generated visual (binary in repo), one continuous E2E run, agents + checker. Full check PASS, debug-agent PASS 33/0.
- Solo startup, Oct 26: TEAM.md deleted, no team formation, no prospect tracking. Founder = Salvador Sena, + Morath/agents. Founder recruits on his side if help is needed.

### Tue Oct 27 — Demo prep, not a rebuild
- Step 5 refinements if time: Nagqu + snow mask combined Spark briefing, bare-number validator, prompt polish.
- Agents 101 session, 12:00 PM ET (10:00 AM MDT).
- Rofaida's earlier visual assignment is superseded by the solo decision — no team work is blocked on, or assigned by, Morath.

### Wed Oct 28 — Verifiable agents, already built
- Receipt and label tests: measured vs computed vs inferred, no mixing — built Oct 26, in repo.
- Mock vs live results labelled, every time.
- Session: Agents 102, 12:00 PM ET.

### Thu Oct 29 — Visual bridge, already built
- SAM mask + Image visual integrated into the briefing, with sources labelled — built Oct 26.
- Generated image, labelled GENERATED. Never present a generated image as satellite data. Never repaint a SAM mask.

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
