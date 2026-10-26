// Base Agent — Quetzal AOI Briefing, new work Oct 26, 2026.
// One base, many roles. A role is a system instruction + output
// rules + a validator, NOT a separate model, NOT a separate repo.
// Later roles plug in here: briefing, tester, visual, demo, etc.
// The base agent never invents numbers, never predicts an event,
// never claims a mock is live, and never calls the API itself.
// A live call runs on the owner's machine with their own key
// (docs/API.md: muse-spark-1.3, reasoning_effort minimal,
// max_tokens 8192). No key is in this repo.

export const ROLES = {
  briefing: {
    system: "You are the Quetzal briefing agent. Forecast language only, never a prediction.",
    output: "Exactly 2 sentences, include the AOI id verbatim.",
  },
  tester: {
    system: "You are the Quetzal testing agent. You test, classify failures, and propose fixes. You never auto-fix, never waive a rule.",
    output: "A short classified list: category, evidence, suggested fix. No new numbers unless they are in the context.",
  },
  debug: {
    system: "You are the Quetzal debug agent. You diagnose a failure report, name the root cause, and give one next step.",
    output: "Root cause, then one next step, then what to re-run. No new numbers unless they are in the context.",
  },
  visual: {
    system: "You are the Quetzal visual agent. You plan a visual overlay from a SAM mask, with labels, never repainting the mask.",
    output: "Overlay plan: base image source, mask label, labels shown. Never call a generated image a satellite image.",
  },
  demo: {
    system: "You are the Quetzal demo agent. You plan a 3-minute demo of hackathon-built work only, with receipts.",
    output: "Demo beats in order, each with its receipt. No pre-existing work presented as hackathon-built.",
  },
};

export function buildAgentPrompt(role, task, context = {}) {
  const r = ROLES[role];
  if (!r) throw new Error(`unknown role: ${role}`);
  const lines = [
    r.system,
    r.output,
    "Use ONLY the numbers and facts in the context below. Do not invent a number, probability, depth, location, or receipt.",
    "This is NOT a prediction: never say an event will occur at a specific time.",
    "",
    `Task: ${task}`,
    `Context: ${JSON.stringify(context)}`,
  ];
  return lines.join("\n");
}

export function validateAgentOutput(role, text, context = {}) {
  const failures = [];
  if (!ROLES[role]) failures.push(`unknown role: ${role}`);
  if (typeof text !== "string" || text.length === 0) return [...failures, "agent output is empty"];
  if (/will (occur|happen|strike)/i.test(text)) failures.push("prediction claim: will occur/happen/strike");
  if (/predicted to/i.test(text)) failures.push("prediction claim: predicted to");
  if (/earthquake prediction/i.test(text) && !/not a prediction/i.test(text)) {
    failures.push("prediction claim: earthquake prediction");
  }
  // Magnitude hallucination check, only when context gives a max.
  if (context.max_magnitude !== undefined) {
    const mags = [...text.matchAll(/M\s?(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
    const want = String(context.max_magnitude);
    for (const m of mags) {
      if (m !== want && Number(m) !== Number(want)) {
        failures.push(`magnitude ${m} is not the context max magnitude ${want}`);
      }
    }
  }
  return failures;
}

// Mock run, for tests only. Labelled mock, never live.
export function mockRun(role, task, context = {}) {
  const text = `Mock ${role} run: task "${task}" received, context recorded, no live call made.`;
  return { role, text, receipt: { source: "mock", generated_at: new Date().toISOString() } };
}
