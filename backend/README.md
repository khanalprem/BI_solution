# Backend (Rails API)

## Run

```bash
bundle install
rails db:create
rails db:migrate
rails s -p 3001
```

## Import Sample Data

From `backend/`, with `sample data.csv` in repo root:

```bash
rails db:import_all
```

## API

Base path: `/api/v1`

- `GET /dashboards/executive`
- `GET /dashboards/branch_performance`
- `GET /dashboards/province_summary`
- `GET /dashboards/channel_breakdown`
- `GET /dashboards/daily_trend`
- `GET /filters/values`
- `GET /filters/branches`
- `GET /filters/statistics`
