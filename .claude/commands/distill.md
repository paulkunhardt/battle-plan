---
description: Distill a long doc — compress older content into a thorough summary, archive verbatim raw content, lose nothing.
argument-hint: <path/to/doc.md> [keep:N]
---

You are running the `/distill` command. The user wants to compress a doc that's grown too long by **distilling** older sections into a thorough summary while archiving the verbatim raw content into `docs/archive/`. **Distilling preserves essence — never lose information.** The full raw content always survives in the archive.

## Arguments

- **Doc path** (required): `$1` — relative path from repo root to the doc to distill
- **Keep count** (optional): `keep:N` — how many of the most recent dated entries to keep verbatim. Default: 2.

If `$ARGUMENTS` is empty, ask the user which doc to distill and how many entries to keep.

## Step 0: Read frontmatter — choose mode by `Compression:` field

Read the target doc's frontmatter. The `Compression:` field determines how `/distill` operates:

| Compression mode | What `/distill` does |
|---|---|
| `chronological` | Doc is an append-only log with dated section headings (`## Session N (YYYY-MM-DD)`, `## YYYY-MM-DD`, etc.). Distill keeps the N most recent dated sections verbatim, archives the rest, replaces them with a thorough summary. |
| `amended` | Doc is a living reference with in-place `> **[UPDATE YYYY-MM-DD]**` amendment blocks above claims. Distill collapses old amendment blocks (older than a cutoff or beyond the most recent N per section) into the body text, archives the raw amendment blocks. |
| `none` | Doc is a static thesis/reference. **Refuse to run.** Tell the user: "This doc is `Compression: none` — it's not designed for distillation. Edits to static docs are version-controlled by git. If you think this doc should be compressible, change its frontmatter first." |
| _missing_ | **Refuse to run.** Tell the user: "No `Compression:` field in frontmatter. Add one of `chronological`, `amended`, or `none` per CLAUDE.md before distilling." |

Then proceed to the appropriate workflow below.

---

## Workflow A — `Compression: chronological`

### Step 1: Identify dated sections

Read the doc. Find headings that contain a date (`## Session N (YYYY-MM-DD)`, `### YYYY-MM-DD`, `## DD Month YYYY`, etc.). List them with their timestamps.

**Default split:** Keep the N most recent dated sections verbatim, archive everything before them. N defaults to 2 unless `keep:N` was passed.

**Confirm with user before proceeding** — unless they explicitly said "go" or "do it" in the original prompt.

### Step 2: Determine archive path

Archive lives at `docs/archive/<same-relative-path>` mirroring the doc's location.

Example: `docs/validation/sven-moritz-insights.md` → `docs/archive/validation/sven-moritz-insights.md`

If the archive file does NOT exist, create the parent directory (`mkdir -p`) and initialize it with this header (always include the frontmatter so verify-cascade skips it cleanly):

```markdown
# Archive: <Original Doc Title>

**Last Updated:** YYYY-MM-DD
**Status:** Archived
**Role:** cascade-target
**Compression:** none

Raw content archived from `<original/path.md>`. Append-only — most recent archives at the top.

---
```

If the archive file exists, prepend the new dated section above existing archived content (newest at top).

### Step 3: Append the new archive section (verbatim)

```markdown
## Archived YYYY-MM-DD — <description of what's being archived>

> Sections moved here from `<original/path.md>` on YYYY-MM-DD. These were the verbatim contents at time of archive.

<EXACT verbatim content of the older sections — copy them with zero changes>

---
```

Description should be specific: "Sessions 1-4 (2026-03-26 to 2026-03-30)" or "Daily logs from Jan-Mar 2026".

### Step 4: Replace the archived sections in the original doc

In the original doc, remove the older sections you just archived. Replace them with:

1. **Archive notice** at the position where the archived sections used to be:

```markdown
> **📦 Distilled history:** <Description of what was archived> — full raw content in [archive](../archive/<relative-path>.md). Last distillation: YYYY-MM-DD.
```

The relative path needs to navigate from the doc's location to `docs/archive/`. Use `../` as needed.

2. **A thorough summary** of the archived sections, immediately after the notice. The summary must:
   - Be substantive — capture key insights, decisions, evidence, quotes future readers (or LLMs) need
   - Preserve all numbers, names, dates, and concrete claims
   - Use clear subheadings if covering multiple sessions/topics
   - Reference the archive for verbatim details: e.g. "_See full transcript in [archive](../archive/...md#session-1-2026-03-26)._"
   - Be marked clearly as a summary, not original content

```markdown
## Summary of <description> (distilled YYYY-MM-DD)

[Thorough summary here. Preserve key insights, quotes, numbers. Cross-link to archive for verbatim.]

---
```

Leave the kept verbatim sections completely untouched.

---

## Workflow B — `Compression: amended`

### Step 1: Identify amendment blocks

Read the doc. Find all `> **[UPDATE YYYY-MM-DD · Source: ...]**` blocks. Group them by their parent section/claim.

Show the user the list and propose which ones to collapse. **Default rule:** within each section, keep the N most recent amendments inline; collapse the older ones into the main body text and archive the raw blocks.

**Confirm with user before proceeding.**

### Step 2: Create/update the archive file

Same path scheme as Workflow A. Same archive frontmatter.

### Step 3: Append the new archive section (verbatim)

```markdown
## Archived YYYY-MM-DD — Collapsed amendments from <doc>

> Amendment blocks moved here from `<original/path.md>` on YYYY-MM-DD. These were the verbatim `[UPDATE]` blocks at time of distillation.

### Section: <name of section the amendments belonged to>

<EXACT verbatim copy of the old `> **[UPDATE ...]**` blocks, preserving order and source citations>

---
```

### Step 4: Rewrite the original doc body

For each collapsed amendment, **integrate its content into the main claim text** (not a separate block). The main body should now read as the current consensus state, with the amendment evidence absorbed. Then add a single notice at the section level:

```markdown
> **📦 Distilled history:** <N> older amendments collapsed into body — see [archive](../archive/<relative-path>.md#section-...) for raw blocks. Last distillation: YYYY-MM-DD.
```

Keep the most recent N amendment blocks inline as-is.

**Critical:** never silently drop a claim. If two old amendments contradict, preserve both as "[date X said A; date Y said B; current view: ...]" in the body.

---

## Step 5 (both workflows): Update dates and verify

```bash
tools/touch-date.sh <original-doc> <archive-doc>
tools/verify-cascade.sh
```

Fix any errors verify-cascade reports.

## Step 6: Report

Tell the user:
- Mode used (`chronological` or `amended`)
- What was distilled (sections/amendments + date range)
- Where the archive lives (path)
- What stayed verbatim
- Line count of original doc (before vs after)
- Any verification warnings

Offer to commit:
```
git add <original-doc> <archive-doc>
git commit -m "distill: compress <doc-name> — moved <description> to archive"
```

## Important rules

- **Never lose data.** Full verbatim content goes to the archive — exactly as it was.
- **Preserve metric references.** Keep `[**N**](metrics.yml#field)` links intact in both archive and summary.
- **Don't touch the TL;DR or frontmatter** — those stay on the main doc (the TL;DR may reference distilled summaries, but is current-state, not history).
- **Don't distill the most recent sections** — they're the active context.
- **The summary must be useful enough that an LLM reading only the main doc has full context for current decisions.** The archive is for the rare case when something old becomes relevant again.
- **If `Compression:` is missing or `none`, refuse to run.** Don't guess.

## Arguments passed

$ARGUMENTS
