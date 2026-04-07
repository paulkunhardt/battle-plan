# Cascading Context

A simple markdown-based local database for isolated projects where people who poweruse Claude Code (or any other CLI based LLM tool) and accumulate more context than fits in one conversation.

## Why?

This naturally evolved during a 3-week validation sprint. Timeboxed, clear focussed tasks, new content every day. If you can record and transcribe every relevant meeting, web research, outreach replies, new hypotheses to log, metrics, etc. then dumping all of that into Claude Code can be an amazing way to organize the entire project. This will inevitably lead to too much context, stale facts and lots of duplicates. 

I wanted a setup where:

1. The LLM could pick up where it left off, with full context, every morning, so that I can brief ME and give ME tasks, not the other way around.
2. New information would flow into the right docs automatically, in a fixed order, so nothing got dropped.
3. Stale numbers would get caught before they made it into a pitch deck.
4. Old context could be compressed without losing anything, once docs got too long for the LLM to read efficiently.

I use this every day and so far it's been a lot of fun.

## Who it's for

This is for you if:

- You live inside Claude Code, Cursor, etc. and especially if you run LLMs via the CLI.
- Your work is project based with a clear time horizon (a 3-week sprint, a 6-month research project, a quarter long deep dive)
- You process a lot of input every day: meeting transcripts, web research, replies, notes, papers
- You have specific targets you're trying to hit, like calls booked, papers read, customers signed, experiments run
- You've already hit the wall where your LLM session gets too long, starts forgetting things, or starts hallucinating older context

## What "cascading context" means

Most people use their LLM as a chat. Each conversation is fresh. Context comes from whatever you paste in or whatever the tool happens to load.

That breaks down fast when you're processing a lot of new input every day. The LLM starts compressing your context window, summarising things you didn't want summarised, and forgetting the small details that mattered.

Cascading context flips it. Instead of stuffing context into the conversation, you keep it in markdown files. When something new comes in (a call, a reply, a research finding, a metric change), the LLM updates a chain of files in a fixed order. Top of the chain: the operating doc that says "where am I right now". Bottom of the chain: source docs that hold the raw evidence.

The LLM never has to remember anything between sessions. It just reads the files. The cascade rules tell it which files to update and in what order, so nothing gets dropped, and the deterministic scripts catch the things the LLM gets wrong.

## How it works

Three pieces:

1. **CLAUDE.md** is the system prompt. It tells the LLM the cascade rules, the timestamping rules, and how to handle new information. Claude Code reads it automatically. For other tools you point them at it.

2. **tools/** is a small set of shell scripts. They check that dates are current, that numbers in `metrics.yml` match the numbers cited in the docs, and that nothing is stale. The LLM follows the cascade about 90% of the time. The scripts catch the other 10%.

3. **.githooks/pre-commit** runs the verification before every commit. By default it warns. You can switch it to block by setting `CASCADE_STRICT=1`.

The loop looks like this:

```
new info comes in
   ↓
LLM updates metrics.yml (if a number changed)
   ↓
LLM updates the battle plan (TL;DR, metrics table, daily log)
   ↓
LLM updates the source docs that own the new info
   ↓
LLM runs touch-date.sh on every file it touched
   ↓
LLM runs verify-cascade.sh and fixes anything it complains about
```

You don't think about any of this. You just tell the LLM what happened. The cascade does the rest.

## Compression and the /distill command

Some docs grow forever. A daily log accumulates entries. A conversation journal accumulates sessions. An LLM with finite context can't keep reading a 2,000 line file just to find the latest week.

`/distill` compresses older content into a thorough summary while keeping the raw verbatim copy in `docs/archive/`. Nothing is lost. The summary lives on the main doc, the archive sits next to it for the rare case you need to dig something up.

For this to work, every doc declares a `Compression:` mode in its frontmatter. The mode tells `/distill` how to operate, and (more importantly) it tells the LLM how to add new info to that doc so older content can always be told apart from newer content.

Three modes:

- **chronological** for append-only logs (battle plan, conversation journals). New entries go in dated sections like `## Session N (2026-04-07): title`. `/distill` keeps the most recent N sections verbatim and summarises the rest into the archive.
- **amended** for living reference docs (hypothesis trackers, target lists, competitive intel). New info goes in inline `> **[UPDATE 2026-04-07 · Source: ...]**` blocks above the claim it revises. `/distill` collapses old amendment blocks into the body text and archives the raw blocks.
- **none** for static thesis or reference docs. `/distill` refuses to run on these. Just edit them and let git track the history.

Full rules are in `CLAUDE.md` under "Compression Modes & Timestamping Rules".

## Quick start

1. Click "Use this template" or fork the repo
2. Open it in Claude Code (or your CLI tool of choice)
3. The onboarding wizard runs on first interaction. It asks 5 questions about your project and scaffolds your docs.
4. Start working. Tell the LLM what happened today. The cascade does the rest.
5. At end of day run `/wrap-up`.

## What's in the box

| Path | Purpose |
|---|---|
| `CLAUDE.md` | System prompt with cascade rules, compression modes, /wrap-up protocol |
| `metrics.yml` | The numeric source of truth. All key metrics live here. |
| `docs/` | Your project docs, organised by domain |
| `docs/README.md` | Vault rules for how docs get written |
| `tools/touch-date.sh` | Sets `Last Updated` to today on any file |
| `tools/check-metrics.sh` | Verifies numbers in docs match `metrics.yml` |
| `tools/sync-metrics.sh` | Propagates `metrics.yml` values into all doc references |
| `tools/verify-cascade.sh` | Full check: dates, metrics, staleness, consistency |
| `tools/init-project.sh` | Scaffolds your project on first run (called by the wizard) |
| `tools/setup-hooks.sh` | Installs the git pre-commit hook |
| `.claude/commands/distill.md` | The `/distill` slash command for compressing long docs |
| `.githooks/pre-commit` | Runs verify-cascade on every commit |

## Adapting to your CLI tool

Claude Code reads `CLAUDE.md` and `.claude/commands/` automatically. For other tools:

- **Cursor:** copy `CLAUDE.md` content into `.cursorrules`
- **Anything else:** load `CLAUDE.md` as your system prompt and replicate the slash commands as snippets

## Auto-sync for metrics

When `metrics.yml` changes, `tools/sync-metrics.sh` propagates the new values to every doc that references them. Numbers in docs use markdown links as source annotations:

```
[**42**](metrics.yml#outreach_sent)
```

This renders as a bold clickable **42**, clean for humans, machine-readable for scripts. When you run `sync-metrics.sh`, it finds all `[**N**](metrics.yml#field)` links and updates N to match the current value in `metrics.yml`.

Three ways to trigger sync:

1. **LLM calls it** as part of the cascade protocol, after updating `metrics.yml`
2. **Claude Code hook** auto-fires when `metrics.yml` is written. Add to `.claude/settings.local.json`:
   ```json
   {
     "hooks": {
       "PostToolUse": [{
         "matcher": "Write|Edit",
         "hooks": [{
           "type": "command",
           "command": "jq -r '.tool_input.file_path // .tool_response.filePath' | { read -r f; if [[ \"$f\" == *metrics.yml ]]; then tools/sync-metrics.sh; fi; } 2>/dev/null || true",
           "timeout": 10
         }]
       }]
     }
   }
   ```
3. **Manual.** Just run `tools/sync-metrics.sh` after editing `metrics.yml`.

## Configuration

Copy `.cascaderc.example` to `.cascaderc`:

```bash
# Set to 1 to block commits with verification failures (default: warn only)
CASCADE_STRICT=0
```

## Demo content

The repo ships with a fictional 3-week B2B SaaS validation sprint as demo content. Read through it to see what a fully populated cascade looks like, then run the onboarding wizard to replace it with your own project. The original demo gets preserved in `examples/startup-validation/`.

## License

MIT. Use it, fork it, change it, no attribution needed.
