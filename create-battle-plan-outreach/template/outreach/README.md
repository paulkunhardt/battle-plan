# Outreach System

> **For Claude:** If `.outreach-initialized` does NOT exist in the project root, run the Interactive Setup section below before doing anything else with the outreach system.

## What This Is

A CSV-powered outreach tracking system that integrates with Battle Plan's cascade protocol. `leads.csv` is the single source of truth for every person you've contacted or plan to contact. All metrics are derived from it automatically — you never update numbers by hand.

## Interactive Setup

> **For Claude:** Walk the user through this one question at a time. Be conversational. After all steps are complete, create `.outreach-initialized` in the project root.

### Step 1: Import Your Leads

Ask the user: **"Do you have a list of leads already? This could be a CSV export from LinkedIn, a spreadsheet, a CRM export, or even just a list of names and companies."**

Based on their answer:

- **They have a CSV:** Help them map their columns to the leads.csv schema. Read their file, identify which columns match (name, company, title, LinkedIn URL, email, etc.), and write the mapped data into `outreach/leads.csv`. Fill missing columns with blanks. Set all statuses to `new`.

- **They have a spreadsheet/list:** Help them structure it. Ask for the data, parse it, and write to leads.csv.

- **They have nothing yet:** That's fine. Explain they can add leads later via:
  - Dropping LinkedIn URLs into `outreach/inbox/manual.txt` and running `node tools/outreach/flush-inbox.js`
  - Telling Claude about leads in natural language (Claude writes to leads.csv directly)
  - Any CSV import later

### Step 2: Set Up Templates

Ask: **"What message do you send when you reach out to someone? Paste your template(s) — or describe your approach and I'll help you write one."**

Save their templates to `tools/outreach/templates.json` with letter keys (A, B, C...).

If they want geographic or segment-based template routing, add a `country_template_map` field:
```json
{
  "country_template_map": { "Germany": "A", "Austria": "A" },
  "A": { "text": "...", "sent": 0, "replies": 0, "calls": 0 },
  "B": { "text": "...", "sent": 0, "replies": 0, "calls": 0 }
}
```

### Step 3: Configure Metrics

Add outreach metrics to the project's `metrics.yml`:
```yaml
# Outreach pipeline (derived from leads.csv — do not edit manually)
outreach_sent: 0
responses: 0
invitations_accepted: 0
discovery_calls: 0
calls_booked: 0
verbal_commitments: 0
```

Tell the user: these update automatically whenever they flush their outreach. No manual editing needed.

### Step 4: Explain the Daily Workflow

Walk through this with the user:

> **Your daily outreach loop:**
>
> 1. **Morning:** Run `node tools/outreach/daily-targets.js` — generates today's blitz checklist at `outreach/inbox/YYYY-MM-DD.md`
> 2. **During the day:** Open the checklist, send messages, tick boxes as you go
> 3. **Evening:** Run `node tools/outreach/flush-targets.js` — marks sent leads in CSV, syncs metrics, archives checklist
>
> **When things happen between blitzes:**
> - Someone replies? Write it in `outreach/inbox/updates.md` and run `node tools/outreach/flush-updates.js`
> - People accept your connection? Drop names in `outreach/inbox/accepts.txt` and run `node tools/outreach/flush-accepts.js`
> - Found someone new to reach out to? Drop their LinkedIn URL in `outreach/inbox/manual.txt` and run `node tools/outreach/flush-inbox.js`
>
> **The cascade handles the rest.** Every flush script syncs metrics.yml → battle-plan.md → domain docs automatically.

### Step 5: Create .outreach-initialized

After the user confirms they understand the workflow:
```bash
echo "Initialized on $(date +%Y-%m-%d)" > .outreach-initialized
```

Tell the user: "You're all set. Run `node tools/outreach/daily-targets.js` to generate your first blitz list, or tell me about leads you want to add."

---

## How It Works

### The Pipeline

```
Your leads (any source)
        │
        ▼
   leads.csv          ← single source of truth (23 columns)
        │
   ┌────┼────┐
   │    │    │
   ▼    ▼    ▼
 daily  flush  flush     ← three input paths
targets targets updates
   │    │    │
   └────┼────┘
        │
        ▼
  sync-metrics.js      ← derives all numbers from CSV
        │
        ▼
   metrics.yml         ← cascade protocol takes over
        │
        ▼
  battle-plan.md       ← your command center
```

### leads.csv Schema

| Column | Purpose |
|--------|---------|
| `linkedin_url` | **Primary key.** For manual entries: `manual:{slug}` |
| `first_name`, `last_name` | Contact name |
| `title` | Job title |
| `company`, `domain` | Company info |
| `industry`, `company_type` | Segmentation |
| `employees`, `revenue` | Company size |
| `country` | Geography |
| `email` | Contact email |
| `source` | Where the lead came from (`linkedin`, `referral`, `manual_dm`, etc.) |
| `tags` | Comma-separated tags (e.g., `accepted`, `tier1`, `demo-candidate`) |
| `status` | Pipeline stage (see below) |
| `priority` | 0-100 score for outreach ordering |
| `contacted_at` | Date first message sent |
| `replied_at` | Date they replied |
| `call_at` | Date of scheduled/completed call |
| `followed_up_at` | Date of most recent follow-up |
| `channel` | `connection` or `inmail` |
| `template` | Which message template was used (A, B, C...) |
| `notes` | Free text |

### Status Flow

```
new → dm_sent → replied → call_booked → call_done → verbal → loi → paying
                       ↘ dead (no reply / not interested / wrong fit)
```

### Scripts Reference

| Script | What it does | Cost |
|--------|-------------|------|
| `daily-targets.js [N]` | Generate today's blitz checklist (default 20 new + 10 follow-ups + 5 InMails) | Free |
| `flush-targets.js` | Process checked boxes from blitz → update leads.csv | Free |
| `flush-updates.js` | Parse free-form updates → update leads.csv | Free (regex) or ~$0.0001/line (Haiku) |
| `flush-accepts.js` | Batch-process connection accepts | Free |
| `flush-inbox.js` | Add LinkedIn URLs from inbox/manual.txt | Free |
| `sync-metrics.js` | Derive metrics.yml from leads.csv | Free |
| `update-dashboard.js` | Regenerate mermaid conversion dashboard | Free |
| `stats.js` | Print pipeline summary to terminal | Free |
| `lookup.js "Name"` | Fuzzy-search leads.csv | Free |

### Template Performance Tracking

Templates are defined in `tools/outreach/templates.json`. Every flush recounts stats from leads.csv (source of truth). The daily blitz checklist shows a performance table:

| Template | Sent | Accepts | Accept% | Replies | Reply% |
|----------|------|---------|---------|---------|--------|

Use this data to A/B test your messaging. Kill underperformers, double down on what works.

### Rate Limits

The daily-targets script tracks LinkedIn's rate limits:
- **Connection requests:** ~100/week
- **InMails:** 99/month (Sales Navigator Core)

Warnings appear in the blitz checklist when you're approaching limits.

### Mermaid Dashboard

Run `node tools/outreach/update-dashboard.js` (or it runs automatically after every metric sync) to generate `docs/analysis/icp-conversion.md` — a full conversion analysis with:
- Overall funnel chart
- Conversion by role/title
- Conversion by company size
- Conversion by country
- Conversion by company type (with Kill/Keep/Scale verdicts)
- Template comparison
- Cross-tab analysis

View it in any markdown renderer that supports mermaid (GitHub, VS Code, etc.).

### Free-Form Updates (flush-updates.js)

Write natural language updates in `outreach/inbox/updates.md`:

```markdown
- John from Acme replied, wants a call Thursday
- Sarah Lee = dead, not interested
- NEW: https://linkedin.com/in/jane-doe — found via conference
```

If `ANTHROPIC_API_KEY` is set in `.env`, Haiku parses these with high accuracy. Without it, the regex fallback handles common patterns:
- "Name replied" → status: replied
- "Name = dead" / "not interested" → status: dead
- "call booked/done" → status: call_booked/call_done
- LinkedIn URLs → new lead

For best results, set up the API key:
```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

## Folder Layout

```
outreach/
├── leads.csv            ← the truth
├── README.md            ← this file
├── inbox/               ← daily checklists + manual inputs
│   ├── YYYY-MM-DD.md    ← today's blitz (generated)
│   ├── updates.md       ← free-form updates (you write)
│   ├── accepts.txt      ← connection accept names (you paste)
│   └── manual.txt       ← LinkedIn URLs to add (you paste)
└── archive/             ← processed files after flushing
```
