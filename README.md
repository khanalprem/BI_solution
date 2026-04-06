# BankBI — Nepal Banking Intelligence Platform

A full-stack BI dashboard for Nepal banking analytics built with
**Rails API** + **Next.js** + **PostgreSQL**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│  Next.js 15  ·  TanStack Query  ·  Recharts  ·  Radix UI   │
│                  http://localhost:3000                       │
└─────────────────────┬───────────────────────────────────────┘
                      │  REST / JSON
┌─────────────────────▼───────────────────────────────────────┐
│                   Rails 7 API (backend/)                     │
│  Controllers → Services → Models → PostgreSQL                │
│                  http://localhost:3001/api/v1                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                     PostgreSQL                               │
│  tran_summary (fact)  ·  eab (balance)  ·  branches/customers│
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
BI_solution/
├── backend/          # Rails 7 API
│   ├── app/
│   │   ├── controllers/api/v1/   # Dashboard + filter endpoints
│   │   ├── models/               # TranSummary, Eab, Branch, Customer
│   │   └── services/             # DynamicDashboardService
│   ├── config/                   # Routes, database, environments
│   ├── db/                       # Migrations, schema, seeds
│   └── lib/tasks/                # Data import rake tasks
├── frontend/         # Next.js 15 (App Router)
│   ├── app/dashboard/            # Dashboard pages (14 routes)
│   ├── components/               # UI primitives + layout
│   ├── lib/                      # API client, hooks, formatters
│   └── types/                    # TypeScript interfaces
├── bankbi/           # Static HTML prototype (reference only)
├── data/             # SQL procedures, sample data, docs
│   ├── sql/                      # PostgreSQL stored procedures
│   └── samples/                  # CSV sample data
├── docker-compose.yml
├── nginx.conf
└── setup.sh / start.sh / quick-start.sh
```

## Dashboard Pages

| Page | Route | Status |
|------|-------|--------|
| Executive Overview | `/dashboard/executive` | Live (API-backed) |
| Branch & Regional | `/dashboard/branch` | Live (API-backed) |
| Customer & Portfolio | `/dashboard/customer` | Live (API-backed) |
| Branch Detail | `/dashboard/branch/[code]` | Live (API-backed) |
| Customer Detail | `/dashboard/customer/[cifId]` | Live (API-backed) |
| Financial Results | `/dashboard/financial` | UI scaffold |
| Digital Channels | `/dashboard/digital` | UI scaffold |
| KPI Tree Analysis | `/dashboard/kpi` | UI scaffold |
| Loan & Risk Quality | `/dashboard/risk` | UI scaffold |
| Employer & Payroll | `/dashboard/employer` | UI scaffold |
| Pivot Analysis | `/dashboard/pivot` | UI scaffold |
| Board Packs | `/dashboard/board` | UI scaffold |
| Scheduled Reports | `/dashboard/scheduled` | UI scaffold |
| Configuration | `/dashboard/config` | UI scaffold |

## Local Setup

### 1. Backend

```bash
cd backend
bundle install
rails db:create db:migrate
rails s -p 3001
```

### 2. Import Demo Data

```bash
cd backend
rails db:import_all
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker (alternative)

```bash
docker-compose up
```

## API Reference

### Dashboard Endpoints

All under `GET /api/v1/dashboards/`

| Endpoint | Description |
|----------|-------------|
| `executive` | Executive KPIs, summary metrics |
| `branch_performance` | Branch-level aggregations |
| `province_summary` | Province-level aggregations |
| `channel_breakdown` | Transaction channel analytics |
| `daily_trend` | Day-by-day transaction trend |
| `customers_top` | Top customers by volume |
| `customer_profile` | Single customer detail |

### Filter Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /filters/values` | Distinct values for all filter dimensions |
| `GET /filters/branches` | Branch list (optionally by province) |
| `GET /filters/statistics` | Date range and record count stats |

### Query Parameters

Date: `start_date` / `end_date` (also accepts `startDate` / `endDate`)

Filters: `branch_code`, `province`, `district`, `municipality`, `cluster`,
`tran_type`, `part_tran_type`, `tran_source`, `product`, `service`,
`merchant`, `gl_sub_head_code`, `entry_user`, `vfd_user`,
`min_amount`, `max_amount`, `acct_num`, `cif_id`

## Data Model

See [`data/README.md`](data/README.md) for table schemas, stored procedure
documentation, and sample data notes.

## Development Guide

See `.cursor/skills/` for detailed implementation guides:

- **rails-nextjs-postgres-stack** — End-to-end change workflow
- **bi-dashboard-api-design** — API contracts and patterns
- **bankbi-data-integration** — ETL, queries, filter dimensions
- **bankbi-ui-styleguide** — Frontend components and design tokens
- **nepal-banking-domain** — NPR formatting, fiscal year, geography
- **bankbi-advanced-analytics** — Phase plan for scaffold → live pages
- **bankbi-config-management** — Settings and access control patterns
