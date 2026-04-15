#!/usr/bin/env node
// Batch-process LinkedIn connection accepts against leads.csv.
//
// Usage:
//   1. Drop names into outreach/inbox/accepts.txt (one per line, raw from LinkedIn)
//   2. node tools/outreach/flush-accepts.js
//
// What it does:
//   - Fuzzy-matches each name against leads.csv (first_name + last_name)
//   - Reports: found/not-found, current status, already-accepted
//   - For matches: adds "accepted" tag (if missing), adds note with date
//   - Bumps metrics.yml#invitations_accepted to reflect new unique accepts
//   - Skips duplicates (already tagged "accepted")
//
// Cost: €0 (no API calls)

const fs = require('fs');
const path = require('path');
const { load, save } = require('./lib/leads');
const { syncMetrics } = require('./sync-metrics');

const ROOT = path.resolve(__dirname, '../..');
const ACCEPTS_PATH = path.join(ROOT, 'outreach/inbox/accepts.txt');
const ARCHIVE = path.join(ROOT, 'outreach/archive');

const today = new Date().toISOString().slice(0, 10);

// --- Name normalization ---

function normName(s) {
  return (s || '')
    .replace(/\b(Dr\.?|PhD|CISSP|CISM|QTE|MBA|CPA|CISA|Prof\.?)\b/gi, '')
    .replace(/[^\p{L}\s-]/gu, '')  // keep letters, spaces, hyphens
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitName(raw) {
  const clean = normName(raw);
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// --- Matching ---

function matchScore(inputFirst, inputLast, leadFirst, leadLast) {
  const lf = normName(leadFirst);
  const ll = normName(leadLast);

  // Exact match
  if (inputFirst === lf && inputLast === ll) return 100;

  // Last name exact + first name starts-with (handles "Oleksandr" vs "Oleksandr")
  if (inputLast === ll && (inputFirst.startsWith(lf) || lf.startsWith(inputFirst))) return 90;

  // First name exact + last name contains or is contained
  if (inputFirst === lf && (inputLast.includes(ll) || ll.includes(inputLast))) return 85;

  // Both first and last partially match
  if (lf.startsWith(inputFirst.slice(0, 3)) && ll.startsWith(inputLast.slice(0, 3))) return 70;

  // Last name only match (common for multi-part last names)
  if (inputLast === ll || inputLast.endsWith(ll) || ll.endsWith(inputLast)) return 50;

  return 0;
}

function findBestMatch(name, rows) {
  const { first, last } = splitName(name);
  if (!first && !last) return null;

  let best = null;
  let bestScore = 0;

  for (const row of rows) {
    const score = matchScore(first, last, row.first_name, row.last_name);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore >= 50 ? { row: best, score: bestScore } : null;
}

// --- Main ---

function main() {
  // Read accepts file
  if (!fs.existsSync(ACCEPTS_PATH)) {
    console.error(`No file at ${ACCEPTS_PATH}`);
    console.error('Create it with one name per line, e.g.:');
    console.error('  Arturo Beltran Fonollosa, PhD');
    console.error('  Jakob Melander');
    process.exit(1);
  }

  const raw = fs.readFileSync(ACCEPTS_PATH, 'utf8');
  const names = raw.split('\n')
    .map(l => l.replace(/accepted your invitation to connect\.?/i, '').trim())
    .filter(Boolean);

  if (!names.length) {
    console.log('No names found in accepts.txt');
    process.exit(0);
  }

  console.log(`📋 Processing ${names.length} connection accepts...\n`);

  const rows = load();
  const results = { matched: [], already: [], notFound: [], updated: [] };

  for (const name of names) {
    const match = findBestMatch(name, rows);

    if (!match) {
      results.notFound.push(name);
      console.log(`  ❓ ${name} — NOT FOUND in leads.csv`);
      continue;
    }

    const { row, score } = match;
    const tags = (row.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const alreadyAccepted = tags.includes('accepted');

    if (alreadyAccepted) {
      results.already.push({ name, row });
      console.log(`  ⏭️  ${name} → ${row.first_name} ${row.last_name} (${row.company}) — already tagged accepted [status: ${row.status}]`);
      continue;
    }

    // Add accepted tag
    tags.push('accepted');
    row.tags = tags.join(',');

    // Prepend note
    const note = `Accepted connection ${today}`;
    row.notes = row.notes ? `${note} | ${row.notes}` : note;

    results.updated.push({ name, row, score });
    console.log(`  ✅ ${name} → ${row.first_name} ${row.last_name} (${row.company}) [status: ${row.status}] — tagged accepted${score < 100 ? ` (match: ${score}%)` : ''}`);
  }

  // Save if anything changed
  if (results.updated.length > 0) {
    save(rows);
    console.log(`\n💾 Saved ${results.updated.length} updates to leads.csv`);
  }

  // Derive all metrics from CSV (single source of truth)
  if (results.updated.length > 0) {
    syncMetrics();
  }

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`  Updated:   ${results.updated.length}`);
  console.log(`  Already:   ${results.already.length}`);
  console.log(`  Not found: ${results.notFound.length}`);

  if (results.notFound.length) {
    console.log(`\n⚠️  Not found (may not be in leads.csv or name mismatch):`);
    results.notFound.forEach(n => console.log(`    - ${n}`));
  }

  // Archive the file
  if (!fs.existsSync(ARCHIVE)) fs.mkdirSync(ARCHIVE, { recursive: true });
  const archiveName = `accepts-${today}.txt`;
  fs.renameSync(ACCEPTS_PATH, path.join(ARCHIVE, archiveName));
  console.log(`\n📁 Archived → outreach/archive/${archiveName}`);
}

main();
