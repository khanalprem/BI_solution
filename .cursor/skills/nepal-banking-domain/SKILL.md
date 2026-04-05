---
name: nepal-banking-domain
description: Nepal banking domain conventions for BankBI. Use when implementing Nepal-specific geography, NPR formatting, fiscal-year logic, banking terminology, or risk/compliance labels.
---

# Nepal Banking Domain

Use this skill when adding metrics, labels, or filters that are shown to Nepal banking users.

## Core Domain Rules for This Repo

### Currency and Numbering

- Display amounts in NPR style using existing formatter (`Rs.` prefix, lakh/crore abbreviations).
- Use `frontend/lib/formatters.ts#formatNPR` as the UI source of truth.
- API responses should send raw numbers only; formatting is frontend responsibility.

### Geography

Frontend province options are currently fixed to:
- Bagmati
- Gandaki
- Lumbini
- Madhesh
- Koshi
- Karnali
- Sudurpashchim

Data comes from `tran_summary.gam_province` and may contain non-standard text in real data. Normalize for display where needed, but avoid destructive overwrites in raw facts.

### Banking Dimensions Used in Analytics

- Branch: `gam_branch`
- Province: `gam_province`
- Cluster: `gam_cluster`
- Channel: `tran_source`
- Transaction type: `tran_type`
- Product/Service/Merchant: `product`, `service`, `merchant`

When introducing new business dimensions, map them in both:
- backend filter parsing (`BaseController#filter_params`)
- frontend query mapping (`useDashboardData.ts`)

### Fiscal-Year Context

Nepal FY runs roughly mid-July to mid-July. Current UI period shortcut `FY` starts from July in `getDateRange`.
If exact NRB reporting boundaries are required, define and document explicit start/end date logic in one shared utility before use across dashboards.

## Data Window and Period Selection

Important behavior in this project:
- Demo data range may be historical (not current year).
- Dashboard pages should anchor period presets (`MTD`, `QTD`, etc.) to latest available data date from `/filters/statistics`.

Do not assume "today" contains data.

## Risk and Compliance Labels

Use labels that are clear and conservative:
- Keep "demo/mock" tags on non-regulatory outputs.
- Avoid claiming regulatory compliance in UI unless rules are implemented and validated.
- For NRB thresholds, keep values configurable and auditable (not hardcoded in charts).

## Implementation Checklist

- New KPI uses raw numeric API values and frontend formatting.
- New filters are wired end-to-end (UI state -> API params -> DB columns).
- Province/channel labels are human-readable and consistent across pages.
- Date presets are tested against dataset max date, not local system date only.
