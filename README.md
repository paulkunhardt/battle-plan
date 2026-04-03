# Cascading Context

Keep interconnected markdown docs in sync using any LLM CLI.

**The problem:** LLMs follow cascade instructions ~90% of the time, but fail on small details — stale dates, TL;DRs with outdated numbers, missed cross-references. The remaining 10% needs deterministic tooling.

**The solution:** A three-layer system:
1. **LLM instructions** (CLAUDE.md) — cascade rules that tell the LLM how to update docs
2. **Shell scripts** (tools/) — deterministic verification of dates, metrics, and references
3. **Git hooks** (.githooks/) — enforcement on every commit

## Quick Start

1. Fork this repo (or use it as a template)
2. Open with your LLM CLI (Claude Code, Cursor, Aider, etc.)
3. The onboarding wizard asks 5 questions and scaffolds your project
4. Start working — the cascade keeps everything in sync

## How It Works

Every doc follows a standardized format with frontmatter (`Last Updated`, `Status`, `Role`, `TL;DR`). Key metrics live in `metrics.yml` — a single source of truth that scripts verify against all docs.

When new information arrives, the LLM follows a cascade:
1. Update `metrics.yml` (if any key metric changed)
2. Update the battle plan (operating document — priorities and status)
3. Update affected cascade docs (market, validation, strategy, research)
4. Run `tools/touch-date.sh` on every modified file
5. Run `tools/verify-cascade.sh` to catch inconsistencies

## Demo Content

This repo ships with a complete demo project: a founder validating a B2B SaaS idea over a 3-week sprint. Read the docs to understand the system, then run the onboarding wizard to replace the demo with your project. The demo is preserved in `examples/startup-validation/`.

## Adapting to Your LLM CLI

- **Claude Code:** Works out of the box — reads `CLAUDE.md` automatically
- **Cursor:** Copy `CLAUDE.md` content to `.cursorrules`
- **Aider:** Reference in `.aider.conf.yml` as `read: [CLAUDE.md]`
- **Other:** Load `CLAUDE.md` as your system prompt per your tool's convention

## The `/wrap-up` Protocol

At the end of each work session, tell your LLM to run `/wrap-up`. It will:
1. Scan today's tasks and categorize them (done, partial, not started)
2. Show you the status and ask if anything is missing
3. Run the full cascade with all gathered info
4. Print a summary of changes and tomorrow's priorities
5. Offer to commit: `eod YYYY-MM-DD: [summary]`

## Scripts

| Script | Purpose |
|--------|---------|
| `tools/touch-date.sh <file>` | Sets `Last Updated` to today |
| `tools/check-metrics.sh` | Verifies `metrics.yml` numbers against all doc references |
| `tools/verify-cascade.sh` | Full verification: dates, metrics, staleness, consistency |
| `tools/init-project.sh` | Scaffolds your project (called by onboarding wizard) |
| `tools/setup-hooks.sh` | Installs the git pre-commit hook |

## Configuration

Copy `.cascaderc.example` to `.cascaderc` and edit:

```bash
# Set to 1 to block commits with verification failures (default: warn only)
CASCADE_STRICT=0
```

## License

MIT
