---
description: Walk through every open task lane-by-lane with a multi-choice action menu. Closes stale items, merges duplicates, re-lanes mis-classified work. Stamps last_triage_at when done.
---

# Weekly Triage

Run this once a week to keep `tasks.yml` honest. The user clicks through each open task with arrow-key choices; you apply each decision to `tasks.yml` immediately.

## Step 0 — Anchor to real time

Run `date` to anchor today's date. Don't infer from session context.

## Step 1 — Gather state

Run `node tools/tasks/triage.js --json` and parse the output. Also run `git log --oneline -30` for context on recent commits.

## Step 2 — Briefing

Tell the user the headline numbers from the report's `stats` block:

- Total open
- Overdue
- Stale (≥ stale_threshold_days, not overdue)
- Distribution by lane

Surface anything notable: the worst overdue, the most stale lane, any drift flags.

Ask:

> Walk through lane-by-lane in order (build → outreach → discovery → infra → fundraising → meta), or start with a specific lane?

## Step 3 — Walk one task at a time

For each open task in the chosen order:

1. Show 3-4 lines: title, key flags, a one-line context snippet, and the script's `suggestion` if any.
2. Use `AskUserQuestion` with these standard options (label them concisely — these are the most common decisions):
   - **Done** — task is complete
   - **Snooze 7 days** — defer; resurfaces in a week
   - **Demote** — drop priority by one
   - **Merge into TASK-X** — kill this task, fold into another (ask for X)
3. The user can pick "Other" to type a custom action: `delete`, `promote`, `keep`, `lane <LANE>`, `priority <N>`, `snooze <N>` for a custom snooze window, etc.

**Pacing:** present **one task at a time**. If the user says "go faster" or "skip ahead", batch 3-5 per message. If they say "keep all of these", apply `keep` to the whole lane.

## Step 4 — Apply decisions immediately (no batching)

For each user choice, Edit `tasks.yml` right away. Map decisions:

| Choice | Field changes |
|---|---|
| `done` | `status: done`, `done_at: <today>` |
| `snooze N` | `status: snoozed`, `snoozed_until: <today + N days>` |
| `demote` | `priority: priority + 1` (capped at 3) |
| `promote` | `priority: priority - 1` (floored at 1) |
| `merge X` | `status: cancelled`, prepend `"Merged into TASK-X — <today>"` to context |
| `delete` | `status: cancelled`, prepend `"Deleted via triage <today>"` to context |
| `lane <LANE>` | `lane: <LANE>` (validate against VALID_LANES in lib/tasks.js) |
| `priority <N>` | `priority: <N>` |
| `keep` | no change |

The "Merge into X" action is high-leverage when triaging a long pile — collapse scattered concerns into a single owner with consolidated context.

## Step 5 — Wrap up

Three things, in order:

### 5a. Stamp `last_triage_at`

This suppresses the SessionStart triage-due nudge until the next cycle. Without this, the nudge keeps firing on every session start and becomes spam.

```bash
node -e "const t=require('./tools/tasks/lib/tasks'); const s=t.load(); s.last_triage_at='$(date +%Y-%m-%d)'; t.save(s);"
```

### 5b. Regenerate today.md

```bash
node tools/tasks/render-today.js
```

### 5c. Print summary

- Tasks closed: N
- Tasks snoozed: N
- Tasks merged: N
- Tasks re-laned: N
- Open tasks remaining: N (was N before)
- Implications-drift heads-up: list any tasks where the linked doc still hasn't moved and the user kept the task open

## Tone

Direct. Bounded decisions. Don't editorialize on each task — you're a UI, not a coach.
