# Changelog

All notable changes to `create-battle-plan` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-05-07

### Added
- **Task system v2 — lanes, implications, weekly triage.** Tasks now carry
  a `lane` field (default vocab: `build / outreach / discovery / infra /
  fundraising / meta`) grouping them by primary action. `today.md` groups
  open tasks by lane within each priority bucket and emits `#lane/<lane>`
  hashtags so the Obsidian Tasks plugin can filter on them. Tasks may
  also carry an optional `implications: [doc paths...]` array — the docs
  that should change when the task closes.
- **`tools/tasks/triage.js`** — read-only triage data layer. Surfaces
  overdue / stale tasks, recent commits mentioning each task ID, and
  *implications drift* (linked doc untouched since task creation).
  Markdown to stdout by default; `--json` for programmatic consumers;
  `--lane LANE` to filter; `--stale-days N` to tune.
- **`tools/tasks/triage-due.js`** — lightweight SessionStart-hook nudge.
  Silent unless triage is due (≥7d since last triage, or ≥20 stale
  ≥14d-old tasks, or ≥60 open total). Wired in `.claude/settings.json`.
- **`tools/tasks/migrate-lanes.js`** — one-shot heuristic backfill of the
  `lane` field on existing tasks. Tags-then-title two-pass classifier;
  generic keyword buckets; tasks falling through default to `meta`.
  Adapt the keyword table to your project. Idempotent.
- **`/weekly-triage` slash command** (`.claude/commands/weekly-triage.md`).
  Walks the user through every open task one at a time using
  `AskUserQuestion`'s arrow-key UI. Each decision (`done` / `snooze N` /
  `demote` / `merge X` / `delete` / `lane LANE` / `priority N` / `keep`)
  is applied to `tasks.yml` immediately. Stamps `last_triage_at` on
  completion to suppress the SessionStart nudge until the next cycle.
- **`in_progress` task status with `[/]` checkbox.** `render-today.js`
  emits `[/]` for in-progress tasks and `flush-today.js` round-trips it
  back to `status: in_progress`. Open ↔ in_progress transitions are now
  honored in the reconciler.
- **CLAUDE.md additions:** lane vocabulary table, weekly-triage workflow,
  strategic-vs-routine principle (`tasks.yml` is for ad-hoc strategic
  work; routine pipeline maintenance lives in `daily-targets.js` +
  `leads.csv` flags), and "personalities don't get their own lane".
- **`add.js` flags:** `--lane LANE` (validated against `VALID_LANES`,
  defaults to `meta`) and `--implication PATH` (repeatable, accumulates
  to `task.implications`).

### Changed
- The Two-View Model section of CLAUDE.md is sharper: the chat is the
  user's only UI; the cascade and `tasks.yml` exist for the LLM, not
  the human. `today.md` is a thin clickable surface.

### Migration
- Fully additive. Existing `tasks.yml` rows without `lane` load fine
  and render under `meta`. Run `node tools/tasks/migrate-lanes.js --dry`
  to preview heuristic classifications, then re-run without `--dry` to
  apply. Adapt the `LANE_KEYWORDS` table in `migrate-lanes.js` to your
  project's vocabulary first.
- No schema break in `metrics.yml` or any existing doc.

## [1.2.0] - 2026-04-23

### Added
- **Script-owned daily task view subsystem.** New `tasks.yml` at repo
  root is the source of truth for open/done/snoozed/cancelled tasks.
  `node tools/tasks/render-today.js` regenerates `docs/today.md` from
  it, formatted for the Obsidian Tasks plugin (query blocks on top
  project pill-styled lists over a raw `## Task data` section at the
  bottom). `node tools/tasks/flush-today.js` reconciles checkbox edits
  back into `tasks.yml` and archives the daily file to
  `docs/today-archive/YYYY-MM-DD.md`. `node tools/tasks/add.js "..."
  [--due ...] [--tag ...] [--priority 1|2|3]` appends a task.
- **Two-View Model** documented in `CLAUDE.md`: the cascade is the
  LLM's orientation layer, `docs/today.md` is the user's operating
  surface. The LLM never grows the battle-plan TL;DR into a prose
  blob; tasks go through `add.js`, not buried in daily-log bullets.
- **`verify-cascade.sh` Check 6**: warns if `tasks.yml` is newer than
  `docs/today.md` (prompts `render-today.js`).
- **`README.md` — "How this system is meant to be used"** section
  explaining the two-layer model (cascade vs. today.md) before
  installation, so first-time users don't over-edit the battle plan
  and under-use the daily surface.

### Changed
- `good-morning` command gathers state via `render-today.js --quiet`
  and reads `docs/today.md` first. Battle plan is read on-demand for
  deep context, not by default.

### Migration
- Fully additive. Existing battle-plan projects: run
  `node tools/tasks/render-today.js` once to generate
  `docs/today.md`, install the Obsidian Tasks plugin (optional — the
  raw `- [ ]` lines still work in any markdown editor), start adding
  tasks via `add.js`.
- No schema break in `metrics.yml` or any existing doc.
