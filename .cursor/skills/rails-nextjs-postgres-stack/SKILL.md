---
name: rails-nextjs-postgres-stack
description: Build full-stack BI applications with Ruby on Rails API backend, Next.js frontend, and PostgreSQL database. Use when implementing Rails APIs, Next.js dashboards, database schemas, authentication, or full-stack BI solutions with these technologies.
---

# Rails + Next.js + PostgreSQL Stack

Build production-ready BI applications with Rails API backend, Next.js frontend, and PostgreSQL.

## Architecture Overview

```
Next.js (Frontend)          Rails API (Backend)         PostgreSQL
─────────────────────       ───────────────────         ──────────
- TypeScript/React          - API-only mode             - TimescaleDB extension
- TanStack Query            - Serializers               - Materialized views
- Chart.js/Recharts         - Background jobs           - Row-level security
- Tailwind CSS              - JWT auth                  - Partitioning
- Server Components         - CORS configured           - Indexes
```

## Project Structure

**Backend (Rails API):**
```
backend/
├── app/
│   ├── controllers/api/v1/     # API endpoints
│   ├── models/                  # ActiveRecord models
│   ├── serializers/             # JSON serializers
│   ├── services/                # Business logic
│   ├── jobs/                    # Background jobs
│   └── policies/                # Authorization
├── config/
│   ├── routes.rb               # API routes
│   ├── database.yml            # DB config
│   └── initializers/
├── db/
│   ├── migrate/                # Migrations
│   ├── seeds.rb                # Seed data
│   └── schema.rb
└── Gemfile
```

**Frontend (Next.js):**
```
frontend/
├── src/
│   ├── app/                    # App router pages
│   │   ├── dashboard/
│   │   ├── financial/
│   │   └── layout.tsx
│   ├── components/             # React components
│   │   ├── ui/                 # UI primitives
│   │   ├── charts/             # Chart components
│   │   └── layout/             # Layout components
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── auth.ts             # Auth helpers
│   │   └── utils.ts
│   └── types/                  # TypeScript types
├── public/
├── next.config.js
└── package.json
```

## Implementation Steps

### Phase 1: Rails API Setup

**1. Create Rails API:**
```bash
rails new backend --api --database=postgresql --skip-test
cd backend
```

**2. Add essential gems to Gemfile:**
```ruby
gem 'rack-cors'           # CORS
gem 'jwt'                 # JWT auth
gem 'bcrypt'              # Password hashing
gem 'active_model_serializers'  # JSON serialization
gem 'kaminari'            # Pagination
gem 'sidekiq'             # Background jobs
gem 'redis'               # Cache/sessions
gem 'dotenv-rails'        # Environment variables

group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
end
```

**3. Configure CORS (config/initializers/cors.rb):**
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:3000', 'https://yourdomain.com'
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true,
      expose: ['Authorization']
  end
end
```

**4. Configure database (config/database.yml):**
```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  host: <%= ENV.fetch("DB_HOST") { "localhost" } %>
  username: <%= ENV.fetch("DB_USERNAME") { "postgres" } %>
  password: <%= ENV.fetch("DB_PASSWORD") { "" } %>

development:
  <<: *default
  database: bankbi_development

test:
  <<: *default
  database: bankbi_test

production:
  <<: *default
  database: bankbi_production
```

### Phase 2: Database Schema Design

**Create core BI tables:**

```ruby
# db/migrate/TIMESTAMP_create_core_schema.rb
class CreateCoreSchema < ActiveRecord::Migration[7.1]
  def change
    # Users & Auth
    create_table :users do |t|
      t.string :email, null: false, index: { unique: true }
      t.string :password_digest
      t.string :full_name
      t.string :role
      t.string :department
      t.timestamps
    end

    # Branches
    create_table :branches do |t|
      t.string :code, null: false, index: { unique: true }
      t.string :name
      t.string :region
      t.string :province
      t.string :district
      t.string :municipality
      t.decimal :latitude, precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
      t.boolean :active, default: true
      t.timestamps
    end

    # Customers
    create_table :customers do |t|
      t.string :customer_id, null: false, index: { unique: true }
      t.string :full_name
      t.string :segment  # Individual, SME, Corporate
      t.string :category # Premium, Regular, Basic
      t.date :onboarding_date
      t.references :branch, foreign_key: true
      t.timestamps
    end

    # Accounts
    create_table :accounts do |t|
      t.string :account_number, null: false, index: { unique: true }
      t.references :customer, foreign_key: true
      t.references :branch, foreign_key: true
      t.string :account_type  # Savings, Current, Fixed Deposit
      t.string :product_code
      t.decimal :balance, precision: 15, scale: 2
      t.string :currency, default: 'NPR'
      t.date :opened_date
      t.string :status  # Active, Dormant, Closed
      t.timestamps
    end

    # Transactions (time-series data)
    create_table :transactions do |t|
      t.references :account, foreign_key: true
      t.references :branch, foreign_key: true
      t.string :transaction_type  # Debit, Credit
      t.string :channel  # Branch, ATM, Mobile, Internet
      t.decimal :amount, precision: 15, scale: 2
      t.string :currency, default: 'NPR'
      t.datetime :transaction_date, index: true
      t.string :description
      t.timestamps
    end

    # Loans
    create_table :loans do |t|
      t.string :loan_number, null: false, index: { unique: true }
      t.references :customer, foreign_key: true
      t.references :branch, foreign_key: true
      t.string :loan_type  # Personal, Home, Business, Agriculture
      t.decimal :principal_amount, precision: 15, scale: 2
      t.decimal :outstanding_balance, precision: 15, scale: 2
      t.decimal :interest_rate, precision: 5, scale: 2
      t.date :disbursement_date
      t.date :maturity_date
      t.string :risk_category  # Standard, Watch, Substandard, Doubtful, Loss
      t.integer :days_past_due, default: 0
      t.timestamps
    end

    # Daily aggregates (materialized view source)
    create_table :daily_metrics do |t|
      t.date :metric_date, null: false, index: true
      t.references :branch, foreign_key: true
      t.decimal :total_deposits, precision: 15, scale: 2
      t.decimal :total_loans, precision: 15, scale: 2
      t.decimal :total_revenue, precision: 15, scale: 2
      t.integer :new_customers
      t.integer :active_accounts
      t.timestamps
      
      t.index [:metric_date, :branch_id], unique: true
    end
  end
end
```

**Add indexes for BI queries:**
```ruby
# db/migrate/TIMESTAMP_add_bi_indexes.rb
class AddBiIndexes < ActiveRecord::Migration[7.1]
  def change
    add_index :transactions, [:transaction_date, :branch_id]
    add_index :transactions, [:transaction_date, :channel]
    add_index :loans, [:risk_category, :branch_id]
    add_index :accounts, [:account_type, :status]
    add_index :daily_metrics, [:metric_date, :branch_id]
  end
end
```

### Phase 3: Rails Models & Business Logic

**User model with JWT auth:**
```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  
  validates :email, presence: true, uniqueness: true
  validates :role, inclusion: { in: %w[admin cfo manager analyst] }
  
  def generate_jwt
    payload = { user_id: id, email: email, exp: 24.hours.from_now.to_i }
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end
  
  def self.from_token(token)
    decoded = JWT.decode(token, Rails.application.credentials.secret_key_base)[0]
    find(decoded['user_id'])
  rescue
    nil
  end
end
```

**Branch model with scopes:**
```ruby
# app/models/branch.rb
class Branch < ApplicationRecord
  has_many :accounts
  has_many :transactions
  has_many :loans
  has_many :daily_metrics
  
  scope :active, -> { where(active: true) }
  scope :by_region, ->(region) { where(region: region) }
  scope :by_province, ->(province) { where(province: province) }
  
  def self.regions
    distinct.pluck(:region).compact.sort
  end
end
```

**Service for financial metrics:**
```ruby
# app/services/financial_metrics_service.rb
class FinancialMetricsService
  def initialize(start_date:, end_date:, branch_ids: nil)
    @start_date = start_date
    @end_date = end_date
    @branch_ids = branch_ids
  end
  
  def execute
    {
      deposits: total_deposits,
      loans: total_loans,
      revenue: total_revenue,
      npl_ratio: npl_ratio,
      casa_ratio: casa_ratio,
      trend: daily_trend
    }
  end
  
  private
  
  def base_scope
    scope = DailyMetric.where(metric_date: @start_date..@end_date)
    scope = scope.where(branch_id: @branch_ids) if @branch_ids.present?
    scope
  end
  
  def total_deposits
    base_scope.sum(:total_deposits)
  end
  
  def total_loans
    base_scope.sum(:total_loans)
  end
  
  def npl_ratio
    total_loans = Loan.sum(:outstanding_balance)
    npl = Loan.where(risk_category: ['Substandard', 'Doubtful', 'Loss']).sum(:outstanding_balance)
    return 0 if total_loans.zero?
    (npl / total_loans * 100).round(2)
  end
  
  def casa_ratio
    savings_current = Account.where(account_type: ['Savings', 'Current']).sum(:balance)
    total_deposits = Account.sum(:balance)
    return 0 if total_deposits.zero?
    (savings_current / total_deposits * 100).round(2)
  end
  
  def daily_trend
    base_scope.group(:metric_date)
              .order(:metric_date)
              .pluck(:metric_date, 'SUM(total_deposits)', 'SUM(total_loans)')
              .map { |date, deposits, loans| { date: date, deposits: deposits, loans: loans } }
  end
end
```

### Phase 4: Rails API Controllers

**Base API controller with auth:**
```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      
      private
      
      def authenticate_user!
        token = request.headers['Authorization']&.split(' ')&.last
        @current_user = User.from_token(token)
        
        render json: { error: 'Unauthorized' }, status: :unauthorized unless @current_user
      end
      
      attr_reader :current_user
    end
  end
end
```

**Auth controller:**
```ruby
# app/controllers/api/v1/auth_controller.rb
module Api
  module V1
    class AuthController < ApplicationController
      def login
        user = User.find_by(email: params[:email])
        
        if user&.authenticate(params[:password])
          token = user.generate_jwt
          render json: { token: token, user: UserSerializer.new(user) }
        else
          render json: { error: 'Invalid credentials' }, status: :unauthorized
        end
      end
      
      def me
        authenticate_user!
        render json: UserSerializer.new(current_user)
      end
    end
  end
end
```

**Dashboard controller:**
```ruby
# app/controllers/api/v1/dashboards_controller.rb
module Api
  module V1
    class DashboardsController < BaseController
      def executive
        metrics = FinancialMetricsService.new(
          start_date: params[:start_date] || 30.days.ago,
          end_date: params[:end_date] || Date.today,
          branch_ids: params[:branch_ids]
        ).execute
        
        render json: metrics
      end
      
      def financial
        data = {
          income_statement: income_statement_data,
          balance_sheet: balance_sheet_data,
          cash_flow: cash_flow_data
        }
        render json: data
      end
      
      private
      
      def income_statement_data
        # Implementation for P&L
      end
    end
  end
end
```

**Routes configuration:**
```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/login', to: 'auth#login'
      get 'auth/me', to: 'auth#me'
      
      resources :dashboards, only: [] do
        collection do
          get :executive
          get :financial
          get :branch
          get :customer
          get :risk
        end
      end
      
      resources :branches, only: [:index, :show]
      resources :customers, only: [:index, :show]
      resources :accounts, only: [:index, :show]
      resources :transactions, only: [:index]
      resources :loans, only: [:index, :show]
    end
  end
end
```

### Phase 5: Next.js Frontend Setup

**1. Create Next.js app:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
cd frontend
npm install axios @tanstack/react-query recharts date-fns
```

**2. API client configuration:**
```typescript
// lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**3. React Query provider:**
```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**4. Custom hooks for data fetching:**
```typescript
// lib/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export function useExecutiveDashboard(params?: {
  startDate?: string;
  endDate?: string;
  branchIds?: number[];
}) {
  return useQuery({
    queryKey: ['executive-dashboard', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboards/executive', { params });
      return data;
    },
  });
}

export function useFinancialDashboard(params?: any) {
  return useQuery({
    queryKey: ['financial-dashboard', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboards/financial', { params });
      return data;
    },
  });
}
```

**5. Dashboard page component:**
```typescript
// app/dashboard/executive/page.tsx
'use client';

import { useExecutiveDashboard } from '@/lib/hooks/useDashboard';
import { MetricCard } from '@/components/MetricCard';
import { TrendChart } from '@/components/charts/TrendChart';

export default function ExecutiveDashboard() {
  const { data, isLoading, error } = useExecutiveDashboard();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading dashboard</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Executive Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Deposits"
          value={data.deposits}
          format="currency"
          change={12.5}
        />
        <MetricCard
          title="Total Loans"
          value={data.loans}
          format="currency"
          change={8.3}
        />
        <MetricCard
          title="NPL Ratio"
          value={data.npl_ratio}
          format="percentage"
          change={-0.5}
        />
        <MetricCard
          title="CASA Ratio"
          value={data.casa_ratio}
          format="percentage"
          change={2.1}
        />
      </div>
      
      <TrendChart data={data.trend} />
    </div>
  );
}
```

### Phase 6: Authentication Flow

**SignIn component:**
```typescript
// app/signin/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('auth_token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10 space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-4 py-2 border rounded"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
        Sign In
      </button>
    </form>
  );
}
```

## Performance Optimization

**Backend:**
- Use Redis for caching: `Rails.cache.fetch("key", expires_in: 1.hour)`
- Implement materialized views for complex aggregations
- Use Sidekiq for data aggregation jobs
- Add database indexes on frequently queried columns
- Use `includes()` to avoid N+1 queries

**Frontend:**
- Server-side rendering for initial page load
- React Query for automatic caching and refetching
- Lazy loading for heavy chart components
- Debounce filter changes
- Use Web Workers for heavy calculations

## Deployment Checklist

- [ ] Set up PostgreSQL with proper user permissions
- [ ] Configure environment variables
- [ ] Set up Redis for caching and background jobs
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Configure Nginx/Apache reverse proxy
- [ ] Set up monitoring (Sentry, New Relic)
- [ ] Configure automated backups
- [ ] Set up CI/CD pipeline
- [ ] Run database migrations
- [ ] Seed initial data

## Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://user:pass@localhost/bankbi_production
REDIS_URL=redis://localhost:6379/0
SECRET_KEY_BASE=your-secret-key
FRONTEND_URL=https://yourdomain.com
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

## Additional Resources

For Nepal banking-specific features, see [nepal-banking-domain](../nepal-banking-domain/SKILL.md)
For BI API design patterns, see [bi-dashboard-api-design](../bi-dashboard-api-design/SKILL.md)
