# Troubleshooting Guide

Common issues and solutions for the BankBI project.

## Installation Issues

### Problem: Bundle install fails

**Error:**
```
An error occurred while installing pg (1.5.4)
```

**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install libpq-dev

# Alpine (Docker)
apk add --no-cache postgresql-dev build-base
```

### Problem: npm install fails with permission errors

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm instead of system Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### Problem: Docker build fails

**Error:**
```
ERROR [internal] load metadata for docker.io/library/ruby:3.2-alpine
```

**Solution:**
```bash
# Check Docker daemon is running
docker ps

# If not running
sudo systemctl start docker  # Linux
open -a Docker  # macOS

# Clear Docker cache
docker system prune -a
```

## Database Issues

### Problem: Cannot connect to PostgreSQL

**Error:**
```
PG::ConnectionBad: could not connect to server
```

**Solution:**

**Check PostgreSQL is running:**
```bash
# macOS
brew services list
brew services start postgresql

# Ubuntu/Debian
sudo systemctl status postgresql
sudo systemctl start postgresql

# Docker
docker-compose ps
docker-compose up postgres
```

**Check connection settings:**
```bash
# Test connection
psql -h localhost -U postgres -d bankbi_development

# If password fails, reset
sudo -u postgres psql
ALTER USER postgres PASSWORD 'postgres';
```

### Problem: Database already exists error

**Error:**
```
ActiveRecord::StatementInvalid: PG::DuplicateDatabase
```

**Solution:**
```bash
# Drop and recreate
rails db:drop db:create db:migrate

# Or reset completely
rails db:reset
```

### Problem: Migration fails

**Error:**
```
ActiveRecord::PendingMigrationError
```

**Solution:**
```bash
# Check migration status
rails db:migrate:status

# Run pending migrations
rails db:migrate

# If stuck, rollback and retry
rails db:rollback
rails db:migrate

# Last resort - reset
rails db:drop db:create db:migrate db:seed
```

## Redis Issues

### Problem: Cannot connect to Redis

**Error:**
```
Redis::CannotConnectError: Error connecting to Redis
```

**Solution:**
```bash
# Check Redis is running
redis-cli ping
# Should return PONG

# Start Redis
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Docker
docker-compose up redis

# Test connection
redis-cli
127.0.0.1:6379> SET test "hello"
127.0.0.1:6379> GET test
```

### Problem: Sidekiq jobs not processing

**Solution:**
```bash
# Check Sidekiq is running
ps aux | grep sidekiq

# Check Redis connection
redis-cli
127.0.0.1:6379> KEYS sidekiq:*

# Restart Sidekiq
pkill -9 sidekiq
bundle exec sidekiq

# Check logs
tail -f log/sidekiq.log
```

## API Issues

### Problem: CORS errors in browser

**Error:**
```
Access to fetch at 'http://localhost:3001/api/v1/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**

**Check backend CORS configuration:**
```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:3000', 'http://127.0.0.1:3000'
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true
  end
end
```

**Restart Rails server after changes**

### Problem: JWT token invalid

**Error:**
```
{"error": "Unauthorized"}
```

**Solution:**

**Check token in localStorage:**
```javascript
// Browser console
console.log(localStorage.getItem('auth_token'))
```

**Verify token format:**
```ruby
# Rails console
payload = { user_id: 1, exp: 24.hours.from_now.to_i }
token = JWT.encode(payload, Rails.application.credentials.secret_key_base)
decoded = JWT.decode(token, Rails.application.credentials.secret_key_base)
```

**Clear and re-login:**
```javascript
// Browser console
localStorage.removeItem('auth_token')
// Then login again
```

### Problem: API returns 500 error

**Solution:**
```bash
# Check Rails logs
tail -f log/development.log

# Check for common issues:
# - Missing environment variables
# - Database connection
# - Missing records (N+1 queries)
# - Serialization errors

# Enable detailed error responses in development
# config/environments/development.rb
config.consider_all_requests_local = true
```

## Frontend Issues

### Problem: Next.js build fails

**Error:**
```
Error: Module not found
```

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Build again
npm run build
```

### Problem: Environment variables not working

**Solution:**

**For client-side variables:**
- Must start with `NEXT_PUBLIC_`
- Restart dev server after changes

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Restart
npm run dev
```

**Verify in browser:**
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

### Problem: React Query not refetching

**Solution:**
```typescript
// Force refetch
const { data, refetch } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboard,
  staleTime: 0,  // Consider data stale immediately
  cacheTime: 0,  // Don't cache
})

// Manually trigger
refetch()
```

### Problem: Charts not rendering

**Solution:**
```bash
# Check Chart.js is installed
npm list chart.js recharts

# Reinstall if needed
npm install recharts chart.js

# Check browser console for errors
# Common issue: Invalid data format
```

## Docker Issues

### Problem: Container keeps restarting

**Solution:**
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps

# Common issues:
# - Missing environment variables
# - Database not ready (add depends_on with healthcheck)
# - Port already in use
```

### Problem: Changes not reflected in container

**Solution:**
```bash
# Rebuild containers
docker-compose build --no-cache

# Restart with fresh build
docker-compose down
docker-compose up --build

# For frontend hot reload issues
# Ensure volume is mounted correctly in docker-compose.yml
volumes:
  - ./frontend:/app
  - /app/node_modules
  - /app/.next
```

### Problem: Database persists after docker-compose down

**Solution:**
```bash
# Remove volumes
docker-compose down -v

# Or specifically remove
docker volume ls
docker volume rm bankbi_postgres_data

# Recreate
docker-compose up -d postgres
docker-compose run backend rails db:create db:migrate
```

## Performance Issues

### Problem: API responses are slow

**Solution:**

**Enable query logging:**
```ruby
# config/environments/development.rb
config.active_record.verbose_query_logs = true
```

**Check for N+1 queries:**
```ruby
# Use includes/joins to preload associations
# Bad
branches = Branch.all
branches.each { |b| puts b.daily_metrics.count }

# Good
branches = Branch.includes(:daily_metrics).all
branches.each { |b| puts b.daily_metrics.count }
```

**Add database indexes:**
```ruby
# Check missing indexes
rails db:analyze

# Add indexes for frequently queried columns
add_index :transactions, [:transaction_date, :branch_id]
add_index :daily_metrics, [:metric_date, :branch_id]
```

**Implement caching:**
```ruby
# Cache expensive queries
Rails.cache.fetch("dashboard_executive_#{params.hash}", expires_in: 15.minutes) do
  # Expensive query
end
```

### Problem: Frontend feels sluggish

**Solution:**

**Check bundle size:**
```bash
npm run build
npm run analyze  # If next-bundle-analyzer installed
```

**Optimize images:**
```typescript
// Use Next.js Image component
import Image from 'next/image'

<Image 
  src="/logo.png" 
  width={200} 
  height={100}
  loading="lazy"
/>
```

**Lazy load components:**
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
})
```

**Debounce inputs:**
```typescript
import { useDebouncedCallback } from 'use-debounce'

const handleFilterChange = useDebouncedCallback((value) => {
  // Filter logic
}, 300)
```

## Nepal-Specific Issues

### Problem: Currency formatting incorrect

**Solution:**
```typescript
// Use NPR-specific formatter
function formatNPR(amount: number): string {
  const formatter = new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2
  })
  return formatter.format(amount)
}

// Or use Indian numbering system
function formatNPRIndian(amount: number): string {
  const parts = amount.toFixed(2).split('.')
  const whole = parts[0]
  const decimal = parts[1]
  
  const lastThree = whole.slice(-3)
  const rest = whole.slice(0, -3)
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  
  return `NPR ${formatted}${rest ? ',' : ''}${lastThree}.${decimal}`
}
```

### Problem: Fiscal year calculations wrong

**Solution:**
```typescript
// Nepal fiscal year: Mid-July to Mid-July
function getCurrentFiscalYear(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const day = today.getDate()
  
  if (month > 7 || (month === 7 && day >= 15)) {
    return `${year}/${(year + 1) % 100}`
  } else {
    return `${year - 1}/${year % 100}`
  }
}
```

### Problem: Timezone issues

**Solution:**
```ruby
# Backend - set timezone
# config/application.rb
config.time_zone = 'Kathmandu'
config.active_record.default_timezone = :local
```

```typescript
// Frontend - use date-fns with timezone
import { formatInTimeZone } from 'date-fns-tz'

const nepalTime = formatInTimeZone(
  new Date(),
  'Asia/Kathmandu',
  'yyyy-MM-dd HH:mm:ss'
)
```

## Getting Help

If you're still stuck:

1. **Check logs:**
   - Backend: `tail -f backend/log/development.log`
   - Frontend: Browser console (F12)
   - Sidekiq: `tail -f backend/log/sidekiq.log`

2. **Use Rails console:**
   ```bash
   rails console
   # Test models, queries, services interactively
   ```

3. **Use React DevTools:**
   - Install React DevTools browser extension
   - Inspect component state and props

4. **Ask Claude in Cursor:**
   - Reference the custom skills in `.cursor/skills/`
   - Provide error messages and context
   - Ask for specific help with Nepal banking rules

5. **Check documentation:**
   - README.md - Project overview
   - IMPLEMENTATION_GUIDE.md - Step-by-step guide
   - Skills in .cursor/skills/ - Technical patterns

6. **Common commands for debugging:**
   ```bash
   # Rails
   rails routes  # Check all routes
   rails db:migrate:status  # Check migrations
   rails console  # Interactive console
   
   # Next.js
   npm run dev -- --turbo  # Enable Turbo mode
   npm run build  # Check for build errors
   
   # Docker
   docker-compose logs -f  # Follow all logs
   docker-compose exec backend rails console  # Console in container
   ```

## Known Issues

### Issue: Chart.js animations cause flicker on data update

**Workaround:** Disable animations for real-time data
```typescript
const chartOptions = {
  animation: false,  // Disable for real-time updates
  // or
  animation: {
    duration: 500  // Reduce duration
  }
}
```

### Issue: PostgreSQL full-text search doesn't support Nepali

**Workaround:** Use `ILIKE` for Nepali text
```ruby
# Instead of
Customer.where('name @@ ?', 'search term')

# Use
Customer.where('name ILIKE ?', '%search term%')
```

### Issue: Time rounding issues due to +05:45 offset

**Workaround:** Always use timezone-aware functions
```ruby
# Bad
Time.now

# Good
Time.current
Time.zone.now
```

---

**Still having issues? Open an issue or contact support.**
