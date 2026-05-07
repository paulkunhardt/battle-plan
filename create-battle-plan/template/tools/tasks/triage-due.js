#!/usr/bin/env node
// tools/tasks/triage-due.js — lightweight SessionStart-hook nudge.
//
// Reads tasks.yml only. No git scans, no LLM calls, no per-doc checks.
// Silent by default — outputs nothing when triage isn't due.
// Only surfaces when one of the trigger conditions actually fires.
//
// Trigger conditions:
//   1. Time-based:    last_triage_at >= TRIAGE_INTERVAL_DAYS ago, or never triaged with ≥30 open tasks
//   2. Stale-task:    ≥ STALE_TASK_THRESHOLD open tasks with age ≥ STALE_AGE_DAYS
//   3. Volume:        ≥ VOLUME_THRESHOLD open total
//
// Adjust thresholds for your project's task scale.
//
// Flags:
//   --explain   write all signals to stderr (debug)
//   --quiet     suppress nudge output (testing)

const tasks = require('./lib/tasks');

const TRIAGE_INTERVAL_DAYS = 7;
const STALE_TASK_THRESHOLD = 20;
const STALE_AGE_DAYS = 14;
const VOLUME_THRESHOLD = 60;
const NEVER_TRIAGED_MIN_OPEN = 30;

const argv = process.argv.slice(2);
const explain = argv.includes('--explain');
const quiet = argv.includes('--quiet');

function daysBetween(a, b) {
  const ad = new Date(a);
  const bd = new Date(b);
  return Math.floor((bd - ad) / 86400000);
}

const state = tasks.load();
const today = tasks.today();
const open = state.tasks.filter(t => t.status === 'open' || t.status === 'in_progress');
const stale = open.filter(t => {
  if (!t.created) return false;
  return daysBetween(t.created, today) >= STALE_AGE_DAYS;
});

const triggers = [];

if (state.last_triage_at) {
  const sinceDays = daysBetween(state.last_triage_at, today);
  if (sinceDays >= TRIAGE_INTERVAL_DAYS) {
    triggers.push({ kind: 'time', detail: `last triage ${sinceDays}d ago (interval ${TRIAGE_INTERVAL_DAYS}d)` });
  }
} else if (open.length >= NEVER_TRIAGED_MIN_OPEN) {
  triggers.push({ kind: 'never_triaged', detail: `no last_triage_at recorded, ${open.length} open tasks` });
}

if (stale.length >= STALE_TASK_THRESHOLD) {
  triggers.push({ kind: 'stale', detail: `${stale.length} open tasks ≥${STALE_AGE_DAYS}d old` });
}

if (open.length >= VOLUME_THRESHOLD) {
  triggers.push({ kind: 'volume', detail: `${open.length} open tasks (threshold ${VOLUME_THRESHOLD})` });
}

if (explain) {
  process.stderr.write(`triage-due check @ ${today}\n`);
  process.stderr.write(`  open: ${open.length}, stale (≥${STALE_AGE_DAYS}d): ${stale.length}\n`);
  process.stderr.write(`  last_triage_at: ${state.last_triage_at || '(never)'}\n`);
  process.stderr.write(`  triggers: ${triggers.length ? triggers.map(t => t.kind).join(', ') : 'none'}\n`);
}

if (triggers.length === 0 || quiet) process.exit(0);

const reasons = triggers.map(t => t.detail).join('; ');
process.stdout.write(`📋 Weekly triage is due — ${reasons}. Run \`/weekly-triage\` when convenient.\n`);
