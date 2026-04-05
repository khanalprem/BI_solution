---
name: bi-dashboard-api-design
description: Design high-performance REST APIs for BI dashboards with aggregations, filtering, time-series data, and real-time metrics. Use when building dashboard APIs, data aggregation endpoints, or analytical query interfaces.
---

# BI Dashboard API Design

Design efficient APIs for business intelligence dashboards with complex aggregations and filtering.

## API Design Principles

1. **Separate read and write concerns** - BI is read-heavy
2. **Pre-aggregate data** - Don't compute on every request
3. **Support flexible filtering** - Region, branch, date range, product
4. **Paginate large datasets** - Use cursor-based pagination
5. **Version your APIs** - `/api/v1/` for stability
6. **Cache aggressively** - Most BI data is stale-tolerant

## Endpoint Structure

### Dashboard Summary Endpoints

```
GET /api/v1/dashboards/executive
GET /api/v1/dashboards/financial
GET /api/v1/dashboards/branch
GET /api/v1/dashboards/customer
GET /api/v1/dashboards/risk
GET /api/v1/dashboards/digital
```

**Query Parameters (standard across all):**
```
?start_date=2026-01-01
&end_date=2026-03-31
&branch_ids[]=1&branch_ids[]=2
&region=Central
&compare_period=previous_period  # or previous_year, custom
&granularity=daily  # or weekly, monthly, quarterly
```

### Example: Executive Dashboard Endpoint

```ruby
# app/controllers/api/v1/dashboards_controller.rb
def executive
  cache_key = "executive_dashboard_#{cache_params_key}"
  
  data = Rails.cache.fetch(cache_key, expires_in: 15.minutes) do
    service = ExecutiveDashboardService.new(dashboard_params)
    service.execute
  end
  
  render json: data
end

private

def dashboard_params
  params.permit(
    :start_date, :end_date, :region, :compare_period, :granularity,
    branch_ids: []
  )
end

def cache_params_key
  dashboard_params.to_h.sort.to_s.hash
end
```

**Response format:**
```json
{
  "period": {
    "start_date": "2026-01-01",
    "end_date": "2026-03-31",
    "label": "Q1 2026"
  },
  "summary": {
    "total_deposits": {
      "value": 12500000000,
      "change": 12.5,
      "change_type": "percentage",
      "trend": "up"
    },
    "total_loans": {
      "value": 9800000000,
      "change": 8.3,
      "change_type": "percentage",
      "trend": "up"
    },
    "npl_ratio": {
      "value": 2.45,
      "change": -0.15,
      "change_type": "absolute",
      "trend": "down",
      "format": "percentage"
    },
    "casa_ratio": {
      "value": 68.5,
      "change": 2.1,
      "change_type": "absolute",
      "trend": "up",
      "format": "percentage"
    }
  },
  "trends": {
    "deposits": [
      { "date": "2026-01-01", "value": 11500000000 },
      { "date": "2026-02-01", "value": 12000000000 },
      { "date": "2026-03-01", "value": 12500000000 }
    ],
    "loans": [
      { "date": "2026-01-01", "value": 9200000000 },
      { "date": "2026-02-01", "value": 9500000000 },
      { "date": "2026-03-01", "value": 9800000000 }
    ]
  },
  "breakdowns": {
    "by_region": [
      { "region": "Central", "deposits": 5000000000, "loans": 4000000000 },
      { "region": "Eastern", "deposits": 3500000000, "loans": 2800000000 }
    ],
    "by_product": [
      { "product": "Savings", "value": 7000000000, "percentage": 56 },
      { "product": "Current", "value": 1500000000, "percentage": 12 }
    ]
  },
  "metadata": {
    "last_updated": "2026-04-05T11:45:00Z",
    "data_freshness": "15 minutes",
    "cache_hit": true
  }
}
```

## Service Layer Pattern

```ruby
# app/services/executive_dashboard_service.rb
class ExecutiveDashboardService
  def initialize(params)
    @start_date = parse_date(params[:start_date]) || 30.days.ago
    @end_date = parse_date(params[:end_date]) || Date.today
    @branch_ids = params[:branch_ids]
    @region = params[:region]
    @granularity = params[:granularity] || 'daily'
  end
  
  def execute
    {
      period: period_info,
      summary: summary_metrics,
      trends: trend_data,
      breakdowns: breakdown_data,
      metadata: metadata
    }
  end
  
  private
  
  def base_scope
    scope = DailyMetric.where(metric_date: @start_date..@end_date)
    scope = scope.where(branch_id: @branch_ids) if @branch_ids.present?
    scope = scope.joins(:branch).where(branches: { region: @region }) if @region.present?
    scope
  end
  
  def summary_metrics
    current = calculate_period_metrics(@start_date, @end_date)
    previous = calculate_period_metrics(previous_period_start, previous_period_end)
    
    build_metric_summary(current, previous)
  end
  
  def trend_data
    base_scope
      .group_by_period(@granularity, :metric_date)
      .sum(:total_deposits, :total_loans)
  end
  
  def breakdown_data
    {
      by_region: breakdown_by_region,
      by_product: breakdown_by_product,
      by_branch_category: breakdown_by_branch_category
    }
  end
  
  def calculate_period_metrics(start_date, end_date)
    DailyMetric.where(metric_date: start_date..end_date).select(
      'SUM(total_deposits) as deposits',
      'SUM(total_loans) as loans',
      'SUM(total_revenue) as revenue'
    ).first
  end
  
  def build_metric_summary(current, previous)
    {
      total_deposits: metric_with_change(current.deposits, previous.deposits),
      total_loans: metric_with_change(current.loans, previous.loans),
      npl_ratio: calculate_npl_ratio,
      casa_ratio: calculate_casa_ratio
    }
  end
  
  def metric_with_change(current_value, previous_value)
    change = ((current_value - previous_value) / previous_value * 100).round(2)
    {
      value: current_value,
      change: change,
      change_type: 'percentage',
      trend: change >= 0 ? 'up' : 'down'
    }
  end
end
```

## Time-Series Data Patterns

### Daily Aggregation Job

```ruby
# app/jobs/daily_metrics_aggregation_job.rb
class DailyMetricsAggregationJob < ApplicationJob
  queue_as :default
  
  def perform(date = Date.yesterday)
    Branch.active.find_each do |branch|
      aggregate_branch_metrics(branch, date)
    end
  end
  
  private
  
  def aggregate_branch_metrics(branch, date)
    DailyMetric.create_or_update_by(metric_date: date, branch_id: branch.id) do |metric|
      metric.total_deposits = calculate_deposits(branch, date)
      metric.total_loans = calculate_loans(branch, date)
      metric.total_revenue = calculate_revenue(branch, date)
      metric.new_customers = count_new_customers(branch, date)
      metric.active_accounts = count_active_accounts(branch, date)
    end
  end
  
  def calculate_deposits(branch, date)
    Account.where(branch: branch, account_type: ['Savings', 'Current', 'Fixed Deposit'])
           .where('opened_date <= ?', date)
           .sum(:balance)
  end
end
```

### Materialized View for Complex Queries

```sql
-- db/migrate/TIMESTAMP_create_branch_performance_view.rb
CREATE MATERIALIZED VIEW branch_performance_summary AS
SELECT
  b.id as branch_id,
  b.name as branch_name,
  b.region,
  DATE_TRUNC('month', dm.metric_date) as month,
  SUM(dm.total_deposits) as total_deposits,
  SUM(dm.total_loans) as total_loans,
  SUM(dm.total_revenue) as total_revenue,
  AVG(dm.total_deposits) as avg_deposits,
  COUNT(DISTINCT dm.metric_date) as days_count
FROM branches b
JOIN daily_metrics dm ON b.id = dm.branch_id
GROUP BY b.id, b.name, b.region, DATE_TRUNC('month', dm.metric_date);

CREATE INDEX idx_branch_perf_month ON branch_performance_summary(month);
CREATE INDEX idx_branch_perf_region ON branch_performance_summary(region);
```

**Refresh strategy:**
```ruby
# Refresh nightly
ActiveRecord::Base.connection.execute('REFRESH MATERIALIZED VIEW CONCURRENTLY branch_performance_summary')
```

## Filtering Patterns

### Multi-Dimensional Filter Support

```ruby
# app/services/transaction_filter_service.rb
class TransactionFilterService
  ALLOWED_FILTERS = %i[
    branch_ids region province
    channel transaction_type
    min_amount max_amount
    customer_segment
  ].freeze
  
  def initialize(base_scope, filters)
    @scope = base_scope
    @filters = filters.slice(*ALLOWED_FILTERS)
  end
  
  def apply
    @filters.each do |key, value|
      @scope = send("filter_by_#{key}", value) if value.present?
    end
    @scope
  end
  
  private
  
  def filter_by_branch_ids(ids)
    @scope.where(branch_id: ids)
  end
  
  def filter_by_region(region)
    @scope.joins(:branch).where(branches: { region: region })
  end
  
  def filter_by_channel(channel)
    @scope.where(channel: channel)
  end
  
  def filter_by_min_amount(amount)
    @scope.where('amount >= ?', amount)
  end
  
  def filter_by_max_amount(amount)
    @scope.where('amount <= ?', amount)
  end
end

# Usage in controller
def index
  base_scope = Transaction.where(transaction_date: date_range)
  filtered = TransactionFilterService.new(base_scope, filter_params).apply
  
  render json: filtered.page(params[:page])
end
```

## Pagination Patterns

### Cursor-Based Pagination for Large Datasets

```ruby
# app/controllers/api/v1/transactions_controller.rb
def index
  scope = Transaction.order(transaction_date: :desc, id: :desc)
  
  if params[:cursor].present?
    cursor_date, cursor_id = decode_cursor(params[:cursor])
    scope = scope.where(
      '(transaction_date, id) < (?, ?)',
      cursor_date, cursor_id
    )
  end
  
  transactions = scope.limit(100)
  next_cursor = encode_cursor(transactions.last) if transactions.size == 100
  
  render json: {
    data: TransactionSerializer.new(transactions).as_json,
    pagination: {
      next_cursor: next_cursor,
      has_more: next_cursor.present?
    }
  }
end

private

def encode_cursor(record)
  return nil unless record
  Base64.urlsafe_encode64("#{record.transaction_date.iso8601}|#{record.id}")
end

def decode_cursor(cursor)
  date_str, id = Base64.urlsafe_decode64(cursor).split('|')
  [DateTime.parse(date_str), id.to_i]
end
```

## Real-Time Updates with Action Cable

```ruby
# app/channels/dashboard_channel.rb
class DashboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "dashboard_#{params[:dashboard_type]}"
  end
  
  def unsubscribed
    stop_all_streams
  end
end

# Broadcast updates when metrics change
class DailyMetric < ApplicationRecord
  after_commit :broadcast_update, on: [:create, :update]
  
  def broadcast_update
    ActionCable.server.broadcast(
      "dashboard_executive",
      {
        type: 'metric_update',
        branch_id: branch_id,
        date: metric_date,
        data: { deposits: total_deposits, loans: total_loans }
      }
    )
  end
end
```

## Export Endpoints

```ruby
# app/controllers/api/v1/exports_controller.rb
class ExportsController < BaseController
  def dashboard
    job = ExportDashboardJob.perform_later(
      current_user.id,
      params[:dashboard_type],
      export_params
    )
    
    render json: {
      job_id: job.job_id,
      status: 'processing',
      check_url: status_api_v1_export_url(job.job_id)
    }
  end
  
  def status
    job_status = Sidekiq::Status.get(params[:id])
    
    render json: {
      status: job_status,
      download_url: job_status == 'complete' ? download_url : nil
    }
  end
end

# Background job
class ExportDashboardJob < ApplicationJob
  def perform(user_id, dashboard_type, params)
    data = fetch_dashboard_data(dashboard_type, params)
    csv = generate_csv(data)
    
    # Upload to S3 or local storage
    file_url = upload_file(csv, "export_#{dashboard_type}_#{Time.now.to_i}.csv")
    
    # Notify user
    ExportMailer.ready(user_id, file_url).deliver_later
  end
end
```

## Performance Optimization

**1. Database indexes:**
```ruby
add_index :transactions, [:transaction_date, :branch_id, :channel]
add_index :daily_metrics, [:metric_date, :branch_id]
add_index :accounts, [:account_type, :status, :branch_id]
```

**2. Query optimization:**
```ruby
# Bad - N+1 queries
branches = Branch.where(region: 'Central')
branches.each do |branch|
  puts branch.daily_metrics.sum(:total_deposits)
end

# Good - Single query with aggregation
Branch.where(region: 'Central')
      .joins(:daily_metrics)
      .group('branches.id')
      .select('branches.*, SUM(daily_metrics.total_deposits) as total_deposits')
```

**3. Caching strategy:**
```ruby
# Cache dashboard data with smart invalidation
class DashboardCache
  def self.fetch(key, expires_in: 15.minutes)
    Rails.cache.fetch(key, expires_in: expires_in) do
      yield
    end
  end
  
  def self.invalidate(pattern)
    keys = Rails.cache.redis.keys(pattern)
    Rails.cache.delete_multi(keys) if keys.any?
  end
end

# Invalidate on data update
class DailyMetric < ApplicationRecord
  after_commit :invalidate_dashboard_cache
  
  def invalidate_dashboard_cache
    DashboardCache.invalidate("*dashboard*#{metric_date}*")
  end
end
```

**4. Response compression:**
```ruby
# config/initializers/compression.rb
Rails.application.config.middleware.use Rack::Deflater
```

## API Documentation

Use Swagger/OpenAPI for documentation:

```ruby
# Gemfile
gem 'rswag'

# spec/integration/dashboards_spec.rb
require 'swagger_helper'

describe 'Dashboards API' do
  path '/api/v1/dashboards/executive' do
    get 'Executive dashboard summary' do
      tags 'Dashboards'
      produces 'application/json'
      
      parameter name: :start_date, in: :query, type: :string, required: false
      parameter name: :end_date, in: :query, type: :string, required: false
      parameter name: :branch_ids, in: :query, type: :array, items: { type: :integer }
      
      response '200', 'executive dashboard data' do
        schema type: :object,
          properties: {
            summary: { type: :object },
            trends: { type: :object }
          }
        run_test!
      end
    end
  end
end
```

## Testing Patterns

```ruby
# spec/services/executive_dashboard_service_spec.rb
RSpec.describe ExecutiveDashboardService do
  describe '#execute' do
    let(:branch) { create(:branch, region: 'Central') }
    let(:start_date) { Date.parse('2026-01-01') }
    let(:end_date) { Date.parse('2026-03-31') }
    
    before do
      create(:daily_metric, branch: branch, metric_date: start_date, total_deposits: 1000000)
      create(:daily_metric, branch: branch, metric_date: end_date, total_deposits: 1200000)
    end
    
    it 'returns summary metrics' do
      service = described_class.new(start_date: start_date, end_date: end_date)
      result = service.execute
      
      expect(result[:summary][:total_deposits][:value]).to eq(2200000)
    end
    
    it 'calculates change correctly' do
      service = described_class.new(start_date: start_date, end_date: end_date)
      result = service.execute
      
      expect(result[:summary][:total_deposits][:change]).to be > 0
    end
  end
end
```

## Common Pitfalls

1. **Don't compute aggregations on raw transactions table** - Pre-aggregate to daily/monthly tables
2. **Don't return all data** - Always paginate or limit results
3. **Don't forget indexes** - Index on date columns, foreign keys, and filter columns
4. **Don't skip caching** - Cache dashboard responses for at least 5-15 minutes
5. **Don't ignore timezones** - Store UTC, convert on frontend
6. **Don't build complex queries in controllers** - Use service objects
7. **Don't forget API versioning** - `/api/v1/` from day one

## Monitoring

```ruby
# Log slow queries
ActiveSupport::Notifications.subscribe('sql.active_record') do |name, start, finish, id, payload|
  duration = (finish - start) * 1000
  if duration > 1000 # Log queries over 1 second
    Rails.logger.warn "Slow Query (#{duration.round}ms): #{payload[:sql]}"
  end
end

# Monitor API response times
class ApiPerformanceMiddleware
  def call(env)
    start = Time.now
    status, headers, response = @app.call(env)
    duration = Time.now - start
    
    if duration > 2.0
      Rails.logger.warn "Slow API request: #{env['PATH_INFO']} took #{duration}s"
    end
    
    [status, headers, response]
  end
end
```
