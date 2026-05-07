# Changelog

All notable changes to `create-battle-plan-outreach` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-04-21

### Fixed
- Rejection now works on **any** lead status, not just `new`. Previously,
  ticking `[x] reject` on a `dm_sent` lead (typical in the InMail or
  follow-up section) did nothing — status stayed `dm_sent`, no tag, no
  note, and the lead re-surfaced in the next blitz. The processor loop
  is now idempotent: it marks any non-`dead` lead as `dead` and appends
  a `(was dm_sent)`-style audit trail to the note when the prior status
  wasn't `new`.
- Ticking `[x] reject` **and** `[x] 🗑️ withdraw connection` on the same
  line now records both signals. Reject still wins precedence (lead is
  terminal), but a `Connection withdrawn on LinkedIn` note is written
  so the record matches what you did on LinkedIn.
- Rejected items now also flow through `applyMetadataEdits()`, so
  inline `emp:` / `rev:` / `type:` corrections on a reject line persist.

### Changed
- Console summary after flush now annotates rejections that came from
  non-new stages, e.g. `❌ Rejected 6 leads (marked dead) (incl. 5 from
  prior stages)`.

### Migration

No schema change. Leads where you previously ticked `reject` on a
non-`new` row and nothing happened are still `dm_sent` in your CSV.
Two options:
1. **Do nothing** — next time they appear in a blitz, re-tick reject and
   this version will handle them.
2. **Backfill** (optional) — any lead whose `notes` contains a
   `Rejected in blitz YYYY-MM-DD` line but whose `status` is not `dead`
   can have its status flipped to `dead` in a one-shot CSV edit.

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

[1.3.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.3.0
[1.3.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.3.0
[1.2.2]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.2.2
[1.2.1]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.2.1
[1.2.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.2.0
[1.1.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.1.0
[1.0.0]: https://github.com/paulkunhardt/battle-plan/releases/tag/outreach-v1.0.0
