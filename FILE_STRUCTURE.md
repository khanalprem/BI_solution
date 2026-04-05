# Project File Structure

```
BI_solution/
│
├── 📄 README.md                         # Project overview & features
├── 📄 SUMMARY.md                        # This summary with next steps
├── 📄 IMPLEMENTATION_GUIDE.md           # Week-by-week implementation
├── 📄 TROUBLESHOOTING.md               # Common issues & solutions
├── 📄 FILE_STRUCTURE.md                # This file - project structure
├── 📄 CHECKLIST.md                     # Progress tracking checklist
├── 📄 EXISTING_DATABASE_INTEGRATION.md # Guide for using your existing DB
│
├── 🐳 docker-compose.yml               # Multi-container orchestration
├── 🐳 nginx.conf                       # Reverse proxy configuration
├── 📋 backend.Dockerfile.template       # Rails container template
├── 📋 frontend.Dockerfile.template      # Next.js container template
│
├── 🔧 setup.sh                         # Automated setup script (executable)
├── 📝 backend.env.example              # Backend environment template
├── 📝 frontend.env.example             # Frontend environment template
├── 🚫 .gitignore                       # Git ignore patterns
│
├── 🧠 .cursor/                         # Cursor IDE configuration
│   └── skills/                         # Custom Claude AI Skills (5 total)
│       ├── rails-nextjs-postgres-stack/
│       │   └── SKILL.md                # Full-stack patterns
│       ├── bi-dashboard-api-design/
│       │   └── SKILL.md                # BI API patterns
│       ├── nepal-banking-domain/
│       │   └── SKILL.md                # Nepal banking rules
│       ├── bankbi-config-management/
│       │   └── SKILL.md                # Config & user management
│       └── bankbi-advanced-analytics/
│           └── SKILL.md                # Advanced analytics & reporting
│
├── 🎨 bankbi/                          # Your existing HTML prototypes
│   ├── index.html                      # Main dashboard
│   ├── signin.html                     # Sign in page
│   ├── signup.html                     # Sign up page
│   ├── layout/
│   │   ├── before.html
│   │   └── after.html
│   └── pages/                          # All dashboard pages
│       ├── executive.html              # Executive overview
│       ├── financial.html              # Financial results
│       ├── branch.html                 # Branch performance
│       ├── branchdetail.html          # Branch details
│       ├── customer.html               # Customer analytics
│       ├── customerdetail.html        # Customer details
│       ├── employer.html               # Employer & payroll
│       ├── risk.html                   # Loan & risk
│       ├── digital.html                # Digital channels
│       ├── kpi.html                    # KPI tree analysis
│       ├── pivot.html                  # Pivot analysis
│       ├── board.html                  # Board packs
│       ├── scheduled.html              # Scheduled reports
│       └── config.html                 # Configuration & settings
│
├── 🗄️ Existing Database Assets         # Your current database
│   ├── call procedure prem.sql         # Stored procedure calls
│   ├── transummary procedure.sql       # Transaction summary procedure
│   ├── sample data.csv                 # Sample transaction data
│   └── data dictionary.xlsx            # Database schema documentation
│
├── 🔴 backend/                         # TO BE CREATED by setup.sh
│   ├── app/
│   │   ├── controllers/
│   │   │   └── api/v1/
│   │   │       ├── auth_controller.rb
│   │   │       ├── dashboards_controller.rb
│   │   │       ├── branches_controller.rb
│   │   │       ├── customers_controller.rb
│   │   │       └── ...
│   │   ├── models/
│   │   │   ├── user.rb
│   │   │   ├── branch.rb
│   │   │   ├── customer.rb
│   │   │   ├── account.rb
│   │   │   ├── transaction.rb
│   │   │   ├── loan.rb
│   │   │   └── daily_metric.rb
│   │   ├── serializers/
│   │   │   ├── user_serializer.rb
│   │   │   ├── branch_serializer.rb
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── executive_dashboard_service.rb
│   │   │   ├── financial_metrics_service.rb
│   │   │   ├── branch_performance_service.rb
│   │   │   └── regulatory_compliance_service.rb
│   │   ├── jobs/
│   │   │   ├── daily_metrics_aggregation_job.rb
│   │   │   └── export_dashboard_job.rb
│   │   └── policies/
│   │       └── dashboard_policy.rb
│   ├── config/
│   │   ├── database.yml
│   │   ├── routes.rb
│   │   ├── application.rb
│   │   └── initializers/
│   │       ├── cors.rb
│   │       └── sidekiq.rb
│   ├── db/
│   │   ├── migrate/
│   │   │   ├── create_users.rb
│   │   │   ├── create_branches.rb
│   │   │   ├── create_core_schema.rb
│   │   │   └── add_bi_indexes.rb
│   │   ├── seeds.rb
│   │   └── schema.rb
│   ├── spec/                           # RSpec tests
│   ├── Gemfile
│   ├── Gemfile.lock
│   ├── Dockerfile
│   └── .env                            # From backend.env.example
│
└── 🟢 frontend/                        # TO BE CREATED by setup.sh
    ├── app/
    │   ├── layout.tsx                  # Root layout
    │   ├── page.tsx                    # Home page
    │   ├── providers.tsx               # React Query provider
    │   ├── signin/
    │   │   └── page.tsx
    │   ├── signup/
    │   │   └── page.tsx
    │   └── dashboard/
    │       ├── layout.tsx              # Dashboard layout
    │       ├── executive/
    │       │   └── page.tsx
    │       ├── financial/
    │       │   └── page.tsx
    │       ├── branch/
    │       │   └── page.tsx
    │       ├── customer/
    │       │   └── page.tsx
    │       ├── risk/
    │       │   └── page.tsx
    │       └── digital/
    │           └── page.tsx
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── MetricCard.tsx
    │   │   └── ...
    │   ├── charts/
    │   │   ├── TrendChart.tsx
    │   │   ├── BarChart.tsx
    │   │   ├── PieChart.tsx
    │   │   └── LineChart.tsx
    │   └── layout/
    │       ├── Sidebar.tsx
    │       ├── TopBar.tsx
    │       ├── Footer.tsx
    │       └── ThemeToggle.tsx
    ├── lib/
    │   ├── api.ts                      # API client (Axios)
    │   ├── auth.ts                     # Auth helpers
    │   ├── utils.ts                    # Utility functions
    │   └── hooks/
    │       ├── useDashboard.ts
    │       ├── useFilters.ts
    │       ├── useAuth.ts
    │       └── useExport.ts
    ├── types/
    │   ├── index.ts
    │   ├── dashboard.ts
    │   ├── user.ts
    │   └── branch.ts
    ├── public/
    │   ├── favicon.ico
    │   └── images/
    ├── package.json
    ├── package-lock.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── Dockerfile
    └── .env.local                      # From frontend.env.example
```

## Legend

- 📄 = Documentation file
- 🐳 = Docker/Infrastructure file
- 🔧 = Setup/Configuration file
- 📋 = Template file
- 📝 = Environment config
- 🚫 = Git configuration
- 🧠 = AI/IDE configuration
- 🎨 = Existing HTML prototypes (your current work)
- 🔴 = Backend (Rails API) - TO BE CREATED
- 🟢 = Frontend (Next.js) - TO BE CREATED

## What Exists vs What to Create

### ✅ Already Exists (Ready to Use)
- All documentation files (8 files)
- All infrastructure configs (Docker, Nginx)
- Setup script
- Environment templates
- 5 custom Claude AI skills covering everything
- All HTML prototypes in `bankbi/`
- Existing database with stored procedures
- Sample transaction data
- Data dictionary

### 🔨 To Be Created (via setup.sh)
- `backend/` directory with Rails API
- `frontend/` directory with Next.js app
- PostgreSQL database
- Redis cache

## File Sizes Reference

```
Documentation:        ~150 KB
Skills:              ~200 KB
Infrastructure:       ~20 KB
HTML Prototypes:     ~2-3 MB (estimated based on your existing work)

Backend (after creation):     ~50 MB (with dependencies)
Frontend (after creation):    ~300 MB (with node_modules)
Total Project Size:          ~350-400 MB
```

## Key Entry Points

### For Development
- **Start here**: `./setup.sh`
- **Read first**: `SUMMARY.md` (this file)
- **Implementation**: `IMPLEMENTATION_GUIDE.md`
- **Problems**: `TROUBLESHOOTING.md`

### For Claude AI
- **Full-stack**: `.cursor/skills/rails-nextjs-postgres-stack/SKILL.md`
- **APIs**: `.cursor/skills/bi-dashboard-api-design/SKILL.md`
- **Nepal rules**: `.cursor/skills/nepal-banking-domain/SKILL.md`
- **Configuration**: `.cursor/skills/bankbi-config-management/SKILL.md`
- **Advanced Analytics**: `.cursor/skills/bankbi-advanced-analytics/SKILL.md`

### For Understanding
- **Overview**: `README.md`
- **Architecture**: See diagrams in `SUMMARY.md`
- **Reference**: Your HTML in `bankbi/pages/`
- **Existing DB**: `EXISTING_DATABASE_INTEGRATION.md`

## Next Action

Run this command to get started:

```bash
./setup.sh
```

Then choose:
1. Docker setup (easier, recommended)
2. Local setup (more control)

The script will create the `backend/` and `frontend/` directories and set up everything!
