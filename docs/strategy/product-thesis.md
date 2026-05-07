# Product Thesis — CompliBot

> **EXAMPLE CONTENT** — "CompliBot" is a fictional product used throughout this repo to demonstrate what a populated battle plan looks like. New projects scaffolded via `npx create-battle-plan` start from empty templates.

**Last Updated:** 2026-04-07
**Status:** Active
**Role:** cascade-target
**Compression:** none

**TL;DR:** CompliBot is a continuous compliance agent for mid-market SaaS. Core thesis: compliance tools today automate certification (the audit event) but not compliance (the daily work). CompliBot automates evidence collection, documentation, and gap analysis between audits. Differentiator: AI that understands your specific business context, not generic control checklists. Phase 1: ISO 27001 evidence automation. Phase 2: SOC 2 + cross-framework mapping.

---

## Core Thesis

> The compliance market has a blind spot: tools help you **get certified** but not **stay compliant**. The daily work — collecting evidence, updating documentation, running access reviews — is still manual. An AI agent with business context can do 80% of this work.

### Why now?
1. **LLM capability inflection.** Models can now read API docs, write collection scripts, and reason about control requirements.
2. **Regulatory acceleration.** EU AI Act, DORA, NIS2 — new frameworks create new documentation burdens faster than teams can scale.
3. **Incumbent blind spot.** Drata/Vanta serve the GRC buyer. They won't automate that person's job. (→ hypotheses.md#h2-existing-tools-are-expensive-checkbox-software)

---

## Differentiation

| Approach | Incumbents (Drata/Vanta) | CompliBot |
|----------|--------------------------|-----------|
| Model | Certification management | Continuous compliance |
| Evidence | Human collects, tool tracks | AI collects, human approves |
| Context | Generic checklists | Learns your stack + processes |
| Cadence | Audit-driven (annual/semi) | Continuous (daily/weekly) |
| Pricing | $10K-50K/year | €199-399/month |

---

## Phased Roadmap

### Phase 1: ISO 27001 Evidence Agent (MVP)
- Connect to 5 core tools (AWS, GitHub, Jira, Slack, Google Workspace)
- Auto-collect evidence for ISO 27001 Annex A controls
- Weekly gap analysis report
- Target: 50-200 person SaaS companies

### Phase 2: Multi-Framework
- Add SOC 2 mapping
- Cross-framework control deduplication
- Audit-ready evidence packages

### Phase 3: Predictive Compliance
- Drift detection before it becomes a finding
- Regulatory change monitoring
- Automated control updates
