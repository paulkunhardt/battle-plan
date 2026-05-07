#!/usr/bin/env node
// tools/tasks/triage.js — read-only triage report.
// Surfaces overdue/stale tasks, recent commits mentioning each task,
// and "implications drift" (linked doc untouched since task created).
//
// Usage:
//   node tools/tasks/triage.js                  # markdown to stdout
//   node tools/tasks/triage.js --json           # JSON for programmatic consumers
//   node tools/tasks/triage.js --lane build     # filter to one lane
//   node tools/tasks/triage.js --stale-days 14  # tighten staleness threshold (default 7)
//
// Strictly read-only. Does NOT mutate tasks.yml.
// Decisions are applied by the /weekly-triage skill via Edit calls.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const tasks = require('./lib/tasks');

const ROOT = path.resolve(__dirname, '../..');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const laneIdx = argv.indexOf('--lane');
const laneFilter = laneIdx >= 0 ? argv[laneIdx + 1] : null;
const staleIdx = argv.indexOf('--stale-days');
const STALE_DAYS = staleIdx >= 0 ? parseInt(argv[staleIdx + 1], 10) : 7;

function daysBetween(a, b) {
  const ad = new Date(a);
  const bd = new Date(b);
  return Math.floor((bd - ad) / 86400000);
}

function fileLastMod(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    const out = execSync(
      `git -C "${ROOT}" log -1 --format=%cI -- "${relPath}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function commitsMentioning(id) {
  try {
    const out = execSync(
      `git -C "${ROOT}" log --since="60 days ago" --pretty=format:"%h %s" --grep="TASK-${id}\\b" -i`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return out.trim().split('\n').filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
}

// Build a {YYYY-MM-DD: "Day N — title"} map by scanning docs/battle-plan.md for headings.
// Three formats accepted (covers our actual heading conventions and most plausible variants).
let _battlePlanDayMap = null;
function battlePlanDayMap() {
  if (_battlePlanDayMap !== null) return _battlePlanDayMap;
  _battlePlanDayMap = {};
  const bp = path.join(ROOT, 'docs/battle-plan.md');
  if (!fs.existsSync(bp)) return _battlePlanDayMap;
  const text = fs.readFileSync(bp, 'utf8');
  for (const line of text.split('\n')) {
    // Format A: "### Day N — Weekday Month D *(... · YYYY-MM-DD)*"
    let m = line.match(/^#{2,4}\s+Day\s+(\d+)\s*[—-]\s*([^*]+?)\s*\*\([^·]*·\s*(\d{4}-\d{2}-\d{2})\)\*\s*$/);
    if (m) { _battlePlanDayMap[m[3]] = `Day ${m[1]} — ${m[2].trim()}`; continue; }
    // Format B: "## Day N (YYYY-MM-DD)" or "### Day N (YYYY-MM-DD) — title"
    m = line.match(/^#{2,4}\s+Day\s+(\d+)\s*\((\d{4}-\d{2}-\d{2})\)\s*(?:[—-]\s*(.+))?$/);
    if (m) { _battlePlanDayMap[m[2]] = `Day ${m[1]}${m[3] ? ' — ' + m[3].trim() : ''}`; continue; }
    // Format C: "## YYYY-MM-DD — title"
    m = line.match(/^#{2,4}\s+(\d{4}-\d{2}-\d{2})\s*(?:[—-]\s*(.+))?$/);
    if (m) { _battlePlanDayMap[m[1]] = m[2] ? m[2].trim() : 'battle-plan entry'; }
  }
  return _battlePlanDayMap;
}

// Extract transcript paths referenced from a task's tags + context.
function transcriptRefs(t) {
  const haystack = [t.context || '', ...(t.tags || [])].join(' ');
  const matches = haystack.match(/docs\/archive\/validation\/transcripts\/[^\s,;)]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

// Source/origin context — where did this task come from?
function sourceContext(t) {
  const out = [];
  if (t.created) {
    const dayLabel = battlePlanDayMap()[t.created];
    if (dayLabel) out.push(`battle-plan: ${dayLabel}`);
  }
  for (const tr of transcriptRefs(t)) out.push(`transcript: ${tr}`);
  const hintTags = (t.tags || []).filter(tag => /^(spawned-by-|from-|call-|h\d+)/i.test(tag));
  if (hintTags.length) out.push(`tags: ${hintTags.join(', ')}`);
  return out.length ? out : null;
}

// Resolve blocked_by IDs to {id, status, title, open} entries.
function resolveBlockedBy(t, allTasks) {
  if (!Array.isArray(t.blocked_by) || !t.blocked_by.length) return null;
  const byId = new Map(allTasks.map(x => [x.id, x]));
  return t.blocked_by.map(id => {
    const b = byId.get(id);
    if (!b) return { id, status: 'unknown', title: '?', open: false };
    const open = b.status === 'open' || b.status === 'in_progress';
    return { id, status: b.status, title: (b.title || '').slice(0, 60), open };
  });
}

function implicationsDrift(t) {
  if (!Array.isArray(t.implications) || !t.implications.length) return null;
  const drift = [];
  for (const docPath of t.implications) {
    const lastMod = fileLastMod(docPath);
    if (!lastMod) {
      drift.push(`${docPath} (file missing)`);
      continue;
    }
    if (t.created && lastMod < t.created) {
      drift.push(`${docPath} (last modified ${lastMod}, predates task)`);
    }
  }
  return drift.length ? drift : null;
}

function suggestion(flags, t) {
  if (flags.blockedByOpen) return 'blocked — chase blocker(s) or demote';
  if (flags.overdue && flags.overdueDays > 14) return 'demote (overdue >14d — losing momentum)';
  if (flags.stale && !t.due) return `snooze ${STALE_DAYS}d or demote (open ${flags.ageDays}d, no due)`;
  if (flags.commitMentions) return 'check if recent commits closed this — done?';
  if (flags.drift) return 'close (no longer needed) or promote (chase the doc)';
  return null;
}

function buildReport() {
  const state = tasks.load();
  const today = tasks.today();

  let open = state.tasks.filter(t => t.status === 'open' || t.status === 'in_progress');
  if (laneFilter) open = open.filter(t => t.lane === laneFilter);

  const items = [];
  for (const t of open) {
    const ageDays = t.created ? daysBetween(t.created, today) : 0;
    const overdueDays = t.due ? daysBetween(t.due, today) : 0;
    const blockers = resolveBlockedBy(t, state.tasks);
    const blockedByOpen = blockers ? blockers.some(b => b.open) : false;
    const flags = {
      overdue: t.due && overdueDays > 0,
      overdueDays,
      // Suppress the stale flag when the only reason a task is sitting open is a deliberate blocker.
      stale: !t.due && ageDays >= STALE_DAYS && !blockedByOpen,
      ageDays,
      commitMentions: false,
      drift: false,
      blockedByOpen
    };
    const commits = commitsMentioning(t.id);
    flags.commitMentions = commits.length > 0;
    const drift = implicationsDrift(t);
    flags.drift = drift !== null;
    const source = sourceContext(t);

    items.push({
      id: t.id,
      title: t.title,
      context: t.context || null,
      tags: t.tags || [],
      lane: t.lane || 'meta',
      priority: t.priority,
      status: t.status,
      due: t.due || null,
      created: t.created || null,
      ageDays,
      overdueDays,
      flags,
      commits,
      drift,
      blockers: blockers || [],
      source_context: source || [],
      suggestion: suggestion(flags, t)
    });
  }

  items.sort((a, b) => {
    if (a.flags.overdue !== b.flags.overdue) return a.flags.overdue ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.ageDays - a.ageDays;
  });

  const stats = {
    total_open: open.length,
    overdue: items.filter(i => i.flags.overdue).length,
    stale: items.filter(i => i.flags.stale && !i.flags.overdue).length,
    blocked: items.filter(i => i.flags.blockedByOpen).length,
    by_lane: {}
  };
  for (const i of items) {
    stats.by_lane[i.lane] = (stats.by_lane[i.lane] || 0) + 1;
  }

  return {
    generated_at: today,
    last_triage_at: state.last_triage_at || null,
    stale_threshold_days: STALE_DAYS,
    stats,
    items
  };
}

function renderMarkdown(report) {
  const out = [];
  out.push(`# Task Triage Report — ${report.generated_at}`);
  out.push('');
  if (report.last_triage_at) {
    const since = daysBetween(report.last_triage_at, report.generated_at);
    out.push(`*Last triage: ${report.last_triage_at} (${since}d ago).*`);
  } else {
    out.push('*No prior triage recorded.*');
  }
  out.push('');
  out.push('## Stats');
  out.push('');
  out.push(`- Total open: ${report.stats.total_open}`);
  out.push(`- Overdue: ${report.stats.overdue}`);
  out.push(`- Stale (≥${report.stale_threshold_days}d, not overdue, not blocked): ${report.stats.stale}`);
  out.push(`- Blocked by another open task: ${report.stats.blocked}`);
  out.push('- By lane:');
  for (const [lane, n] of Object.entries(report.stats.by_lane)) {
    out.push(`  - ${lane}: ${n}`);
  }
  out.push('');
  out.push('---');
  out.push('');

  for (const i of report.items) {
    const flagBits = [];
    if (i.flags.overdue) flagBits.push(`\`overdue ${i.flags.overdueDays}d\``);
    if (i.flags.stale && !i.flags.overdue) flagBits.push(`\`open ${i.flags.ageDays}d\``);
    if (i.flags.blockedByOpen) {
      const openIds = i.blockers.filter(b => b.open).map(b => b.id);
      flagBits.push(`\`blocked by TASK-${openIds.join(', TASK-')}\``);
    }
    if (i.flags.drift) flagBits.push('`drift`');
    if (i.flags.commitMentions) flagBits.push('`commit-mentioned`');
    const flagStr = flagBits.length ? ' — ' + flagBits.join(' ') : '';
    const dueStr = i.due ? `due ${i.due}` : 'no due';
    out.push(`### TASK-${i.id} (P${i.priority} · ${i.lane} · ${dueStr} · age ${i.ageDays}d)${flagStr}`);
    out.push('');
    out.push(`**${i.title}**`);
    if (i.source_context && i.source_context.length) {
      out.push('');
      out.push(`*Source:* ${i.source_context.join(' · ')}`);
    }
    if (i.context) {
      out.push('');
      out.push(`> ${i.context}`);
    }
    if (i.tags.length) {
      out.push('');
      out.push(`Tags: ${i.tags.map(t => '`' + t + '`').join(' ')}`);
    }
    if (i.blockers && i.blockers.length) {
      const labels = i.blockers.map(b => `TASK-${b.id} [${b.status}]${b.open ? ' 🚧' : ' ✅'} ${b.title}`);
      out.push('');
      out.push(`*🚧 Blocked by:* ${labels.join(' · ')}`);
    }
    if (i.drift) {
      out.push('');
      out.push(`*⚠️ Implications drift:*`);
      for (const d of i.drift) out.push(`- ${d}`);
    }
    if (i.commits.length) {
      out.push('');
      out.push('*Recent commits mentioning this task:*');
      for (const c of i.commits) out.push(`- ${c}`);
    }
    if (i.suggestion) {
      out.push('');
      out.push(`*Suggestion:* ${i.suggestion}`);
    }
    out.push('');
    out.push('Actions: `[done]` · `[snooze N]` · `[demote]` · `[promote]` · `[merge X]` · `[delete]` · `[keep]` · `[lane LANE]` · `[priority N]`');
    out.push('');
    out.push('---');
    out.push('');
  }
  return out.join('\n');
}

const report = buildReport();
if (asJson) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  process.stdout.write(renderMarkdown(report));
}
