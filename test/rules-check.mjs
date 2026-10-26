// Rules Adherence pre-commit check — Quetzal AOI Briefing
// Run: node test/rules-check.mjs
// FAIL = block the commit. Unverified = FAIL. This is a first-pass scan,
// not a substitute for the full gate in docs/RULES_ADHERENCE_AGENT.md.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const warnings = [];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root).filter(f => !f.endsWith('rules-check.mjs'));

// 1. Required docs exist
for (const req of ['README.md', 'NEW_IN_HACKATHON.md', 'docs/PLAN.md', 'docs/API.md', 'docs/TEAM.md', 'docs/RULES_ADHERENCE_AGENT.md']) {
  if (!existsSync(join(root, req))) failures.push(`Missing required file: ${req}`);
}

// 2. No secret-looking content in tracked text files
const secretPatterns = [
  /sk-[A-Za-z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];
const bannedPhrases = [
  /earthquake prediction/i,
  // standalone "predictive model" — allowed only inside "forecast" discussion is still a fail here;
  // human gate reviews context, this scan flags it for review
  /predictive model/i,
];

for (const f of files) {
  const rel = relative(root, f);
  if (/\.(png|webp|jpg|jpeg|mp4|webm)$/i.test(f)) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (rel === '.env' || rel.endsWith('/.env')) failures.push(`Credential file present: ${rel}`);
  for (const pat of secretPatterns) {
    if (pat.test(text)) failures.push(`Possible secret pattern in ${rel}: ${pat}`);
  }
  for (const pat of bannedPhrases) {
    if (pat.test(text)) warnings.push(`Banned phrase flagged for human gate review in ${rel}: ${pat} — check context, do not ship as a prediction claim`);
  }
  if (/quetzal-chat:latest/.test(text) && /muse-spark/i.test(text) && /Meta/i.test(text)) {
    warnings.push(`Check in ${rel}: quetzal-chat:latest must not be presented as a Meta model`);
  }
}

console.log('Rules check — Quetzal AOI Briefing');
console.log(`Files scanned: ${files.length}`);
if (warnings.length) {
  console.log('\nWARNINGS (human gate must review, not auto-pass):');
  for (const w of warnings) console.log(' - ' + w);
}
if (failures.length) {
  console.log('\nFAIL — block commit:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
console.log('\nPASS (scan only — full gate in RULES_ADHERENCE_AGENT.md still required)');
