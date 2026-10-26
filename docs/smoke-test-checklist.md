# Smoke-test checklist — Oct 26, 2026

Run one call each, record the receipt, mark verified only when actually run.
Mock results are labelled mock. Live results carry source, time, and request id.

## Repo skeleton smoke test — PASS (Morath, sandbox, 2026-10-26)
- `node --check src/orchestrator.mjs` — pass
- `node src/orchestrator.mjs` — pass, output is a mock briefing with
  AOI-MOCK, labels measured / computed / inferred, receipt source mock.
- This is a mock smoke test only. It does not verify any live Meta Model API call.

## Live Meta Model API smoke tests — OWNER ONLY, on owner's Mac
Owner runs these with their own key, never committed to this repo.
Do not paste keys into this repo, into Discord, or into chat with Morath.

- [ ] Muse Spark — one chat completion, record request id, time, output label
- [ ] SAM 3.1 — one call, record model, input type, mask receipt, time
  - Note: confirm image vs video path before calling; do not guess a format.
  - Hosted SAM is not verified until this call succeeds and its receipt is recorded.
- [ ] Muse Image — one image, record model, prompt, time, output label

## Quetzal MCP re-check — owner / Morath, as applicable
- [ ] MCP tools list re-checked
- [ ] Live telemetry tool returns live data, labelled measured where applicable

## Scope freeze rule
By end of day Oct 26: whatever is verified working stays in scope.
Whatever is not verified is parked, not claimed.
