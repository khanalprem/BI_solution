# Quick Implementation Guide

Step-by-step guide to implement the BankBI solution from your existing HTML prototypes.

## Phase 1: Backend Setup (Week 1-2)

### Day 1-2: Rails API Foundation

```bash
# Create Rails API
rails new backend --api --database=postgresql --skip-test
cd backend

# Add gems
cat >> Gemfile << 'EOF'
gem 'rack-cors'
gem 'jwt'
gem 'bcrypt'
gem 'active_model_serializers'
gem 'kaminari'
gem 'sidekiq'
gem 'redis'
gem 'dotenv-rails'

group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
end
EOF

bundle install

# Configure database
cp config/database.yml config/database.yml.backup
```

Create `config/database.yml`:
```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  host: localhost
  username: postgres
  password: postgres

development:
  <<: *default
  database: bankbi_development

test:
  <<: *default
  database: bankbi_test
```

```bash
# Create database
rails db:create

# Initialize RSpec
rails generate rspec:install
```

### Day 3-4: Database Schema

Create migration:
```bash
rails generate migration CreateCoreSchema
```

Copy the schema from the `rails-nextjs-postgres-stack` skill (see the CreateCoreSchema migration).

```bash
# Run migration
rails db:migrate

# Check schema
rails db:schema:load
```

### Day 5-7: Models and Business Logic

Create models:
```bash
rails generate model User email:string password_digest:string full_name:string role:string
rails generate model Branch code:string name:string region:string province:string
rails generate model Customer customer_id:string full_name:string segment:string
rails generate model Account account_number:string account_type:string balance:decimal
rails generate model Transaction transaction_type:string amount:decimal channel:string
rails generate model Loan loan_number:string loan_type:string outstanding_balance:decimal
rails generate model DailyMetric metric_date:date total_deposits:decimal total_loans:decimal

rails db:migrate
```

Add relationships and validations to models (refer to `nepal-banking-domain` skill).

### Day 8-10: API Controllers

Create API structure:
```bash
mkdir -p app/controllers/api/v1

rails generate controller api/v1/Auth login me
rails generate controller api/v1/Dashboards executive financial branch customer risk
rails generate controller api/v1/Branches index show
rails generate controller api/v1/Customers index show
```

Implement controllers using patterns from `bi-dashboard-api-design` skill.

### Day 11-14: Services and Background Jobs

Create services:
```bash
mkdir -p app/services
touch app/services/executive_dashboard_service.rb
touch app/services/financial_metrics_service.rb
touch app/services/regulatory_compliance_service.rb
```

Create jobs:
```bash
rails generate job DailyMetricsAggregation
rails generate job ExportDashboard
```

Configure Sidekiq:
```yaml
# config/sidekiq.yml
:concurrency: 5
:queues:
  - default
  - mailers
```

## Phase 2: Frontend Setup (Week 3-4)

### Day 15-16: Next.js Foundation

```bash
# Create Next.js app
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend

# Install dependencies
npm install axios @tanstack/react-query recharts date-fns lucide-react

# Install shadcn/ui for components
npx shadcn-ui@latest init
```

### Day 17-19: Project Structure

```bash
# Create directories
mkdir -p src/app/dashboard/{executive,financial,branch,customer,risk}
mkdir -p src/components/{ui,charts,layout}
mkdir -p src/lib/{hooks,api}
mkdir -p src/types
```

Create API client (`src/lib/api.ts`) - copy from the stack skill.

Create providers (`src/app/providers.tsx`) for React Query.

### Day 20-22: Authentication

Create auth pages:
```bash
mkdir -p src/app/signin
touch src/app/signin/page.tsx

mkdir -p src/app/signup
touch src/app/signup/page.tsx
```

Implement auth flow using JWT (see stack skill for complete code).

### Day 23-28: Dashboard Pages

Convert your HTML prototypes to React components:

1. **Extract reusable components** from `bankbi/pages/*.html`:
   - Sidebar navigation → `src/components/layout/Sidebar.tsx`
   - Top bar → `src/components/layout/TopBar.tsx`
   - Metric cards → `src/components/ui/MetricCard.tsx`
   - Charts → `src/components/charts/TrendChart.tsx`

2. **Create dashboard pages**:
   - Executive → `src/app/dashboard/executive/page.tsx`
   - Financial → `src/app/dashboard/financial/page.tsx`
   - Branch → `src/app/dashboard/branch/page.tsx`
   - Customer → `src/app/dashboard/customer/page.tsx`
   - Risk → `src/app/dashboard/risk/page.tsx`

3. **Create custom hooks** for data fetching:
   - `src/lib/hooks/useDashboard.ts`
   - `src/lib/hooks/useFilters.ts`

## Phase 3: Data Migration (Week 5)

### Day 29-31: Sample Data

Create seed data:
```bash
# backend/db/seeds.rb
```

Use the seed examples from `nepal-banking-domain` skill.

```bash
rails db:seed
```

### Day 32-33: Data Import Scripts

If you have existing data:

```ruby
# lib/tasks/import.rake
namespace :import do
  desc "Import branches from CSV"
  task branches: :environment do
    CSV.foreach('data/branches.csv', headers: true) do |row|
      Branch.create!(
        code: row['code'],
        name: row['name'],
        region: row['region'],
        province: row['province']
      )
    end
  end
  
  desc "Import transactions from CSV"
  task transactions: :environment do
    CSV.foreach('data/transactions.csv', headers: true) do |row|
      Transaction.create!(
        account_id: row['account_id'],
        amount: row['amount'],
        transaction_date: row['date'],
        channel: row['channel']
      )
    end
  end
end
```

Run:
```bash
rails import:branches
rails import:transactions
```

### Day 34-35: Aggregation Jobs

Set up daily aggregation:

```bash
# Run aggregation for historical data
Date.parse('2025-01-01').upto(Date.today) do |date|
  DailyMetricsAggregationJob.perform_now(date)
end

# Schedule for future (config/schedule.rb if using whenever gem)
every 1.day, at: '1:00 am' do
  runner "DailyMetricsAggregationJob.perform_later"
end
```

## Phase 4: Integration & Testing (Week 6)

### Day 36-37: Connect Frontend to Backend

Update environment variables:

**Frontend `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

Test authentication flow:
1. Sign up new user
2. Login and receive JWT
3. Access protected dashboard
4. Verify token refresh

### Day 38-39: Test Each Dashboard

For each dashboard:
1. Verify API response format
2. Check data rendering
3. Test filters (date, branch, region)
4. Test period comparison
5. Test data export

### Day 40-42: Performance Testing

Backend:
```bash
# Use Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/v1/dashboards/executive

# Check slow queries
rails db:analyze
```

Frontend:
```bash
# Run Lighthouse audit
npm run build
npm run start
# Open Chrome DevTools → Lighthouse → Run audit
```

Optimize:
- Add Redis caching
- Add database indexes
- Lazy load charts
- Implement pagination

## Phase 5: Deployment (Week 7)

### Day 43-44: Production Configuration

**Backend:**
```bash
# Generate secret key
rails secret

# Create .env.production
DATABASE_URL=postgresql://user:pass@host/bankbi_production
REDIS_URL=redis://host:6379/0
SECRET_KEY_BASE=your-generated-secret
RAILS_SERVE_STATIC_FILES=true
RAILS_LOG_TO_STDOUT=true
```

**Frontend:**
```bash
# Create .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

### Day 45-46: Docker Setup

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  backend:
    build: ./backend
    command: bundle exec rails server -b 0.0.0.0
    volumes:
      - ./backend:/app
    ports:
      - "3001:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres/bankbi_development
      REDIS_URL: redis://redis:6379/0

  sidekiq:
    build: ./backend
    command: bundle exec sidekiq
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres/bankbi_development
      REDIS_URL: redis://redis:6379/0

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1

volumes:
  postgres_data:
```

### Day 47-49: Deploy to Production

Choose your deployment platform:

**Option 1: VPS (DigitalOcean, AWS EC2)**
1. Set up Ubuntu server
2. Install Docker & Docker Compose
3. Clone repository
4. Run `docker-compose -f docker-compose.prod.yml up -d`
5. Set up Nginx reverse proxy
6. Configure SSL with Let's Encrypt

**Option 2: Heroku**
1. Backend: `git push heroku main`
2. Frontend: Deploy to Vercel
3. Add PostgreSQL addon
4. Add Redis addon
5. Set environment variables

**Option 3: Railway/Render**
1. Connect GitHub repo
2. Configure services (backend, frontend, postgres, redis)
3. Set environment variables
4. Deploy

## Post-Deployment

### Week 8: Monitoring & Optimization

1. **Set up monitoring:**
   - Application monitoring (New Relic, Datadog)
   - Error tracking (Sentry)
   - Uptime monitoring (UptimeRobot)

2. **Set up backups:**
   - Daily PostgreSQL backups
   - Store in S3 or equivalent
   - Test restore procedure

3. **Performance tuning:**
   - Review slow API endpoints
   - Add more caching
   - Optimize database queries
   - Add CDN for static assets

4. **Security audit:**
   - Run security scanner
   - Update dependencies
   - Configure rate limiting
   - Set up firewall rules

## Maintenance Schedule

**Daily:**
- Monitor error rates
- Check background job queue
- Review slow queries

**Weekly:**
- Review user feedback
- Check disk space
- Update dependencies
- Review analytics

**Monthly:**
- Full backup test
- Security audit
- Performance review
- Feature planning

## Troubleshooting

### Common Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d bankbi_development
```

**Redis connection error:**
```bash
# Check Redis is running
redis-cli ping

# Should return PONG
```

**CORS error:**
```ruby
# Check config/initializers/cors.rb
# Ensure frontend URL is in origins list
```

**JWT token expired:**
```typescript
// Check token expiry logic in frontend
// Implement token refresh before expiry
```

## Resources

- Rails API documentation: `.cursor/skills/rails-nextjs-postgres-stack/SKILL.md`
- BI API patterns: `.cursor/skills/bi-dashboard-api-design/SKILL.md`
- Nepal banking rules: `.cursor/skills/nepal-banking-domain/SKILL.md`

## Need Help?

Ask Claude in Cursor - the skills are loaded and ready to assist with:
- Code generation
- Bug fixes
- Architecture decisions
- Nepal banking domain questions
- Performance optimization
- Deployment issues

Simply describe what you need, and reference the relevant skill if needed!
