---
name: bankbi-advanced-analytics
description: Advanced BI analytics including KPI tree decomposition (DuPont ROE), board governance packs, scheduled regulatory reports, comprehensive risk analysis (NPL, Basel III, VaR, stress tests), customer profitability funnels with KYC risk tiers, and employer payroll banking. Use when implementing advanced analytics, regulatory reporting, or sophisticated dashboard features.
---

# BankBI Advanced Analytics & Reporting

Specialized analytics features for executive decision-making, regulatory compliance, and advanced business intelligence.

## 1. KPI Tree Analysis (DuPont Decomposition)

Interactive hierarchical KPI breakdown with driver analysis and waterfall contributions.

### Features

- **DuPont ROE Tree**: Three-level decomposition (Net Profit Margin × Asset Utilization × Financial Leverage)
- **Variance Waterfall**: Contribution analysis showing which drivers moved the metric
- **Drill Depth Control**: 2-4 level hierarchies
- **Comparison Modes**: Variance vs Target, Budget, YoY

### Backend Implementation

```ruby
# app/services/kpi_tree_service.rb
class KpiTreeService
  TREE_DEFINITIONS = {
    'roe' => {
      name: 'Return on Equity',
      formula: 'net_profit_margin * asset_utilization * financial_leverage',
      children: {
        'net_profit_margin' => {
          formula: 'pat / revenue',
          children: {
            'nii' => { formula: 'interest_income - interest_expense' },
            'fee_income' => { formula: 'sum(fees)' },
            'operating_expenses' => { formula: 'sum(opex)' },
            'loan_loss_provision' => { formula: 'sum(llp)' }
          }
        },
        'asset_utilization' => {
          formula: 'revenue / avg_assets',
          children: {
            'loans' => { formula: 'sum(loan_balances)' },
            'deposits' => { formula: 'sum(deposit_balances)' }
          }
        },
        'financial_leverage' => {
          formula: 'assets / equity'
        }
      }
    },
    'npl_ratio' => {
      name: 'NPL Ratio',
      formula: 'npl_loans / total_loans',
      children: {
        'retail_npl' => { formula: 'retail_npl / retail_loans' },
        'commercial_npl' => { formula: 'commercial_npl / commercial_loans' },
        'mortgage_npl' => { formula: 'mortgage_npl / mortgage_loans' }
      }
    },
    'cost_to_income' => {
      name: 'Cost-to-Income Ratio',
      formula: 'operating_expenses / revenue',
      children: {
        'personnel_cost' => { formula: 'sum(salaries_benefits)' },
        'technology_cost' => { formula: 'sum(it_expenses)' },
        'property_cost' => { formula: 'sum(rent_utilities)' },
        'other_opex' => { formula: 'sum(other_expenses)' }
      }
    }
  }
  
  def initialize(root_kpi:, start_date:, end_date:, entity: 'group', drill_depth: 3)
    @root_kpi = root_kpi
    @start_date = start_date
    @end_date = end_date
    @entity = entity
    @drill_depth = drill_depth
  end
  
  def execute
    {
      root: calculate_root_metrics,
      tree: build_tree(@root_kpi, 1),
      waterfall: calculate_waterfall,
      comparison: calculate_comparison
    }
  end
  
  private
  
  def build_tree(kpi_key, current_depth)
    return nil if current_depth > @drill_depth
    
    definition = TREE_DEFINITIONS[kpi_key]
    return nil unless definition
    
    current_value = calculate_metric(kpi_key, @start_date, @end_date)
    previous_value = calculate_metric(kpi_key, previous_period_start, previous_period_end)
    
    node = {
      name: definition[:name],
      value: current_value,
      previous_value: previous_value,
      change: ((current_value - previous_value) / previous_value * 100).round(2),
      formula: definition[:formula],
      level: current_depth
    }
    
    if definition[:children] && current_depth < @drill_depth
      node[:children] = definition[:children].map do |child_key, child_def|
        build_tree(child_key, current_depth + 1)
      end.compact
    end
    
    node
  end
  
  def calculate_waterfall
    # Calculate each component's contribution to ROE change
    components = ['net_profit_margin', 'asset_utilization', 'financial_leverage']
    
    components.map do |component|
      current = calculate_metric(component, @start_date, @end_date)
      previous = calculate_metric(component, previous_period_start, previous_period_end)
      contribution = calculate_contribution_to_roe(component, current - previous)
      
      {
        component: component,
        contribution: contribution,
        change: current - previous
      }
    end
  end
  
  def calculate_metric(kpi_key, start_date, end_date)
    case kpi_key
    when 'roe'
      pat = DailyMetric.where(metric_date: start_date..end_date).sum(:net_profit)
      equity = DailyMetric.where(metric_date: start_date..end_date).average(:total_equity)
      (pat / equity * 100).round(2)
    when 'net_profit_margin'
      pat = DailyMetric.where(metric_date: start_date..end_date).sum(:net_profit)
      revenue = DailyMetric.where(metric_date: start_date..end_date).sum(:total_revenue)
      (pat / revenue * 100).round(2)
    # ... other metrics
    end
  end
end
```

### API Endpoint

```ruby
# app/controllers/api/v1/analytics_controller.rb
module Api
  module V1
    class AnalyticsController < BaseController
      def kpi_tree
        service = KpiTreeService.new(
          root_kpi: params[:root_kpi] || 'roe',
          start_date: params[:start_date],
          end_date: params[:end_date],
          entity: params[:entity] || 'group',
          drill_depth: params[:drill_depth]&.to_i || 3
        )
        
        render json: service.execute
      end
    end
  end
end
```

## 2. Board & Governance Packs

Automated board pack generation with multiple report types and approval workflow.

### Report Types

- **Board Pack**: Executive summary, financial performance, risk report, branch performance, regulatory disclosures
- **ALCO Report**: Asset-Liability Committee reports
- **Risk Committee Pack**: Comprehensive risk analysis
- **Audit Committee Pack**: Audit findings and compliance

### Implementation

```ruby
# app/models/board_pack.rb
class BoardPack < ApplicationRecord
  REPORT_TYPES = ['Board Pack', 'ALCO Report', 'Risk Committee', 'Audit Committee']
  STATUSES = ['draft', 'review', 'final', 'approved']
  SECTIONS = [
    'executive_summary',
    'financial_performance',
    'risk_report',
    'branch_performance',
    'regulatory_disclosures',
    'alco_data',
    'audit_findings'
  ]
  
  has_many :board_pack_sections, dependent: :destroy
  has_many :board_pack_downloads, dependent: :destroy
  
  validates :report_type, inclusion: { in: REPORT_TYPES }
  validates :status, inclusion: { in: STATUSES }
  validates :period, presence: true
  
  scope :by_type, ->(type) { where(report_type: type) }
  scope :by_status, ->(status) { where(status: status) }
  scope :recent, -> { order(period: :desc).limit(12) }
  
  def generate!
    BoardPackGenerationJob.perform_later(id)
  end
  
  def section_status(section_key)
    section = board_pack_sections.find_by(section_key: section_key)
    section&.status || 'pending'
  end
  
  def all_sections_ready?
    required_sections = sections_for_type
    required_sections.all? { |section| section_status(section) == 'ready' }
  end
  
  def sections_for_type
    case report_type
    when 'Board Pack'
      ['executive_summary', 'financial_performance', 'risk_report', 
       'branch_performance', 'regulatory_disclosures']
    when 'ALCO Report'
      ['alco_data', 'liquidity_analysis', 'interest_rate_risk']
    when 'Risk Committee'
      ['risk_report', 'npl_analysis', 'stress_test_results']
    when 'Audit Committee'
      ['audit_findings', 'compliance_status', 'internal_controls']
    end
  end
end

# app/models/board_pack_section.rb
class BoardPackSection < ApplicationRecord
  belongs_to :board_pack
  
  SECTION_STATUSES = ['pending', 'generating', 'ready', 'review', 'error']
  
  validates :section_key, presence: true
  validates :status, inclusion: { in: SECTION_STATUSES }
  
  has_one_attached :pdf_file
  
  def generate_content
    case section_key
    when 'executive_summary'
      ExecutiveSummaryGenerator.new(board_pack).generate
    when 'financial_performance'
      FinancialPerformanceGenerator.new(board_pack).generate
    when 'risk_report'
      RiskReportGenerator.new(board_pack).generate
    # ... other sections
    end
  end
end
```

### PDF Generation Service

```ruby
# app/services/board_pack_generator.rb
class BoardPackGenerator
  def initialize(board_pack)
    @board_pack = board_pack
  end
  
  def generate
    pdf = CombinePDF.new
    
    # Cover page
    pdf << generate_cover_page
    
    # Table of contents
    pdf << generate_toc
    
    # Each section
    @board_pack.sections_for_type.each do |section_key|
      section_pdf = generate_section(section_key)
      pdf << section_pdf if section_pdf
    end
    
    # Save to storage
    pdf_content = pdf.to_pdf
    @board_pack.pdf_file.attach(
      io: StringIO.new(pdf_content),
      filename: "#{@board_pack.report_type}_#{@board_pack.period}.pdf",
      content_type: 'application/pdf'
    )
    
    @board_pack.update(status: 'final', generated_at: Time.current)
  end
  
  private
  
  def generate_cover_page
    WickedPdf.new.pdf_from_string(
      render_to_string(
        template: 'board_packs/cover',
        locals: { board_pack: @board_pack }
      )
    )
  end
end
```

## 3. Scheduled & Regulatory Reports

Automated report distribution with scheduling engine and delivery tracking.

### Features

- **Flexible Scheduling**: Daily, Weekly, Monthly, Quarterly, Custom (5th business day, EOM)
- **Multi-format**: PDF, Excel, Email, XML (for NRB submissions)
- **Recipient Management**: Groups, individuals, regulatory bodies
- **Delivery Tracking**: Success/failure monitoring, retry logic
- **SLA Monitoring**: Track average delivery time

### Implementation

```ruby
# app/models/scheduled_report.rb
class ScheduledReport < ApplicationRecord
  FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'custom']
  FORMATS = ['pdf', 'excel', 'email', 'xml']
  STATUSES = ['active', 'paused', 'failed']
  
  has_many :scheduled_report_recipients, dependent: :destroy
  has_many :report_runs, dependent: :destroy
  
  validates :name, presence: true
  validates :frequency, inclusion: { in: FREQUENCIES }
  validates :status, inclusion: { in: STATUSES }
  
  scope :active, -> { where(status: 'active') }
  scope :due_now, -> { 
    where('next_run_at <= ?', Time.current)
      .where(status: 'active')
  }
  
  def calculate_next_run
    case frequency
    when 'daily'
      calculate_next_daily_run
    when 'weekly'
      calculate_next_weekly_run
    when 'monthly'
      calculate_next_monthly_run
    when 'custom'
      calculate_custom_run
    end
  end
  
  def execute!
    ReportExecutionJob.perform_later(id)
  end
  
  private
  
  def calculate_next_monthly_run
    # Handle "5th business day" logic
    if schedule_config['type'] == 'business_day'
      next_month = Time.current.next_month.beginning_of_month
      business_day_count = 0
      current_day = next_month
      
      while business_day_count < schedule_config['business_day']
        current_day += 1.day
        business_day_count += 1 if current_day.on_weekday? && !public_holiday?(current_day)
      end
      
      current_day.change(hour: schedule_config['hour'], min: schedule_config['minute'])
    end
  end
end

# app/jobs/report_execution_job.rb
class ReportExecutionJob < ApplicationJob
  queue_as :reports
  
  def perform(scheduled_report_id)
    report = ScheduledReport.find(scheduled_report_id)
    
    run = ReportRun.create!(
      scheduled_report: report,
      started_at: Time.current,
      status: 'running'
    )
    
    begin
      # Generate report
      content = generate_report_content(report)
      
      # Deliver to recipients
      report.scheduled_report_recipients.each do |recipient|
        deliver_to_recipient(recipient, content, report.format)
      end
      
      run.update!(
        completed_at: Time.current,
        status: 'success',
        delivery_time: Time.current - run.started_at
      )
      
      # Calculate next run
      report.update!(next_run_at: report.calculate_next_run)
      
    rescue => e
      run.update!(
        completed_at: Time.current,
        status: 'failed',
        error_message: e.message
      )
      
      # Alert on failure
      AlertService.notify_report_failure(report, e)
    end
  end
end
```

### NRB Regulatory Submission

```ruby
# app/services/nrb_submission_service.rb
class NrbSubmissionService
  NRB_REPORTS = {
    'prudential_return' => {
      frequency: 'monthly',
      deadline: 'end_of_month',
      format: 'xml',
      schema: 'nrb_prudential_v2.xsd'
    },
    'icaap' => {
      frequency: 'quarterly',
      deadline: '30_days_after_quarter',
      format: 'pdf',
      sections: ['capital_adequacy', 'risk_assessment', 'stress_tests']
    }
  }
  
  def initialize(report_type, period)
    @report_type = report_type
    @period = period
    @config = NRB_REPORTS[report_type]
  end
  
  def generate
    case @config[:format]
    when 'xml'
      generate_xml_submission
    when 'pdf'
      generate_pdf_submission
    end
  end
  
  private
  
  def generate_xml_submission
    builder = Nokogiri::XML::Builder.new(encoding: 'UTF-8') do |xml|
      xml.PrudentialReturn('xmlns' => 'http://nrb.org.np/schemas/prudential') {
        xml.Header {
          xml.BankCode ENV['NRB_BANK_CODE']
          xml.ReportingPeriod @period
          xml.SubmissionDate Date.today.iso8601
        }
        xml.CapitalAdequacy {
          xml.CAR calculate_car
          xml.Tier1Capital calculate_tier1
          xml.Tier2Capital calculate_tier2
          xml.RWA calculate_rwa
        }
        xml.AssetQuality {
          xml.NPLRatio calculate_npl_ratio
          xml.ProvisionCoverage calculate_provision_coverage
        }
        # ... more sections
      }
    end
    
    # Validate against XSD schema
    xsd = Nokogiri::XML::Schema(File.read("lib/schemas/#{@config[:schema]}"))
    xml_doc = Nokogiri::XML(builder.to_xml)
    
    errors = xsd.validate(xml_doc)
    raise "XML validation failed: #{errors.join(', ')}" if errors.any?
    
    builder.to_xml
  end
end
```

## 4. Comprehensive Risk Analysis

Advanced risk analytics with Basel III compliance, stress testing, and multi-dimensional NPL heatmaps.

### Risk Metrics Tracked

**Credit Risk:**
- NPL Ratio by province, loan type, bucket
- Provision Coverage Ratio
- Default Rate (90+ DPD)
- Loan Approval/Rejection Rates

**Market Risk:**
- Value at Risk (VaR) - Total, Interest Rate, FX, Equity
- Stress testing scenarios

**Regulatory:**
- Capital Adequacy Ratio (CAR) - Basel III
- Leverage Ratio
- Liquidity Coverage Ratio (LCR)
- Net Stable Funding Ratio (NSFR)

**Operational:**
- Cyber Risk Scoring
- Operational Loss Events

### Implementation

```ruby
# app/services/risk_dashboard_service.rb
class RiskDashboardService
  def initialize(filters = {})
    @filters = filters
  end
  
  def execute
    {
      alerts: generate_alerts,
      summary_metrics: calculate_summary_metrics,
      npl_analysis: npl_analysis,
      regulatory_capital: regulatory_capital,
      var_analysis: var_analysis,
      stress_tests: stress_test_results,
      npl_heatmap: generate_npl_heatmap
    }
  end
  
  private
  
  def generate_alerts
    alerts = []
    
    # Critical: Cyber risk
    cyber_score = calculate_cyber_risk_score
    if cyber_score >= 80
      alerts << {
        severity: 'critical',
        type: 'cyber_risk',
        message: "Cyber Risk score #{cyber_score}/100 - immediate review required",
        branches: identify_high_risk_branches
      }
    end
    
    # Warning: NPL approaching threshold
    branches_near_threshold = Branch.joins(:loans)
                                   .group('branches.id')
                                   .having('SUM(CASE WHEN loans.risk_category IN (?) THEN loans.outstanding_balance ELSE 0 END) / SUM(loans.outstanding_balance) >= ?', 
                                          ['Substandard', 'Doubtful', 'Loss'], 0.027)
    
    branches_near_threshold.each do |branch|
      npl_ratio = branch.calculate_npl_ratio
      alerts << {
        severity: 'warning',
        type: 'npl_threshold',
        message: "NPL ratio #{(npl_ratio * 100).round(2)}% at #{branch.name} - approaching NRB threshold 3.0%",
        branch_id: branch.id
      }
    end
    
    alerts
  end
  
  def npl_analysis
    {
      trend_by_category: npl_trend_by_loan_category,
      portfolio_quality: loan_portfolio_quality,
      top_delinquent_accounts: top_delinquent_accounts(limit: 20)
    }
  end
  
  def generate_npl_heatmap
    # Province × Loan Type heatmap
    provinces = ['Bagmati', 'Gandaki', 'Lumbini', 'Madhesh', 'Koshi', 'Karnali', 'Sudurpashchim']
    loan_types = ['Retail Loans', 'Commercial', 'Mortgage', 'Credit Cards', 'SME Loans']
    
    heatmap = provinces.map do |province|
      row = { province: province }
      
      loan_types.each do |loan_type|
        npl_ratio = calculate_npl_ratio_for_segment(province, loan_type)
        row[loan_type] = {
          value: npl_ratio,
          severity: classify_npl_severity(npl_ratio)
        }
      end
      
      row[:portfolio_avg] = calculate_average_npl(province)
      row
    end
    
    heatmap
  end
  
  def classify_npl_severity(ratio)
    case ratio
    when 0...1.5 then 'very_low'
    when 1.5...2.0 then 'low'
    when 2.0...2.5 then 'moderate'
    when 2.5...3.5 then 'high'
    else 'critical'
    end
  end
  
  def var_analysis
    # Value at Risk calculation (95% confidence, 1-day)
    {
      total_market_var: calculate_total_var,
      interest_rate_var: calculate_ir_var,
      fx_var: calculate_fx_var,
      equity_var: calculate_equity_var,
      historical: var_history(days: 30)
    }
  end
  
  def regulatory_capital
    {
      total_rwa: calculate_total_rwa,
      credit_rwa: calculate_credit_rwa,
      operational_rwa: calculate_operational_rwa,
      market_rwa: calculate_market_rwa,
      car: calculate_car,
      tier1_ratio: calculate_tier1_ratio,
      tier2_ratio: calculate_tier2_ratio
    }
  end
end
```

## 5. Customer & Portfolio Analytics

Advanced customer analytics with profitability funnels, KYC risk tiers, and cohort analysis.

### Features

**Customer Segmentation:**
- Mass Retail, Affluent, SME, Private Banking
- Revenue contribution analysis
- Product penetration (products per customer)

**Profitability Analysis:**
- Customer profitability funnel (ARPU by segment)
- Revenue and profit contribution
- Lifetime value calculations

**KYC Risk Classification (NRB-Mandated):**
- **Tier 1 - Low Risk (SDD)**: Simplified Due Diligence, annual review
- **Tier 2 - Medium Risk (CDD)**: Customer Due Diligence, 6-month review
- **Tier 3 - High Risk (EDD)**: Enhanced Due Diligence, 90-day review, PEP/high-value

**Metrics:**
- NPS Score, Churn Rate
- Acquisition vs Attrition trends
- Credit score distribution
- Age and gender demographics
- Cohort retention analysis

### Implementation

```ruby
# app/services/customer_analytics_service.rb
class CustomerAnalyticsService
  def initialize(filters = {})
    @filters = filters
  end
  
  def execute
    {
      summary: customer_summary,
      segmentation: segment_analysis,
      profitability_funnel: profitability_funnel,
      kyc_risk: kyc_risk_classification,
      cohort_retention: cohort_retention_analysis,
      demographics: demographic_analysis
    }
  end
  
  private
  
  def profitability_funnel
    segments = ['Private Banking', 'Affluent', 'SME', 'Mass Retail']
    
    segments.map do |segment|
      customers = Customer.where(segment: segment)
      total_revenue = calculate_segment_revenue(segment)
      customer_count = customers.count
      
      {
        segment: segment,
        customer_count: customer_count,
        total_revenue: total_revenue,
        arpu: customer_count > 0 ? total_revenue / customer_count : 0,
        revenue_share: (total_revenue / total_customer_revenue * 100).round(1)
      }
    end.sort_by { |s| -s[:total_revenue] }
  end
  
  def kyc_risk_classification
    {
      tier1_low_risk: {
        count: Customer.where(kyc_risk_tier: 1).count,
        percentage: (Customer.where(kyc_risk_tier: 1).count.to_f / Customer.count * 100).round(1),
        description: 'Simplified Due Diligence · Annual review cycle',
        review_frequency: 'annual'
      },
      tier2_medium_risk: {
        count: Customer.where(kyc_risk_tier: 2).count,
        percentage: (Customer.where(kyc_risk_tier: 2).count.to_f / Customer.count * 100).round(1),
        description: 'Customer Due Diligence · 6-month review cycle',
        review_frequency: '6_months'
      },
      tier3_high_risk: {
        count: Customer.where(kyc_risk_tier: 3).count,
        percentage: (Customer.where(kyc_risk_tier: 3).count.to_f / Customer.count * 100).round(1),
        description: 'Enhanced Due Diligence · 90-day review · PEP / high-value',
        review_frequency: '90_days',
        reviews_due: Customer.where(kyc_risk_tier: 3)
                           .where('last_kyc_review_at < ?', 90.days.ago)
                           .count
      }
    }
  end
  
  def cohort_retention_analysis
    # Group customers by acquisition quarter and track retention
    cohorts = Customer.group_by { |c| c.created_at.beginning_of_quarter }
    
    cohorts.map do |quarter, customers|
      initial_count = customers.count
      retention_by_period = []
      
      12.times do |months_after|
        retained = customers.count { |c| c.still_active?(quarter + months_after.months) }
        retention_by_period << {
          period: months_after,
          retained: retained,
          percentage: (retained.to_f / initial_count * 100).round(1)
        }
      end
      
      {
        cohort: quarter.strftime('%Y Q%q'),
        initial_size: initial_count,
        retention: retention_by_period
      }
    end
  end
end
```

## 6. Employer & Payroll Banking

Corporate salary banking with relationship management and working capital links.

### Features

- Employer directory with industry classification
- Employee count tracking
- MTD payroll credit volumes
- Working Capital/Overdraft facilities
- Relationship Manager assignment
- Branch servicing linkage

### Implementation

```ruby
# app/models/employer.rb
class Employer < ApplicationRecord
  INDUSTRIES = [
    'Energy & utilities', 'Insurance', 'Hospitality', 'Manufacturing',
    'Agriculture & trade', 'Logistics', 'Healthcare', 'IT & services'
  ]
  
  STATUSES = ['active', 'review', 'onboarding', 'churned']
  
  belongs_to :servicing_branch, class_name: 'Branch'
  belongs_to :relationship_manager, class_name: 'User'
  has_many :employer_employees
  has_many :payroll_transactions
  
  validates :name, presence: true
  validates :industry, inclusion: { in: INDUSTRIES }
  validates :status, inclusion: { in: STATUSES }
  
  def mtd_payroll
    start_of_month = Date.today.beginning_of_month
    payroll_transactions.where(transaction_date: start_of_month..Date.today)
                       .sum(:amount)
  end
  
  def employee_count
    employer_employees.where(status: 'active').count
  end
  
  def working_capital_facility
    # Sum of WC/OD facilities
    credit_facilities.where(facility_type: ['working_capital', 'overdraft'])
                    .sum(:approved_limit)
  end
end
```

---

This skill covers all advanced analytics features from your HTML dashboards. Combine with other BankBI skills for complete implementation.
