# Domain 101 — Compliance & GRC Fundamentals

> **EXAMPLE CONTENT** — Part of the fictional "CompliBot" demo project used to show what a populated battle plan looks like. Not real research. New projects scaffolded via `npx create-battle-plan` start from empty templates.

**Last Updated:** 2026-04-07
**Status:** Active
**Role:** cascade-target
**Compression:** none

**TL;DR:** Foundational knowledge for the compliance automation space. Key frameworks: ISO 27001 (international), SOC 2 (US/trust-based), GDPR (EU data). GRC = Governance, Risk, Compliance. The compliance lifecycle: scope → implement → evidence → audit → maintain. Most tools focus on the audit step; the evidence and maintain steps are where time is actually spent.

---

## Key Frameworks

### ISO 27001
- International standard for information security management systems (ISMS)
- Annex A: 93 controls across 4 domains (organizational, people, physical, technological)
- Certification requires external audit by accredited body
- 3-year cycle: initial certification → 2 surveillance audits → recertification
- **Cost:** $20K-$100K for initial certification (auditor fees + implementation)

### SOC 2
- US standard by AICPA. Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, Privacy.
- Type I: point-in-time. Type II: over a period (usually 12 months).
- No "pass/fail" — auditor issues a report with findings.
- **Cost:** $20K-$80K for Type II audit

### GDPR
- EU regulation for personal data protection
- No certification (though ISO 27701 exists as an extension of ISO 27001)
- Key requirements: lawful basis, data minimization, breach notification (72 hrs), DPIA for high-risk processing
- **Fines:** Up to 4% of annual global turnover or €20M

---

## The Compliance Lifecycle

```
Scope → Implement → Evidence → Audit → Maintain
  │                     │                  │
  │                     │                  └── Where time is actually spent
  │                     └── Most manual, most painful
  └── One-time (mostly)
```

1. **Scope:** Define which frameworks, which business units, which assets
2. **Implement:** Put controls in place (policies, technical controls, processes)
3. **Evidence:** Prove controls work. Collect logs, screenshots, exports. **This is where 60% of GRC time goes.**
4. **Audit:** External auditor reviews evidence, issues findings
5. **Maintain:** Keep everything current between audits. **This is what no tool does well.**

---

## Glossary

| Term | Definition |
|------|-----------|
| GRC | Governance, Risk, Compliance — the discipline and tool category |
| ISMS | Information Security Management System — required by ISO 27001 |
| Control | A specific security measure (e.g., "access reviews quarterly") |
| Evidence | Proof that a control is operating (e.g., screenshot of access review) |
| Finding | An auditor's identification of a control gap or weakness |
| Risk register | Inventory of identified risks with likelihood, impact, and treatment |
| SoA | Statement of Applicability — which ISO 27001 controls apply to you |
