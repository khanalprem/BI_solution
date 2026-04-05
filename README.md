# BankBI - Nepal Banking Intelligence Solution

A comprehensive Business Intelligence platform for Nepal's banking sector, built with Ruby on Rails backend, Next.js frontend, and PostgreSQL database.

## Overview

BankBI provides real-time analytics and reporting for Nepal retail banking operations, covering:

- **Executive Overview** - High-level KPIs and trends
- **Financial Results** - P&L, balance sheet, cash flow analysis
- **Branch & Regional Performance** - Geographic distribution and branch metrics
- **Customer & Portfolio** - Customer segmentation and portfolio analysis
- **Employer & Payroll** - Salary banking and employer relationships
- **Loan & Risk Quality** - NPL tracking and risk assessment
- **Digital Channels** - Mobile, internet banking, and ATM analytics
- **KPI Tree Analysis** - Hierarchical metric decomposition
- **Pivot Analysis** - Dynamic data exploration
- **Board & Governance Packs** - Regulatory and compliance reporting

## Technology Stack

### Backend
- **Ruby on Rails 7.1+** (API mode)
- **PostgreSQL 15+** with TimescaleDB for time-series data
- **Redis** for caching and background jobs
- **Sidekiq** for async processing
- **JWT** for authentication

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **TanStack Query (React Query)** for data fetching
- **Recharts/Chart.js** for visualizations

### Infrastructure
- **Docker & Docker Compose** for development
- **Nginx** for production reverse proxy
- **GitHub Actions** for CI/CD

## Project Structure

```
BI_solution/
├── backend/              # Rails API
│   ├── app/
│   │   ├── controllers/api/v1/
│   │   ├── models/
│   │   ├── serializers/
│   │   ├── services/
│   │   ├── jobs/
│   │   └── policies/
│   ├── config/
│   ├── db/
│   └── spec/
│
├── frontend/             # Next.js app
│   ├── app/
│   │   ├── dashboard/
│   │   ├── financial/
│   │   ├── branch/
│   │   ├── customer/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── charts/
│   │   └── layout/
│   ├── lib/
│   └── types/
│
├── bankbi/              # HTML prototypes (existing)
│   └── pages/
│
├── .cursor/skills/      # Claude AI skills for development
│   ├── rails-nextjs-postgres-stack/
│   ├── bi-dashboard-api-design/
│   └── nepal-banking-domain/
│
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Ruby 3.2+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for containerized development)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
bundle install

# Setup database
rails db:create
rails db:migrate
rails db:seed

# Start Rails server
rails server -p 3001

# Start Sidekiq for background jobs
bundle exec sidekiq
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development server
npm run dev
```

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend rails db:migrate

# View logs
docker-compose logs -f
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- API Documentation: http://localhost:3001/api-docs

### Default Credentials

```
Email: demo@bankbi.com
Password: Demo@2026
```

## Development with Claude Skills

This project includes custom Claude AI skills to accelerate development:

### 1. Rails + Next.js + PostgreSQL Stack
Full-stack implementation patterns, authentication, API design, and deployment.

**Usage:** Open `.cursor/skills/rails-nextjs-postgres-stack/SKILL.md` in Cursor

### 2. BI Dashboard API Design
Efficient API patterns for aggregations, time-series data, filtering, and real-time updates.

**Usage:** Reference when building dashboard endpoints

### 3. Nepal Banking Domain
Nepal-specific banking rules, NRB compliance, geography, currency, and regulatory requirements.

**Usage:** Essential for accurate business logic implementation

### 4. BankBI Configuration Management
KPI thresholds, data source connections, user access management, role-based permissions, and audit logging.

**Usage:** Reference when implementing settings, user management, and system configuration

### 5. BankBI Advanced Analytics
KPI tree decomposition (DuPont), board packs, scheduled reports, comprehensive risk analysis (Basel III, VaR), customer profitability funnels with KYC tiers, employer payroll banking.

**Usage:** Reference when implementing advanced analytics, regulatory reporting, or sophisticated dashboards

## Database Schema

### Core Tables

- **users** - Authentication and user management
- **branches** - Branch master data with geographic info
- **customers** - Customer profiles and segmentation
- **accounts** - All account types (Savings, Current, FD)
- **transactions** - Transaction records (time-series)
- **loans** - Loan portfolio with risk classification
- **daily_metrics** - Pre-aggregated daily metrics per branch

### Key Indexes

All tables include optimized indexes for BI queries on:
- Date ranges
- Branch/region filters
- Account/loan types
- Risk categories

## API Endpoints

### Authentication
```
POST /api/v1/auth/login       # Login and get JWT token
GET  /api/v1/auth/me          # Get current user info
```

### Dashboards
```
GET /api/v1/dashboards/executive    # Executive overview
GET /api/v1/dashboards/financial    # Financial statements
GET /api/v1/dashboards/branch       # Branch performance
GET /api/v1/dashboards/customer     # Customer analytics
GET /api/v1/dashboards/risk         # Risk and NPL analysis
GET /api/v1/dashboards/digital      # Digital channel metrics
```

### Data Resources
```
GET /api/v1/branches              # List all branches
GET /api/v1/customers             # List customers (paginated)
GET /api/v1/accounts              # List accounts (paginated)
GET /api/v1/transactions          # List transactions (cursor-based)
GET /api/v1/loans                 # List loans (paginated)
```

### Filters (Query Parameters)

All dashboard endpoints support:
```
?start_date=2026-01-01
&end_date=2026-03-31
&branch_ids[]=1&branch_ids[]=2
&region=Central
&province=Bagmati
&compare_period=previous_period
&granularity=daily
```

## Nepal Banking Features

### Currency Formatting
- Uses NPR (Nepal Rupee)
- Indian numbering system: 12,34,567.89
- Timezone: NPT (+05:45 UTC)

### Fiscal Year
- Mid-July to Mid-July (Shrawan to Ashadh)
- Current FY: 2025/26

### Regulatory Compliance
- NRB (Nepal Rastra Bank) ratios and limits
- Capital Adequacy Ratio (CAR) ≥ 11%
- NPL Ratio target ≤ 3%
- CASA Ratio target: 60-70%
- Credit-Deposit Ratio ≤ 90%

### Geographic Coverage
- 7 Provinces
- 77 Districts
- Branch categories: Metropolitan, Urban, Semi-Urban, Rural

## Performance Optimization

### Backend
- Redis caching (15-minute cache for dashboards)
- Materialized views for complex aggregations
- Background jobs for daily metric calculation
- Database indexing on query-heavy columns
- N+1 query prevention with `includes()`

### Frontend
- Server-side rendering for initial load
- React Query automatic caching
- Lazy loading for chart components
- Debounced filter inputs
- Optimistic UI updates

## Testing

### Backend Tests
```bash
cd backend
bundle exec rspec
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e
```

## Deployment

### Production Checklist

- [ ] Set environment variables
- [ ] Configure PostgreSQL with replication
- [ ] Set up Redis cluster
- [ ] Configure SSL certificates
- [ ] Set up Nginx reverse proxy
- [ ] Enable monitoring (Sentry, New Relic)
- [ ] Configure automated backups
- [ ] Set up log aggregation
- [ ] Run security audit
- [ ] Load test API endpoints

### Environment Variables

**Backend (.env.production)**
```bash
DATABASE_URL=postgresql://user:pass@host/bankbi_production
REDIS_URL=redis://host:6379/0
SECRET_KEY_BASE=your-secret-key
FRONTEND_URL=https://bankbi.yourdomain.com
RAILS_ENV=production
```

**Frontend (.env.production)**
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NODE_ENV=production
```

## Security

- JWT-based authentication with 24-hour expiry
- HTTPS enforced in production
- CORS configured for specific origins
- SQL injection prevention via ActiveRecord
- XSS prevention via React escaping
- Rate limiting on API endpoints
- Row-level security for multi-tenant data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request with description

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Technical: tech@bankbi.com
- Business: info@bankbi.com

## Roadmap

### Q2 2026
- [ ] Real-time dashboard updates via WebSocket
- [ ] Mobile app (React Native)
- [ ] Advanced AI-powered forecasting
- [ ] Automated anomaly detection

### Q3 2026
- [ ] Multi-bank comparison
- [ ] Custom report builder
- [ ] Excel/PDF export with branding
- [ ] API for third-party integrations

### Q4 2026
- [ ] Predictive analytics
- [ ] Customer churn prediction
- [ ] Loan default risk scoring
- [ ] Natural language query interface

---

**Built with ❤️ for Nepal's Banking Sector**
