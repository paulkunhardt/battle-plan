#!/usr/bin/env node
// tools/tasks/archive.js — move done/cancelled tasks older than N days from tasks.yml → tasks-archive.yaml
//
// Purpose: keep tasks.yml lean. Audit trail preserved in tasks-archive.yaml (same schema).
//
// Usage:
//   node tools/tasks/archive.js                  # default: archive done/cancelled with done_at < today - 14d
//   node tools/tasks/archive.js --days N         # custom threshold
//   node tools/tasks/archive.js --dry-run        # preview, no writes
//   node tools/tasks/archive.js --all            # archive ALL done/cancelled regardless of age
//
// Idempotent. Safe to run on every /wrap-up.

const fs = require('fs');
const path = require('path');
const tasks = require('./lib/tasks');

const ARCHIVE_PATH = path.resolve(__dirname, '../../tasks-archive.yaml');
const DEFAULT_DAYS = 14;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const archiveAll = args.includes('--all');
const daysArg = args.indexOf('--days');
const days = daysArg >= 0 && args[daysArg + 1] ? parseInt(args[daysArg + 1], 10) : DEFAULT_DAYS;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function serializeScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[' + v.map(x => (typeof x === 'number' || typeof x === 'boolean') ? String(x) : serializeString(x)).join(', ') + ']';
  }
  return serializeString(v);
}

function serializeString(s) {
  s = String(s);
  if (s === '' || /^(null|true|false|~)$/.test(s) || /^-?\d+$/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  if (/[:#\[\]{},&*!|>'"%@`\n]|^[\s-?]/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(x => parseScalar(x.trim()));
  }
  return s;
}

function loadArchive() {
  if (!fs.existsSync(ARCHIVE_PATH)) {
    return { tasks: [] };
  }
  const text = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const lines = text.split('\n');
  const result = { tasks: [] };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*#/.test(line) || line.trim() === '') { i++; continue; }
    if (/^tasks\s*:\s*$/.test(line)) { i++; break; }
    i++;
  }
  let cur = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    const listItem = line.match(/^\s*-\s+(\w+)\s*:\s*(.*)$/);
    if (listItem) {
      if (cur) result.tasks.push(cur);
      cur = {};
      cur[listItem[1]] = parseScalar(listItem[2]);
      continue;
    }
    const field = line.match(/^\s+(\w+)\s*:\s*(.*)$/);
    if (field && cur) {
      cur[field[1]] = parseScalar(field[2]);
    }
  }
  if (cur) result.tasks.push(cur);
  result.tasks.forEach(t => {
    if (typeof t.id === 'string') t.id = parseInt(t.id, 10);
    if (typeof t.priority === 'string') t.priority = parseInt(t.priority, 10);
    if (!Array.isArray(t.tags)) t.tags = t.tags ? [t.tags] : [];
  });
  return result;
}

function saveArchive(state) {
  state.tasks.sort((a, b) => {
    const ad = a.done_at || '9999-99-99';
    const bd = b.done_at || '9999-99-99';
    if (ad !== bd) return ad.localeCompare(bd);
    return (a.id || 0) - (b.id || 0);
  });

  const out = [];
  out.push('# tasks-archive.yaml — done/cancelled tasks moved out of tasks.yml. Audit trail.');
  out.push('# Same schema as tasks.yml. Sorted by done_at ascending.');
  out.push(`last_updated: ${today()}`);
  out.push('tasks:');
  for (const t of state.tasks) {
    let first = true;
    for (const k of tasks.FIELD_ORDER) {
      if (!(k in t)) continue;
      const prefix = first ? '  - ' : '    ';
      out.push(`${prefix}${k}: ${serializeScalar(t[k])}`);
      first = false;
    }
  }
  fs.writeFileSync(ARCHIVE_PATH, out.join('\n') + '\n');
}

const state = tasks.load();
const archive = loadArchive();
const t0 = today();
const cutoff = archiveAll ? '9999-99-99' : daysAgo(days);

const toArchive = [];
const toKeep = [];

for (const t of state.tasks) {
  const isClosed = t.status === 'done' || t.status === 'cancelled';
  const closedDate = t.done_at;

  if (isClosed && closedDate && (archiveAll || closedDate < cutoff)) {
    toArchive.push(t);
  } else if (isClosed && !closedDate) {
    // Backfill safety: stamp today and keep one cycle.
    t.done_at = t0;
    toKeep.push(t);
  } else {
    toKeep.push(t);
  }
}

const archivedIds = new Set(archive.tasks.map(t => t.id));
const newToArchive = toArchive.filter(t => !archivedIds.has(t.id));
const dupes = toArchive.length - newToArchive.length;

if (dryRun) {
  console.log(`[DRY RUN] Would archive ${newToArchive.length} task(s) (cutoff: done_at < ${cutoff})`);
  if (dupes > 0) console.log(`         ${dupes} already in archive (skipped)`);
  for (const t of newToArchive) {
    console.log(`  - TASK-${t.id} [${t.status}] done_at=${t.done_at}: ${(t.title || '').slice(0, 80)}`);
  }
  console.log(`\nWould keep ${toKeep.length} task(s) in tasks.yml.`);
  process.exit(0);
}

if (newToArchive.length === 0) {
  const closedCount = state.tasks.filter(t => t.status === 'done' || t.status === 'cancelled').length;
  console.log(`No tasks to archive (cutoff: done_at < ${cutoff}). ${closedCount} closed task(s) still within retention window.`);
  process.exit(0);
}

archive.tasks.push(...newToArchive);
saveArchive(archive);

state.tasks = toKeep;
tasks.save(state);

console.log(`✓ Archived ${newToArchive.length} task(s) to tasks-archive.yaml`);
console.log(`  tasks.yml: ${toKeep.length} remaining (was ${toKeep.length + newToArchive.length})`);
if (dupes > 0) console.log(`  Skipped ${dupes} already-archived task(s).`);

const oldest = newToArchive.reduce((a, b) => ((a.done_at || '9') < (b.done_at || '9') ? a : b));
const newest = newToArchive.reduce((a, b) => ((a.done_at || '0') > (b.done_at || '0') ? a : b));
console.log(`  Date range: ${oldest.done_at} → ${newest.done_at}`);
