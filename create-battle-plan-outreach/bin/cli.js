#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Colors ───────────────────────────────────────────────

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';

// ── Helpers ──────────────────────────────────────────────

let rl;

function initReadline() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

function closeReadline() {
  if (rl) { rl.close(); rl = null; }
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Banner ───────────────────────────────────────────────

function banner() {
  console.log('');
  console.log(`${BOLD}${WHITE}    ___  ____ ___ ___ _    ____${RESET}`);
  console.log(`${BOLD}${WHITE}    |__] |__|  |   |  |    |___${RESET}`);
  console.log(`${BOLD}${WHITE}    |__] |  |  |   |  |___ |___${RESET}`);
  console.log('');
  console.log(`${BOLD}${WHITE}   ___  _    ____ _  _${RESET}`);
  console.log(`${BOLD}${WHITE}   |__] |    |__| |\\ |${RESET}`);
  console.log(`${BOLD}${WHITE}   |    |___ |  | | \\|${RESET}`);
  console.log('');
  console.log(`${BOLD}${CYAN}   OUTREACH ADD-ON${RESET}`);
  console.log('');
  console.log(`${DIM}   A CSV-powered outreach pipeline${RESET}`);
  console.log(`${DIM}   for Battle Plan projects${RESET}`);
  console.log('');
  console.log(`${DIM}   ─────────────────────────────${RESET}`);
  console.log('');
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  banner();

  const cwd = process.cwd();

  // ── Check prerequisites ──────────────────────────────

  if (!fs.existsSync(path.join(cwd, '.battle-plan-initialized'))) {
    console.log(`${YELLOW}   This directory doesn't look like a Battle Plan project.${RESET}`);
    console.log(`${YELLOW}   Run ${BOLD}npx create-battle-plan${RESET}${YELLOW} first, then come back.${RESET}`);
    console.log('');
    process.exit(1);
  }

  // ── Check if already installed ───────────────────────

  if (fs.existsSync(path.join(cwd, 'outreach', 'leads.csv'))) {
    console.log(`${YELLOW}   Outreach system already installed (outreach/leads.csv exists).${RESET}`);
    console.log('');
    process.exit(1);
  }

  initReadline();

  // ── Question 1/2: Existing leads? ────────────────────

  const hasLeads = await ask(
    `${DIM}[1/2]${RESET} ${BOLD}Do you already have a leads CSV or contact list?${RESET} ${DIM}(y/n)${RESET}\n> `
  );
  console.log('');

  if (hasLeads.toLowerCase() === 'y' || hasLeads.toLowerCase() === 'yes') {
    console.log(`${GREEN}   Great!${RESET} Drop it at ${BOLD}outreach/leads.csv${RESET} after setup.`);
    console.log(`${DIM}   Claude will help you map the columns on your next session.${RESET}`);
  } else {
    console.log(`${DIM}   No problem. You can add leads later — Claude will walk you through it.${RESET}`);
  }
  console.log('');

  // ── Question 2/2: Message template? ──────────────────

  const templateInput = await ask(
    `${DIM}[2/2]${RESET} ${BOLD}Want to set up a message template now?${RESET} ${DIM}(paste it, or press enter to skip)${RESET}\n> `
  );
  console.log('');

  closeReadline();

  // ── Copy template files ──────────────────────────────

  console.log(`${CYAN}   Installing...${RESET}`);
  console.log('');

  const templateDir = path.join(__dirname, '..', 'template');
  copyDir(templateDir, cwd);

  // ── Save custom template if provided ─────────────────

  if (templateInput) {
    const templatesPath = path.join(cwd, 'tools', 'outreach', 'templates.json');
    if (fs.existsSync(templatesPath)) {
      const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      templates.A.text = templateInput;
      fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2) + '\n');
    }
  }

  // ── Make scripts executable ──────────────────────────

  const outreachToolsDir = path.join(cwd, 'tools', 'outreach');
  if (fs.existsSync(outreachToolsDir)) {
    for (const f of fs.readdirSync(outreachToolsDir)) {
      if (f.endsWith('.js')) {
        fs.chmodSync(path.join(outreachToolsDir, f), 0o755);
      }
    }
    // Also handle lib/ subdirectory
    const libDir = path.join(outreachToolsDir, 'lib');
    if (fs.existsSync(libDir)) {
      for (const f of fs.readdirSync(libDir)) {
        if (f.endsWith('.js')) {
          fs.chmodSync(path.join(libDir, f), 0o755);
        }
      }
    }
  }

  // ── Append outreach metrics to metrics.yml ───────────

  const metricsPath = path.join(cwd, 'metrics.yml');
  if (fs.existsSync(metricsPath)) {
    const outreachMetrics = `
# Outreach pipeline (derived from leads.csv — do not edit manually)
outreach_sent: 0
responses: 0
invitations_accepted: 0
discovery_calls: 0
calls_booked: 0
verbal_commitments: 0
`;
    fs.appendFileSync(metricsPath, outreachMetrics);
  }

  // ── Create docs/analysis/ directory ──────────────────

  fs.mkdirSync(path.join(cwd, 'docs', 'analysis'), { recursive: true });

  // ── Summary ──────────────────────────────────────────

  console.log(`${DIM}   ─────────────────────────────${RESET}`);
  console.log('');
  console.log(`${GREEN}${BOLD}   Ready.${RESET}`);
  console.log('');
  console.log(`${BOLD}   Added:${RESET}`);
  console.log(`${DIM}     + outreach/          ${WHITE}(leads.csv, inbox, archive)${RESET}`);
  console.log(`${DIM}     + tools/outreach/    ${WHITE}(11 scripts)${RESET}`);
  console.log(`${DIM}     + docs/analysis/     ${WHITE}(mermaid dashboard target)${RESET}`);
  console.log('');
  console.log(`${DIM}   ─────────────────────────────${RESET}`);
  console.log('');
  console.log(`   Next: open Claude Code and type ${GREEN}${BOLD}/good-morning${RESET}`);
  console.log(`   Claude will walk you through importing your`);
  console.log(`   first leads and explain the daily workflow.`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
