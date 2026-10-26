# Creative + Community Guardrails — Quetzal AOI Briefing
## Meta Global AI Developer Hackathon — Bonus Prizes, Without Getting Disqualified

**Version:** 1.0.0 — 2026-10-26
**Companion to:** `docs/RULES_ADHERENCE_AGENT.md` (the main gate). This file does NOT replace it.
**Prizes in scope, per Participant Guide as recorded Oct 26:**
- Community vote bonus: **$10,000**, winner announced **Nov 16**
- Creative bonus: **$5,000**
- Also in the $50k bonus pool: viral $20k, open-weight $10k, agentic $5k — not the focus here, same guardrails apply
- Main track prizes are separate from bonuses. A bonus win does not replace a clean main submission, and a bonus chase must never break the main submission.

---

## 1. Can we win Creative? Honest assessment

**What "creative" means here, as we will play it:**
Not "prettiest AI video". Creative = a new way to *see* a hard problem, using Meta models, that a judge can verify in 3 minutes.

**Our creative core — the one idea to demo, not five:**
Machine AOI output → human visual bridge → labelled briefing.
A live seismic feed makes a polygon a machine understands. SAM turns that polygon into a mask a human can see. Spark turns that mask + receipt into a briefing a human can act on. Image makes a briefing visual that is *labelled generated*, never data.
That chain — live → polygon → mask → briefing, with every step receipted — is the creative move. It is not a dashboard, not a chatbot, not a basic RAG, not a simple image analyzer.

**Strengths, verified Oct 26:**
- Live receipts, fast Step 1 (225–269 ms), 2 consecutive full runs PASS with receipts
- Spark 1.3 + Image 1.0 live PASS, with receipts
- Local SAM ViT-B verified on Nagqu (clipped receipt 0.9362, hull 18) — fallback, labelled local
- 3D basemap artifact exists, with real SAM receipt on Nagqu, other AOIs labelled NO RECEIPT LOADED
- Label/receipt discipline itself is distinctive — judges see it, they do not have to trust it

**Gaps that would lose Creative today, if we submitted today:**
- SAM hosted NOT yet verified — visual bridge is not yet Meta-hosted end-to-end
- Orchestrator v1 (live telemetry → AOI → briefing) NOT yet built — mock skeleton only
- Demo video NOT yet made — creativity must be *shown* in 3 minutes, not claimed in a README
- Local planner latency 28–38s — kills demo pacing if shown live, uncut. Demo must be edited, or the local step must be pre-run and labelled as a recorded run, not live
- No single "wow moment" yet in the repo — the demo needs one continuous shot: feed → polygon → SAM mask → briefing, in that order, no cuts hiding a step

**Verdict:** We can *compete* for Creative, we cannot *guarantee* it, and no one honest can. The path to competing is: finish SAM gate + orchestrator v1 + one continuous demo shot. If any of those three is missing, do not chase Creative at the expense of a clean main submission.

## 2. Creative guardrails — creativity must not break truth

These are additions to the main gate, not exceptions to it.

- **C1. Generated ≠ data, always.** Image visuals are labelled GENERATED VISUAL. SAM masks are COMPUTED MASK, with source and receipt. Basemaps are PROCEDURAL RELIEF unless they are a real survey / satellite source, with that source named.
- **C2. Never repaint a mask.** SAM output is shown as SAM output. Do not let Image, or any editor, "clean up", smooth, or beautify a mask and then present it as the SAM result.
- **C3. One wow moment, fully receipted.** The demo's creative shot must be a real run, with timestamp, receipt id, model names, and labels visible or available. A staged animation presented as a live run is a FAIL, even if it looks better.
- **C4. Story, not hype.** Demo narrative: "Here is a place that needs more observation, here is why the machine flagged it, here is what a human sees, here is what we do NOT claim." No "will happen", no "prediction", no "saved lives" claim without evidence.
- **C5. Credit the pre-existing honestly, even in a creative demo.** The creative part is the *bridge built Oct 26–Nov 4*, not the underlying Quetzal system. Say so on screen, in one line, in the demo.
- **C6. No borrowed creativity.** No music, footage, imagery, or code in the demo without rights. If a track / clip / asset has no rights note, it is cut, not used.

## 3. Community vote guardrails — win votes honestly, or do not win them

Community vote is a *bonus*, not a main-track bypass. Winning it by breaking trust loses more than $10k — it risks the whole submission's reputation.

**DO:**
- Share real progress, in the right channel, with repo link and receipts
- Answer questions, help other builders, give feedback on their work
- Post updates when something *actually* ships: repo live, Spark/Image PASS, runner PASS, rules agent pushed, demo v1
- Credit teammates by name when they join, and credit pre-existing work as pre-existing
- Ask for *feedback* now. Ask for *votes* only when voting actually opens, and only in the voting channel / format the organizers announce

**DO NOT:**
- Ask for votes before voting opens, or outside the official voting process
- Offer anything in exchange for a vote — money, credits, shoutouts, follow-backs, help, or future favours
- Create, borrow, or coordinate alternate / fake accounts to vote
- Spam channels, DM strangers asking for votes, or brigade another project's channel
- Post the same update to many channels at once, or more than one progress post per day unless something actually shipped
- Misrepresent the project to get votes: no prediction claims, no "Meta-built" claims for local runs, no mock presented as live, no teammate count inflated
- Trash, downvote, or campaign against other projects

**If in doubt:** Post the update, do not post the ask. The work earns the vote, the ask does not.

## 4. Discord crowd plan — get people going, the right way

Day is early (Oct 26). Goal now is *audience + teammates + feedback*, not votes. Votes come Nov 16, after judging Nov 5–8.

**Cadence:**
- 1 progress post per day, max, in the Builders / progress channel, only when something shipped
- 1 team / feedback ask per day, max, and never the same ask twice in a row
- Reply to every reply on your own posts within the day, in Discord, by Salvador (Morath has no Discord access)
- Help 2 other builders per day if time allows — feedback given is the cheapest honest audience builder

**What to post this week:**
- Oct 26: Repo live + rules agent + runner PASS (see drafts in chat, Oct 26)
- Oct 27: Orchestrator v1, live telemetry → briefing, with receipt
- Oct 28–29: SAM visual bridge, first Meta-hosted mask if gated, otherwise labelled local mask
- Oct 31: Demo video v1, ask for feedback on pacing / clarity, not votes
- Nov 1: First full end-to-end, no new features after

**What NOT to post:**
- Secrets, keys, internal IPs, backend endpoints, unpublished techniques
- Numbers without receipts, or a briefing screenshot with a number cropped out of its label
- "Vote for us" before voting opens
- Teammate names before they have actually joined, or a team size you do not have

## 5. Gate for every Discord post (run before Salvador pastes)

- [ ] No secret, key, IP, endpoint, or unpublished technique in text or screenshot
- [ ] Every number has a receipt, or the number is not in the post
- [ ] Every model named is the model actually used, with local vs Meta distinguished
- [ ] Pre-existing work labelled pre-existing, hackathon work labelled hackathon-built
- [ ] No vote ask, no incentive, no spam — feedback ask only, until voting opens
- [ ] One channel, one post, one day — unless something new actually shipped

**First use:** Use the Oct 26 drafts in chat. Run this gate on each draft before pasting. Record any FAIL, fix it, re-gate — same as code.
