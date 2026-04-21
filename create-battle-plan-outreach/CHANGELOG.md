# Changelog

All notable changes to `create-battle-plan-outreach` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-04-21

### Fixed
- Inline metadata edits (`emp:`, `rev:`, `type:`, title, country) on
  follow-up rows in the daily blitz were silently dropped on flush —
  only `type:` was being synced back to `leads.csv`. Symptom: "I keep
  fixing `emp` and `rev` on the same follow-up leads every day and it
  never sticks." The follow-up and snooze branches in `flush-targets.js`
  now route through the same `applyMetadataEdits()` helper already used
  by the withdrawal, InMail, and new-DM branches.
- You can now edit metadata on a follow-up row **without** ticking any
  action checkbox. The parser picks up the inline edits and persists
  them via the existing `isMetadataOnly` path — same behavior the
  withdrawal section has always had.

## [1.2.0] - 2026-04-21

### Fixed
- Follow-up cooldown now anchors to the accept date instead of the original DM
  date. Previously, when a lead accepted a weeks-old connection request, the
  3-day follow-up cooldown was measured against the original DM — so the lead
  landed in the next day's follow-up pool before they'd had a chance to react
  to the connection note. `flush-accepts.js` now stamps `followed_up_at = today`
  whenever it tags a lead as `accepted`, so the cooldown restarts from the
  accept date.

### Added
- **Snooze button** on follow-up items in the daily blitz. Tick
  `[x] 💤 snooze (not ready yet)` to defer a follow-up without sending a
  message: `followed_up_at` is reset to today, no metric is bumped, and the
  lead reappears in the follow-up pool 3+ days later. Use cases:
  - Manual override when the 3-day heuristic is too eager (e.g. the lead
    has been actively viewing your profile).
  - Retroactive fix for leads tagged `accepted` before the `flush-accepts.js`
    fix above shipped.

### Migration

No schema change, no manual migration required.

Leads that were tagged `accepted` **before** this release will not have a
proper `followed_up_at` stamp. They will surface in the follow-up pool
anchored to the old DM date. You have two options:

1. **Snooze them one by one** as they appear in the daily blitz — the new
   snooze button handles this cleanly.
2. **Backfill manually** (optional, for high-volume users): for every lead
   with the `accepted` tag and no `followed_up_at`, copy the accept-date
   from the `notes` field (pattern `Accepted connection YYYY-MM-DD | …`)
   into the `followed_up_at` column of `outreach/leads.csv`.

## [1.1.0] - 2026-04-20

- Priority scoring, rejection loop, InMail gating, stale invitation tracking.
- Fix: use proper ISO 8601 week numbering in weekly breakdown.

## [1.0.0] - Initial release

- CSV-powered outreach pipeline with daily blitz, metrics sync, and
  mermaid dashboards as a Battle Plan add-on.

[1.2.1]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.2.1
[1.2.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.2.0
[1.1.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.1.0
[1.0.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.0.0
