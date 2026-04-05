# BankBI

BankBI is a BI dashboard stack for Nepal banking analytics:
- `backend/`: Rails API over `tran_summary` data
- `frontend/`: Next.js dashboard UI (TanStack Query + Recharts)

## Current Architecture

- Backend API base: `http://localhost:3001/api/v1`
- Frontend app: `http://localhost:3000`
- Main dashboards:
  - Executive overview
  - Branch and regional performance
  - Customer and portfolio
  - Risk / KPI / board / scheduled (UI scaffolds)

## Local Setup

### 1. Backend

```bash
cd backend
bundle install
rails db:create
rails db:migrate
rails s -p 3001
```

### 2. Import Demo Data

Place `sample data.csv` in repo root and run:

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

## API Endpoints

- `GET /api/v1/dashboards/executive`
- `GET /api/v1/dashboards/branch_performance`
- `GET /api/v1/dashboards/province_summary`
- `GET /api/v1/dashboards/channel_breakdown`
- `GET /api/v1/dashboards/daily_trend`
- `GET /api/v1/filters/values`
- `GET /api/v1/filters/branches`
- `GET /api/v1/filters/statistics`

Dashboard endpoints support date and filter parameters. Frontend sends camelCase and backend also accepts snake_case.

## Notes

- Large CSV imports use batched inserts for better performance.
- Filter values are cached in Rails cache to reduce repeated DISTINCT scans.
- Keep generated progress/status markdown files out of version control (see `.gitignore`).
