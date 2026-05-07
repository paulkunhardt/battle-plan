#!/usr/bin/env node
// tools/tasks/migrate-lanes.js — one-shot heuristic backfill of `lane` field.
// Idempotent: skips tasks that already have a valid lane.
//
// Usage:
//   node tools/tasks/migrate-lanes.js          # apply heuristic, write tasks.yml
//   node tools/tasks/migrate-lanes.js --dry    # show classifications, write nothing
//
// Heuristic is intentionally generic. ADAPT the LANE_KEYWORDS table below to
// your project's vocabulary. Two-pass design: tags first (curated, high
// signal-to-noise), then title (less curated). Context is NEVER consulted —
// it often contains incidental words that contaminate classification.
//
// Tasks that match no keyword bucket fall back to `meta`. Re-run anytime —
// already-laned tasks stay put.

const tasks = require('./lib/tasks');

// Adapt these keyword buckets to your project. Lane order matters when a task
// matches multiple — the first lane in this object wins.
const LANE_KEYWORDS = {
  build: [
    'mvp', 'demo', 'arch', 'architecture', 'integrations', 'product',
    'feature', 'build', 'ship', 'design', 'frontend', 'backend', 'api', 'ui'
  ],
  outreach: [
    'outreach', 'blitz', 'cold-email', 'cold-dm', 'linkedin', 'template',
    'cadence', 'pitch-copy', 'content', 'post', 'campaign', 'sequence'
  ],
  discovery: [
    'warm', 'warm-intro', 'intro', 'intros', 'discovery', 'door-opener',
    'follow-up', 'lead', 'customer', 'prospect', 'champion'
  ],
  infra: [
    'infra', 'gcp', 'aws', 'dns', 'domain', 'ci', 'deploy', 'env',
    'secrets', 'database', 'monitoring', 'logging'
  ],
  fundraising: [
    'fundraising', 'investor', 'vc', 'angel', 'pitch', 'fund',
    'accelerator', 'yc', 'spc', 'demo-day'
  ]
};

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry');

function matchLane(needle) {
  if (!needle) return null;
  const lower = needle.toLowerCase();
  for (const [lane, keywords] of Object.entries(LANE_KEYWORDS)) {
    for (const kw of keywords) {
      const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) return lane;
    }
  }
  return null;
}

function classify(task) {
  if (task.lane && tasks.VALID_LANES.has(task.lane)) return { lane: task.lane, source: 'preserved' };
  // Pass 1: tags (curated, high signal).
  const tagsNeedle = (Array.isArray(task.tags) ? task.tags : []).join(' ');
  const fromTags = matchLane(tagsNeedle);
  if (fromTags) return { lane: fromTags, source: 'tags' };
  // Pass 2: title (less curated).
  const fromTitle = matchLane(task.title || '');
  if (fromTitle) return { lane: fromTitle, source: 'title' };
  return { lane: 'meta', source: 'fallback' };
}

const state = tasks.load();
let changed = 0;
let kept = 0;
const summary = { tags: 0, title: 0, fallback: 0, preserved: 0 };

for (const t of state.tasks) {
  const { lane, source } = classify(t);
  summary[source]++;
  if (source === 'preserved') {
    kept++;
    continue;
  }
  if (t.lane !== lane) {
    if (!dryRun) t.lane = lane;
    changed++;
    if (dryRun) {
      console.log(`[dry] TASK-${t.id} → ${lane} (via ${source}): ${t.title}`);
    }
  }
}

if (!dryRun && changed > 0) tasks.save(state);

console.log('');
console.log(`Migration ${dryRun ? '(dry-run) ' : ''}complete.`);
console.log(`  Preserved (already laned): ${kept}`);
console.log(`  Classified via tags:       ${summary.tags}`);
console.log(`  Classified via title:      ${summary.title}`);
console.log(`  Fell back to meta:         ${summary.fallback}`);
console.log(`  Total updated:             ${changed}`);
if (dryRun) {
  console.log('');
  console.log('Re-run without --dry to apply.');
}
