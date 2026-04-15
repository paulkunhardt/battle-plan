#!/usr/bin/env node
// Check names against leads.csv — find existing records, flag duplicates.
//
// Usage:
//   node tools/outreach/lookup.js "Mark Dorsi, Chakib Benyakhlef, Some Unknown"
//   node tools/outreach/lookup.js outreach/inbox/names.txt
//
// Input formats:
//   - Comma-separated string as CLI argument
//   - File path (one name per line, or comma-separated)
//   - Reads from stdin if no args: echo "Name1, Name2" | node tools/outreach/lookup.js
//
// Output: For each name, shows match status + current lead data if found.

const fs = require('fs');
const path = require('path');
const { load } = require('./lib/leads');

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function fuzzyMatch(name, row) {
  const norm = normalize(name);
  const parts = norm.split(' ').filter(Boolean);
  if (parts.length === 0) return false;

  const first = normalize(row.first_name);
  const last = normalize(row.last_name);
  const company = normalize(row.company);
  const full = `${first} ${last}`;

  // Exact full name
  if (full === norm) return { score: 100, type: 'exact' };

  // All parts match against first+last+company
  const pool = `${first} ${last} ${company}`;
  const allMatch = parts.every(p => pool.includes(p));
  if (allMatch && parts.length >= 2) return { score: 90, type: 'fuzzy' };

  // Last name exact match (common for single-name lookups)
  if (parts.length === 1 && last === norm) return { score: 70, type: 'last-name' };
  if (parts.length === 1 && first === norm) return { score: 60, type: 'first-name' };

  return false;
}

function parseNames(input) {
  // Split by comma or newline, trim, filter empties
  return input.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

// --- Main ---
let input = '';
const arg = process.argv.slice(2).join(' ').trim();

if (arg && fs.existsSync(arg)) {
  input = fs.readFileSync(arg, 'utf8');
} else if (arg) {
  input = arg;
} else {
  input = fs.readFileSync(0, 'utf8'); // stdin
}

const names = parseNames(input);
if (names.length === 0) {
  console.log('No names provided.');
  process.exit(1);
}

const rows = load();

console.log(`\n🔍 Looking up ${names.length} name(s) against ${rows.length} leads:\n`);

const found = [];
const notFound = [];

for (const name of names) {
  const matches = [];
  for (const row of rows) {
    const m = fuzzyMatch(name, row);
    if (m) matches.push({ row, ...m });
  }
  matches.sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    const best = matches[0];
    const r = best.row;
    const tags = (r.tags || '').split(',').filter(Boolean);
    const statusIcon = {
      'new': '⬜', 'dm_sent': '📨', 'replied': '💬', 'call_booked': '📅',
      'call_done': '✅', 'verbal': '🤝', 'loi': '📝', 'paying': '💰', 'dead': '💀'
    }[r.status] || '❓';

    console.log(`  ${statusIcon} FOUND: "${name}" → ${r.first_name} ${r.last_name} · ${r.company} [${r.status}] (${best.type}, ${best.score}%)`);
    if (r.tags) console.log(`     tags: ${r.tags}`);
    if (r.notes) console.log(`     notes: ${(r.notes || '').slice(0, 120)}${r.notes.length > 120 ? '…' : ''}`);
    if (matches.length > 1) console.log(`     ⚠️  ${matches.length - 1} other possible match(es)`);
    found.push({ name, match: best });
  } else {
    console.log(`  ❌ NOT FOUND: "${name}"`);
    notFound.push(name);
  }
}

console.log(`\n--- Summary ---`);
console.log(`  Found:     ${found.length}`);
console.log(`  Not found: ${notFound.length}`);
if (notFound.length > 0) {
  console.log(`  Missing:   ${notFound.join(', ')}`);
}
console.log();
