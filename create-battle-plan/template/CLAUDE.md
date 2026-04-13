# Battle Plan — System Prompt

You are helping manage an interconnected documentation system. Every document stays in sync through a cascade protocol. Follow these rules exactly.

---

## The Cascade Protocol

**Trigger:** Any incoming information that relates to the project — calls, messages, research, signals, status changes, decisions.

When triggered, update in this exact order:

### Step 0: Update `metrics.yml`
If any key metric changed, update `metrics.yml` first. This is the numeric source of truth.

### Step 1: Update Battle Plan (`docs/battle-plan.md`)
- Update the **TL;DR** with current status
- Update the **Key Metrics** table (numbers reference metrics.yml)
- Update **Today's Priorities** if relevant
- Append to **Daily Log** for today

### Step 2: Update Cascade Docs
Update only the docs relevant to the new information. Route new info to the appropriate domain doc under `docs/`. Common patterns:

| Info type | Route to... |
|-----------|------------|
| Conversation, call, or meeting | `docs/external-insights.md` — append as new dated session |
| Evidence for/against a hypothesis | The relevant domain doc — amend the claim with an `[UPDATE]` block |
| Outreach sent/received | The relevant market or sales doc — update tracking tables |
| Competitor intel | The relevant strategy or market doc |
| New foundational knowledge | The relevant research or domain doc |

If no doc exists for the info, append it to the closest domain overview doc. Only create a new file if the info doesn't fit anywhere.

### Step 3: Update Dates
Run `tools/touch-date.sh` on every file you modified in this session:

```bash
tools/touch-date.sh docs/battle-plan.md docs/validation/hypotheses.md [etc.]
```

### Step 4: Verify
Run `tools/verify-cascade.sh` and fix any issues it reports:

```bash
tools/verify-cascade.sh
```

---

## Source Reference Rules

### Registry Metrics (Tier 1 — deterministic)
Numbers defined in `metrics.yml`. Reference as: `[**N**](metrics.yml#field_name)`

This renders as a bold clickable number. Example: `[**42**](metrics.yml#outreach_sent)`

These are verified by exact numeric comparison via `tools/check-metrics.sh`.

### Inline Metrics (Tier 2 — LLM-verified)
Less common numbers from another doc. Reference as: `[**N**](source-doc.md#section-slug)`

Example: `60% of time on evidence [**60**](external-insights.md#session-2-key-insights)`

**Rule:** Every number referenced from another document MUST include a source annotation. Only numbers native to a doc (where they originate) have no annotation.

---

## Document Format

Every doc in `docs/` must have this frontmatter:

```markdown
# Document Title

**Last Updated:** 2026-04-07
**Status:** Active | Draft | Archived
**Role:** source-of-truth | cascade-target
**Compression:** chronological | amended | none

**TL;DR:** One paragraph summary with key numbers and source references.

---
```

- **Last Updated** must match today's date on any file modified in the current session.
- **Status:** `Active` = live, `Draft` = WIP, `Archived` = excluded from cascade.
- **Role:** `source-of-truth` = authoritative for its numbers. `cascade-target` = references numbers from elsewhere.
- **Compression:** required field. One of `chronological`, `amended`, or `none` (see Compression Modes section below).
- **TL;DR** must exist and contain all key metrics that appear in the doc.

---

## Compression Modes & Timestamping Rules

Every doc declares a `Compression:` mode in frontmatter. This tells the `/distill` command (and humans) how new info gets added to the doc and how old info gets compressed when it grows too long. The mode IS the timestamping rule for new info.

### `Compression: chronological`
The doc is an append-only log of dated entries. Each new piece of info goes in a new dated section.

- **Timestamping rule:** every new entry MUST start with a dated heading: `## Session N (YYYY-MM-DD) — <title>`, `## YYYY-MM-DD — <title>`, or `## DD Month YYYY — <title>`. No exceptions.
- **Examples:** `docs/battle-plan.md` (daily log), `docs/validation/external-insights.md` (conversation journal).
- **`/distill` behavior:** keeps the N most recent dated sections verbatim, archives the rest into `docs/archive/<same-path>`, replaces them with a thorough summary.

### `Compression: amended`
The doc is a living reference. Claims are amended in place over time.

- **Timestamping rule:** every new finding that revises an existing claim MUST be added as an inline `> **[UPDATE YYYY-MM-DD · Source: ...]**` block placed immediately above the claim it modifies. Brand-new claims with no prior version don't need a stamp; they're stamped implicitly by the doc's `Last Updated` date and git history.
- **Examples:** `docs/validation/hypotheses.md`, `docs/market/icp-and-targets.md`, `docs/market/competitive-landscape.md`.
- **`/distill` behavior:** collapses old `[UPDATE]` blocks into the body text (preserving their content as integrated current-state), archives the raw blocks verbatim. Keeps the N most recent amendments per section inline.

### `Compression: none`
The doc is a static thesis or reference. It gets rewritten, not amended. Git history is the timeline.

- **Timestamping rule:** none. Just edit the doc and let `Last Updated` + git track changes.
- **Examples:** `docs/strategy/product-thesis.md`, `docs/research/domain-101.md`.
- **`/distill` behavior:** refuses to run. If a `none` doc has grown unwieldy, rewrite it manually or change its `Compression:` mode first.

### Why this matters
The TL;DR is current state, not history. It can't tell `/distill` what's new vs old. The `Compression:` mode + timestamping rule is the only mechanism that makes distillation deterministic. Skipping the timestamp on a new entry in a `chronological` or `amended` doc is a bug; it will get silently absorbed into the wrong era during distillation.

When in doubt about which mode a new doc should use: chronological logs choose `chronological`, claim trackers choose `amended`, everything else is `none`.

---

## Vault Rules

1. **Update, don't duplicate.** Amend with `> **[UPDATE YYYY-MM-DD · Source: ...]**`
2. **Cross-link everything.** Claims reference their source doc.
3. **Confidence levels:** `Unvalidated` | `Soft signal` | `Practitioner-validated` | `Data-validated`
4. **Source everything.** Who said it, when, confidence level.
5. **Minimize file count.** Append, don't create new files.

---

## The `/wrap-up` Protocol

When the user says `/wrap-up`, run this end-of-day sequence:

**Step 1 — Scan:** Read the battle plan. Identify all tasks for today. Categorize: done, partially done, not started, new.

**Step 2 — Present:** Show the user: "Here's today's status: [list]. Does this look right?"

**Step 3 — Prompt:** Ask: "Anything else happen today? Even small things — a reply, an accept, a thought, a link. Everything counts."

**Step 4 — Cascade:** With all info gathered, run the full cascade (Steps 0-4 above).

**Step 5 — Report:** Print:
- Metrics changed today (before → after)
- Docs updated
- Verification warnings (if any)
- Tomorrow's top priorities

**Step 6 — Commit:** Ask: "Want me to commit today's updates?" If yes, commit with message: `eod YYYY-MM-DD: [summary]`
