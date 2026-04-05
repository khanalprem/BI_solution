# Integrating with Existing Database

Based on your existing SQL files, you already have a PostgreSQL database with transaction summary tables and stored procedures. Here's how to integrate the BankBI application with your existing database.

## Existing Database Structure

### Detected Tables

From `transummary procedure.sql`, you have a `tran_summary` table with these columns:

```sql
-- Existing tran_summary table structure
CREATE TABLE tran_summary (
    acct_num VARCHAR,
    cif_id VARCHAR,
    acct_name VARCHAR,
    gam_solid VARCHAR,
    entry_user VARCHAR,
    vfd_user VARCHAR,
    gam_branch VARCHAR,
    gam_province VARCHAR,
    gam_cluster_id VARCHAR,
    gam_cluster VARCHAR,
    tran_branch VARCHAR,
    tran_cluster_id VARCHAR,
    tran_cluster VARCHAR,
    tran_province VARCHAR,
    date DATE,
    year INTEGER,
    quarter INTEGER,
    month INTEGER,
    year_quarter VARCHAR,
    year_month VARCHAR,
    month_startdate DATE,
    month_enddate DATE,
    quarter_startdate DATE,
    quarter_enddate DATE,
    year_startdate DATE,
    year_enddate DATE,
    tran_date DATE,
    tran_type VARCHAR,
    part_tran_type VARCHAR,
    acid VARCHAR,
    gl_sub_head_code VARCHAR,
    entry_user_id VARCHAR,
    vfd_user_id VARCHAR,
    tran_solid VARCHAR,
    tran_amt DECIMAL,
    tran_count INTEGER,
    eod_balance DECIMAL,
    merchant VARCHAR,
    service VARCHAR,
    product VARCHAR,
    tran_source VARCHAR,
    signed_tranamt DECIMAL
);

-- EAB (End-of-day Account Balance) table
CREATE TABLE eab (
    acid VARCHAR,
    eod_date DATE,
    end_eod_date DATE,
    tran_date_bal DECIMAL
);
```

### Existing Stored Procedure

You have `get_tran_summary` procedure that:
- Accepts dynamic WHERE clauses for flexible filtering
- Supports pagination
- Handles period comparisons (previous month, year, MTD, YTD)
- Joins with EAB table for balance information
- Uses windowing functions for row numbering

## Integration Strategy

### Option 1: Use Existing Tables (Recommended for Quick Start)

Create Rails models that map to your existing tables **without migrations**:

```ruby
# app/models/tran_summary.rb
class TranSummary < ApplicationRecord
  self.table_name = 'tran_summary'
  self.primary_key = nil  # If no primary key exists
  
  # Define scopes for common queries
  scope :by_date_range, ->(start_date, end_date) { where(tran_date: start_date..end_date) }
  scope :by_branch, ->(branch) { where(gam_branch: branch) }
  scope :by_province, ->(province) { where(gam_province: province) }
  scope :by_account, ->(acct_num) { where(acct_num: acct_num) }
  
  # Aggregation methods
  def self.total_transaction_amount(filters = {})
    apply_filters(filters).sum(:tran_amt)
  end
  
  def self.transaction_count(filters = {})
    apply_filters(filters).sum(:tran_count)
  end
  
  def self.by_branch_summary(start_date, end_date)
    where(tran_date: start_date..end_date)
      .group(:gam_branch, :gam_province)
      .select(
        'gam_branch',
        'gam_province',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as total_count'
      )
  end
  
  private
  
  def self.apply_filters(filters)
    scope = all
    scope = scope.where(tran_date: filters[:start_date]..filters[:end_date]) if filters[:start_date]
    scope = scope.where(gam_branch: filters[:branch]) if filters[:branch]
    scope = scope.where(gam_province: filters[:province]) if filters[:province]
    scope
  end
end

# app/models/eab.rb
class Eab < ApplicationRecord
  self.table_name = 'eab'
  self.primary_key = nil
  
  def self.balance_for_account(acid, date)
    where('? BETWEEN eod_date AND end_eod_date', date)
      .where(acid: acid)
      .first&.tran_date_bal
  end
end
```

### Using the Existing Stored Procedure

Call your existing `get_tran_summary` procedure from Rails:

```ruby
# app/services/transaction_summary_service.rb
class TransactionSummaryService
  def initialize(start_date:, end_date:, filters: {})
    @start_date = start_date
    @end_date = end_date
    @filters = filters
  end
  
  def call
    # Build WHERE clause
    where_clause = build_where_clause
    
    # Call stored procedure
    sql = <<-SQL
      CALL public.get_tran_summary(
        'select tb2.*,e.tran_date_bal',
        'select acct_num, acid, tran_date, sum(tran_amt) tran_amt, sum(tran_count) count',
        $1,
        '', '', '', '', '', '', '', '', '',
        'group by acct_num, acid, tran_date',
        '',
        'order by tran_date',
        'partition by tran_date',
        'join eab e on e.acid=tb2.acid and cast(tb2.tran_date as date) between e.eod_date and e.end_eod_date',
        '',
        $2,
        $3
      );
      SELECT * FROM result;
    SQL
    
    result = ActiveRecord::Base.connection.execute(
      ActiveRecord::Base.send(:sanitize_sql_array, [sql, where_clause, @filters[:page] || 1, @filters[:page_size] || 100])
    )
    
    result.to_a
  end
  
  private
  
  def build_where_clause
    conditions = []
    conditions << "tran_date between '#{@start_date}' and '#{@end_date}'"
    conditions << "gam_branch = '#{@filters[:branch]}'" if @filters[:branch]
    conditions << "gam_province = '#{@filters[:province]}'" if @filters[:province]
    
    "where #{conditions.join(' and ')}"
  end
end
```

### Dashboard Service Using Existing Data

```ruby
# app/services/executive_dashboard_service.rb
class ExecutiveDashboardService
  def initialize(start_date:, end_date:, branch: nil, province: nil)
    @start_date = start_date
    @end_date = end_date
    @branch = branch
    @province = province
  end
  
  def execute
    {
      period: period_info,
      summary: summary_metrics,
      trends: trend_data,
      breakdowns: breakdown_data
    }
  end
  
  private
  
  def summary_metrics
    # Use existing tran_summary table
    scope = TranSummary.where(tran_date: @start_date..@end_date)
    scope = scope.where(gam_branch: @branch) if @branch
    scope = scope.where(gam_province: @province) if @province
    
    {
      total_transactions: {
        value: scope.sum(:tran_count),
        amount: scope.sum(:tran_amt)
      },
      by_type: scope.group(:tran_type).sum(:tran_amt),
      by_channel: scope.group(:tran_source).sum(:tran_amt)
    }
  end
  
  def trend_data
    TranSummary.where(tran_date: @start_date..@end_date)
               .group(:tran_date)
               .order(:tran_date)
               .select('tran_date, SUM(tran_amt) as amount, SUM(tran_count) as count')
               .map { |r| { date: r.tran_date, amount: r.amount, count: r.count } }
  end
  
  def breakdown_data
    {
      by_province: province_breakdown,
      by_branch: branch_breakdown,
      by_cluster: cluster_breakdown
    }
  end
  
  def province_breakdown
    TranSummary.where(tran_date: @start_date..@end_date)
               .group(:gam_province)
               .select('gam_province, SUM(tran_amt) as amount')
               .map { |r| { province: r.gam_province, amount: r.amount } }
  end
end
```

### API Controller Integration

```ruby
# app/controllers/api/v1/dashboards_controller.rb
module Api
  module V1
    class DashboardsController < BaseController
      def executive
        service = ExecutiveDashboardService.new(
          start_date: params[:start_date] || 30.days.ago,
          end_date: params[:end_date] || Date.today,
          branch: params[:branch],
          province: params[:province]
        )
        
        data = service.execute
        
        render json: data
      end
      
      def transactions
        service = TransactionSummaryService.new(
          start_date: params[:start_date],
          end_date: params[:end_date],
          filters: {
            branch: params[:branch],
            province: params[:province],
            page: params[:page] || 1,
            page_size: params[:page_size] || 50
          }
        )
        
        data = service.call
        
        render json: {
          data: data,
          pagination: {
            page: params[:page] || 1,
            page_size: params[:page_size] || 50
          }
        }
      end
    end
  end
end
```

## Option 2: Hybrid Approach (Recommended for Production)

Keep your existing tables for historical data, add new Rails-managed tables for app features:

### Database Configuration

```yaml
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  host: <%= ENV.fetch("DB_HOST") { "localhost" } %>
  username: <%= ENV.fetch("DB_USERNAME") { "postgres" } %>
  password: <%= ENV.fetch("DB_PASSWORD") { "" } %>
  # Use your existing database
  database: <%= ENV.fetch("DB_NAME") { "your_existing_db_name" } %>
```

### Create App-Specific Tables

```ruby
# db/migrate/TIMESTAMP_create_app_tables.rb
class CreateAppTables < ActiveRecord::Migration[7.1]
  def change
    # Users table (new - for authentication)
    create_table :users do |t|
      t.string :email, null: false, index: { unique: true }
      t.string :password_digest
      t.string :full_name
      t.string :role
      t.timestamps
    end
    
    # Branch mapping (maps your existing branch codes to additional metadata)
    create_table :branches do |t|
      t.string :branch_code, null: false, index: { unique: true }  # Maps to gam_branch
      t.string :name
      t.string :region
      t.string :province  # Maps to gam_province
      t.boolean :active, default: true
      t.timestamps
    end
    
    # KPI thresholds (new - for alerting)
    create_table :kpi_thresholds do |t|
      t.string :threshold_type, null: false
      t.decimal :threshold_value, precision: 10, scale: 2
      t.string :branch_code  # Maps to gam_branch
      t.boolean :active, default: true
      t.timestamps
    end
    
    # Audit logs (new - for tracking)
    create_table :audit_logs do |t|
      t.references :user, foreign_key: true
      t.string :action
      t.jsonb :details
      t.string :ip_address
      t.timestamps
    end
  end
end
```

### Mapping Between Systems

```ruby
# app/models/branch.rb
class Branch < ApplicationRecord
  # Map to existing transaction data
  def transactions(start_date, end_date)
    TranSummary.where(
      gam_branch: branch_code,
      tran_date: start_date..end_date
    )
  end
  
  def total_transactions(start_date, end_date)
    transactions(start_date, end_date).sum(:tran_amt)
  end
  
  def transaction_count(start_date, end_date)
    transactions(start_date, end_date).sum(:tran_count)
  end
end
```

## Data Migration from Sample Data

If you need to import data from your `sample data.csv`:

```ruby
# lib/tasks/import.rake
namespace :import do
  desc "Import sample transaction data"
  task transactions: :environment do
    require 'csv'
    
    CSV.foreach('sample data.csv', headers: true) do |row|
      TranSummary.create!(
        acct_num: row['acct_num'],
        cif_id: row['cif_id'],
        tran_date: row['tran_date'],
        tran_amt: row['tran_amt'],
        tran_count: row['tran_count'],
        gam_branch: row['gam_branch'],
        gam_province: row['gam_province'],
        # ... map other columns
      )
    end
    
    puts "Imported #{TranSummary.count} transaction records"
  end
end
```

## Testing with Existing Data

```ruby
# spec/services/executive_dashboard_service_spec.rb
RSpec.describe ExecutiveDashboardService do
  describe '#execute' do
    before do
      # Create test data in tran_summary
      create(:tran_summary, 
        tran_date: Date.today,
        gam_branch: 'BR001',
        tran_amt: 100000,
        tran_count: 10
      )
    end
    
    it 'returns summary metrics from existing tables' do
      service = described_class.new(
        start_date: Date.today,
        end_date: Date.today
      )
      
      result = service.execute
      
      expect(result[:summary][:total_transactions][:amount]).to eq(100000)
      expect(result[:summary][:total_transactions][:value]).to eq(10)
    end
  end
end
```

## Recommended Approach

1. **Week 1**: Use existing tables as-is with Rails models
2. **Week 2**: Add new tables for users, authentication, configuration
3. **Week 3**: Create services that bridge existing and new tables
4. **Week 4**: Build APIs that expose both existing and new data
5. **Week 5**: Frontend integration

This way you:
- ✅ Don't modify existing data structure
- ✅ Leverage existing stored procedures
- ✅ Add modern features (auth, RBAC, audit)
- ✅ Maintain backward compatibility
- ✅ Can deploy incrementally

## Environment Variables

```bash
# .env
DB_NAME=your_existing_database_name
DB_HOST=localhost
DB_USERNAME=postgres
DB_PASSWORD=your_password

# If using existing connection
EXISTING_DB_URL=postgresql://user:pass@host/existing_db
```

## Next Steps

1. Connect to your existing database
2. Verify table structures match
3. Create Rails models for existing tables
4. Test data retrieval
5. Add new app-specific tables
6. Build integration services
