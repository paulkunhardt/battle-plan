---
description: End-of-day wrap-up — status check, final cascade, metrics report, and commit. Run at the end of each work day.
---

# End-of-Day Wrap-Up

Run these steps in order. Be concise.

## Step 1: Scan

Read `docs/battle-plan.md` and `metrics.yml`. Find today's day section. Categorize all tasks:
- Done
- Partially done
- Not started
- New (added during the day but not in the morning plan)

## Step 2: Present

Show the user:
```
Today's status:
[x] [done tasks]
[~] [partial tasks]
[ ] [not started]
[+] [new things that happened]
```

Ask: "Does this look right?"

## Step 3: Prompt

Ask: "Anything else happen today? Even small things — a reply, an update, a thought, a link. Everything counts."

Wait for the user's answer before proceeding.

## Step 4: Cascade

With all info gathered, run the full cascade from CLAUDE.md:
1. Update `metrics.yml` if any metric changed
2. Update battle plan TL;DR + today's day log
3. Update source docs (only what's relevant to today's changes)
4. Run `tools/touch-date.sh` on every modified file
5. Run `tools/verify-cascade.sh` — fix any errors

## Step 4.5: Task hygiene — REQUIRED daily

This step keeps `tasks.yml` honest. Run before regenerating `today.md` so any closures land in the day's surface.

**4.5a — Detect drift (tasks that should be closed but aren't):**

Run `node tools/tasks/triage.js --json` and scan the output for any open task with non-empty `recent_commits` (commits mentioning `TASK-N` since the task was created). For each:
- Surface to the user: "TASK-{id} ({title}) — recent commit '{subject}' suggests it's done. Mark closed?"
- If yes → set `status: done`, `done_at: <today>` via Edit on `tasks.yml`. If no → leave it.

Also surface any open task with `implications_drift` flagged (linked doc untouched since task created) — the user may have closed the work without updating the doc, OR the doc work is genuinely pending.

**4.5b — Archive old closed tasks:**

Run `node tools/tasks/archive.js`. This moves any `status: done|cancelled` row with `done_at < today - 14d` into `tasks-archive.yaml` (created on first run). Idempotent. Default retention = 14 days; pass `--days N` to override or `--all` to archive everything closed.

**4.5c — Regenerate today.md:**

Run `node tools/tasks/render-today.js --quiet` so today's surface reflects any closures from 4.5a.

If 4.5a/4.5b changed anything, list it in Step 5 ("Task hygiene: N closed via git-drift, M archived").

## Step 5: Report

Print:
- **Metrics changed today** (before -> after, with deltas)
- **Docs updated** (list of files touched)
- **Verification warnings** (if any)
- **Tomorrow's top priorities** (carry-forwards + known agenda items)
- **Task hygiene** (if Step 4.5 changed anything)

## Step 6: Commit

Ask: "Want me to commit today's updates?"

If yes, commit with message: `eod YYYY-MM-DD: [one-line summary]`

## Tone

Direct. No fluff. Close out fast.
