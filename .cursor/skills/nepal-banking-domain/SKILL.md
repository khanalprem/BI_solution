---
name: nepal-banking-domain
description: Nepal-specific banking business rules, regulations, geography, and domain knowledge for building banking BI solutions. Use when working with Nepal banking data, NRB compliance, Nepali geography, currency (NPR), or Nepal financial sector requirements.
---

# Nepal Banking Domain Knowledge

Essential Nepal banking domain knowledge for building accurate BI solutions.

## Nepal Banking System Overview

### Regulatory Framework

**Nepal Rastra Bank (NRB)** - Central bank and regulatory authority
- Issues banking licenses and regulations
- Sets monetary policy and reserve requirements
- Mandates reporting formats and frequencies
- Enforces compliance and audits

### Bank Categories

1. **Class A - Commercial Banks**
   - Full banking license
   - Can accept all types of deposits
   - Minimum paid-up capital: NPR 8 billion

2. **Class B - Development Banks**
   - Regional/national development focus
   - Limited to certain products
   - Minimum paid-up capital: NPR 2.5 billion

3. **Class C - Finance Companies**
   - Consumer finance focus
   - Cannot issue checks
   - Minimum paid-up capital: NPR 800 million

4. **Class D - Microfinance Institutions**
   - Small loans and rural finance
   - Community-based
   - Minimum paid-up capital: NPR 120 million

## Geographic Structure

### Administrative Divisions

Nepal has a federal structure with:
- **7 Provinces** (numbered 1-7, some renamed)
- **77 Districts** (historical but still used for banking)
- **753 Local Units** (municipalities and rural municipalities)

### Provinces and Major Cities

```ruby
# app/models/concerns/nepal_geography.rb
module NepalGeography
  PROVINCES = {
    'Koshi' => { number: 1, capital: 'Biratnagar' },
    'Madhesh' => { number: 2, capital: 'Janakpur' },
    'Bagmati' => { number: 3, capital: 'Hetauda' },
    'Gandaki' => { number: 4, capital: 'Pokhara' },
    'Lumbini' => { number: 5, capital: 'Butwal' },
    'Karnali' => { number: 6, capital: 'Birendranagar' },
    'Sudurpashchim' => { number: 7, capital: 'Dhangadhi' }
  }
  
  MAJOR_DISTRICTS = [
    'Kathmandu', 'Lalitpur', 'Bhaktapur',  # Kathmandu Valley
    'Morang', 'Jhapa',                      # Eastern region
    'Chitwan', 'Makwanpur',                 # Central region
    'Kaski',                                # Western region (Pokhara)
    'Rupandehi', 'Nawalparasi',            # Lumbini region
    'Banke', 'Kailali'                      # Far-western region
  ]
  
  # Banking classification regions (used in reporting)
  REGIONS = {
    'Central' => ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Chitwan', 'Makwanpur'],
    'Eastern' => ['Morang', 'Jhapa', 'Sunsari', 'Ilam'],
    'Western' => ['Kaski', 'Syangja', 'Parbat', 'Tanahu'],
    'Mid-Western' => ['Banke', 'Bardiya', 'Dang'],
    'Far-Western' => ['Kailali', 'Kanchanpur', 'Doti']
  }
end
```

### Branch Classification

```ruby
# app/models/branch.rb
class Branch < ApplicationRecord
  CATEGORIES = {
    'Metropolitan' => 'Kathmandu Valley major branches',
    'Urban' => 'District headquarters and major cities',
    'Semi-Urban' => 'Municipal areas outside major cities',
    'Rural' => 'Village-level branches'
  }
  
  validates :category, inclusion: { in: CATEGORIES.keys }
  
  scope :metropolitan, -> { where(district: ['Kathmandu', 'Lalitpur', 'Bhaktapur']) }
  scope :urban, -> { where(category: 'Urban') }
  
  def self.categorize_by_location(district, municipality)
    if ['Kathmandu', 'Lalitpur', 'Bhaktapur'].include?(district)
      'Metropolitan'
    elsif is_district_headquarters?(municipality)
      'Urban'
    elsif municipality.ends_with?('Municipality')
      'Semi-Urban'
    else
      'Rural'
    end
  end
end
```

## Currency and Financial Conventions

### Nepal Rupee (NPR)

```ruby
# app/helpers/currency_helper.rb
module CurrencyHelper
  # NPR uses Indian numbering system
  def format_npr(amount)
    # Format: 12,34,567.89 (not 1,234,567.89)
    whole, decimal = amount.to_f.round(2).to_s.split('.')
    
    # Handle last 3 digits
    last_three = whole[-3..-1] || whole
    rest = whole[0...-3]
    
    # Add commas every 2 digits for rest
    if rest.present?
      formatted_rest = rest.reverse.scan(/.{1,2}/).join(',').reverse
      formatted = "#{formatted_rest},#{last_three}"
    else
      formatted = last_three
    end
    
    decimal.present? ? "NPR #{formatted}.#{decimal}" : "NPR #{formatted}"
  end
  
  # Examples:
  # format_npr(1234567.89)  # => "NPR 12,34,567.89"
  # format_npr(12345.00)    # => "NPR 12,345"
end
```

### Fiscal Year

```ruby
# Nepal fiscal year: Mid-July to Mid-July (Shrawan 1 to Ashadh 31 in Nepali calendar)
class FiscalYear
  def self.current
    today = Date.today
    if today.month >= 7 && today.day >= 15
      "#{today.year}/#{(today.year + 1) % 100}"  # e.g., "2025/26"
    else
      "#{today.year - 1}/#{today.year % 100}"    # e.g., "2024/25"
    end
  end
  
  def self.quarter(date = Date.today)
    fy_start = fiscal_year_start(date)
    months_diff = (date.year * 12 + date.month) - (fy_start.year * 12 + fy_start.month)
    
    case months_diff
    when 0..2   then 'Q1'
    when 3..5   then 'Q2'
    when 6..8   then 'Q3'
    when 9..11  then 'Q4'
    end
  end
  
  def self.fiscal_year_start(date)
    if date.month >= 7 && date.day >= 15
      Date.new(date.year, 7, 15)
    else
      Date.new(date.year - 1, 7, 15)
    end
  end
  
  def self.fiscal_year_end(date)
    fiscal_year_start(date) + 1.year - 1.day
  end
end
```

## Banking Products

### Account Types

```ruby
# app/models/account.rb
class Account < ApplicationRecord
  TYPES = {
    'Savings' => {
      code: 'SA',
      min_balance: 100,
      interest_bearing: true
    },
    'Current' => {
      code: 'CA',
      min_balance: 500,
      interest_bearing: false
    },
    'Fixed Deposit' => {
      code: 'FD',
      min_amount: 10000,
      interest_bearing: true,
      term_based: true
    },
    'Call Deposit' => {
      code: 'CD',
      min_amount: 100000,
      interest_bearing: true
    },
    'Recurring Deposit' => {
      code: 'RD',
      min_amount: 1000,
      interest_bearing: true,
      installment_based: true
    }
  }
  
  validates :account_type, inclusion: { in: TYPES.keys }
end
```

### Loan Categories

```ruby
# app/models/loan.rb
class Loan < ApplicationRecord
  TYPES = {
    'Personal Loan' => { code: 'PL', max_term_months: 60 },
    'Home Loan' => { code: 'HL', max_term_months: 300 },
    'Business Loan' => { code: 'BL', max_term_months: 120 },
    'Agriculture Loan' => { code: 'AG', max_term_months: 60 },
    'Vehicle Loan' => { code: 'VL', max_term_months: 84 },
    'Education Loan' => { code: 'EL', max_term_months: 120 },
    'Working Capital' => { code: 'WC', max_term_months: 12 },
    'Term Loan' => { code: 'TL', max_term_months: 120 }
  }
  
  # NRB loan classification
  RISK_CATEGORIES = {
    'Pass' => { dpd_range: 0..0, provision_rate: 1.0 },
    'Watch' => { dpd_range: 1..90, provision_rate: 5.0 },
    'Substandard' => { dpd_range: 91..180, provision_rate: 25.0 },
    'Doubtful' => { dpd_range: 181..360, provision_rate: 50.0 },
    'Loss' => { dpd_range: 361..Float::INFINITY, provision_rate: 100.0 }
  }
  
  def classify_risk
    RISK_CATEGORIES.each do |category, config|
      return category if config[:dpd_range].include?(days_past_due)
    end
    'Pass'
  end
  
  def required_provision
    category = classify_risk
    rate = RISK_CATEGORIES[category][:provision_rate]
    outstanding_balance * rate / 100
  end
end
```

## Customer Segmentation

```ruby
# app/models/customer.rb
class Customer < ApplicationRecord
  SEGMENTS = {
    'Individual' => {
      subcategories: ['Salaried', 'Self-Employed', 'Student', 'Senior Citizen', 'Women']
    },
    'SME' => {
      subcategories: ['Micro', 'Small', 'Medium'],
      criteria: {
        'Micro' => { max_turnover: 5_000_000 },
        'Small' => { max_turnover: 80_000_000 },
        'Medium' => { max_turnover: 200_000_000 }
      }
    },
    'Corporate' => {
      subcategories: ['Large Corporate', 'Government', 'NGO/INGO']
    }
  }
  
  CATEGORIES = {
    'Premium' => 'High net worth, relationship value > 10M',
    'Priority' => 'Value customers, relationship value 1M-10M',
    'Regular' => 'Standard customers, relationship value < 1M'
  }
  
  def relationship_value
    total_deposits = accounts.sum(:balance)
    total_loans = loans.sum(:outstanding_balance)
    # Simplified calculation
    total_deposits + (total_loans * 0.3) # Loans weighted at 30%
  end
  
  def categorize
    value = relationship_value
    case value
    when 10_000_000..Float::INFINITY then 'Premium'
    when 1_000_000...10_000_000 then 'Priority'
    else 'Regular'
    end
  end
end
```

## NRB Regulatory Metrics

### Key Ratios and Limits

```ruby
# app/services/regulatory_compliance_service.rb
class RegulatoryComplianceService
  NRB_LIMITS = {
    # Capital Adequacy
    minimum_car: 11.0,  # Capital Adequacy Ratio (%)
    
    # Liquidity
    ccd_ratio: 10.0,    # Cash & Cash equivalents to Deposits (%)
    liquid_assets_ratio: 20.0,  # Liquid assets to total deposits (%)
    
    # Asset Quality
    max_npl_ratio: 3.0, # Non-Performing Loan ratio (%)
    
    # Exposure Limits
    single_borrower_limit: 25.0,  # % of core capital
    group_borrower_limit: 35.0,   # % of core capital
    
    # Sector Limits (% of total credit)
    productive_sector_min: 25.0,  # Agriculture, industry, tourism
    deprived_sector_min: 5.0,     # Deprived/disadvantaged sectors
    
    # Credit-Deposit Ratio
    max_cd_ratio: 90.0  # Credits to Deposits ratio (%)
  }
  
  def check_compliance
    {
      car: capital_adequacy_ratio,
      car_compliant: capital_adequacy_ratio >= NRB_LIMITS[:minimum_car],
      
      npl_ratio: npl_ratio,
      npl_compliant: npl_ratio <= NRB_LIMITS[:max_npl_ratio],
      
      cd_ratio: credit_deposit_ratio,
      cd_compliant: credit_deposit_ratio <= NRB_LIMITS[:max_cd_ratio],
      
      liquid_assets_ratio: liquid_assets_ratio,
      liquidity_compliant: liquid_assets_ratio >= NRB_LIMITS[:liquid_assets_ratio],
      
      productive_sector_compliance: productive_sector_compliance,
      deprived_sector_compliance: deprived_sector_compliance
    }
  end
  
  def capital_adequacy_ratio
    # (Tier 1 Capital + Tier 2 Capital) / Risk Weighted Assets * 100
    # Simplified calculation
    total_capital = calculate_total_capital
    risk_weighted_assets = calculate_rwa
    (total_capital / risk_weighted_assets * 100).round(2)
  end
  
  def npl_ratio
    total_loans = Loan.sum(:outstanding_balance)
    npl = Loan.where(risk_category: ['Substandard', 'Doubtful', 'Loss'])
              .sum(:outstanding_balance)
    (npl / total_loans * 100).round(2)
  end
  
  def credit_deposit_ratio
    total_loans = Loan.sum(:outstanding_balance)
    total_deposits = Account.where(account_type: ['Savings', 'Current', 'Fixed Deposit'])
                           .sum(:balance)
    (total_loans / total_deposits * 100).round(2)
  end
  
  def productive_sector_compliance
    total_credit = Loan.sum(:outstanding_balance)
    productive = Loan.where(loan_type: ['Agriculture Loan', 'Business Loan', 'Working Capital'])
                    .sum(:outstanding_balance)
    percentage = (productive / total_credit * 100).round(2)
    
    {
      percentage: percentage,
      required: NRB_LIMITS[:productive_sector_min],
      compliant: percentage >= NRB_LIMITS[:productive_sector_min]
    }
  end
  
  def deprived_sector_compliance
    # Loans to women, disadvantaged communities, rural areas
    total_credit = Loan.sum(:outstanding_balance)
    deprived = Loan.joins(:customer)
                  .where(customers: { category: ['Women', 'Dalit', 'Indigenous'] })
                  .or(Loan.joins(:branch).where(branches: { category: 'Rural' }))
                  .sum('loans.outstanding_balance')
    percentage = (deprived / total_credit * 100).round(2)
    
    {
      percentage: percentage,
      required: NRB_LIMITS[:deprived_sector_min],
      compliant: percentage >= NRB_LIMITS[:deprived_sector_min]
    }
  end
end
```

### CASA Ratio (Key Performance Indicator)

```ruby
# Current Account and Savings Account ratio - measure of low-cost deposits
def casa_ratio
  casa = Account.where(account_type: ['Savings', 'Current']).sum(:balance)
  total_deposits = Account.sum(:balance)
  (casa / total_deposits * 100).round(2)
end

# Target: 60-70% is considered healthy
```

## NRB Reporting Requirements

### Mandatory Reports

```ruby
# app/models/nrb_report.rb
class NrbReport < ApplicationRecord
  REPORT_TYPES = {
    'Daily Liquidity' => {
      frequency: 'daily',
      deadline: 'Next day 10 AM',
      format: 'XML'
    },
    'Weekly Return' => {
      frequency: 'weekly',
      deadline: 'Friday',
      format: 'Excel'
    },
    'Monthly Return' => {
      frequency: 'monthly',
      deadline: '15th of next month',
      format: 'Excel'
    },
    'Quarterly Financial Statement' => {
      frequency: 'quarterly',
      deadline: '30 days after quarter end',
      format: 'PDF + Excel'
    },
    'Annual Report' => {
      frequency: 'annual',
      deadline: '6 months after fiscal year',
      format: 'PDF + Audit Report'
    }
  }
  
  def self.generate_daily_liquidity
    {
      date: Date.today,
      cash_in_hand: calculate_cash_in_hand,
      balance_at_nrb: calculate_nrb_balance,
      balance_at_other_banks: calculate_interbank_balance,
      total_liquid_assets: calculate_liquid_assets,
      total_deposits: Account.sum(:balance),
      ccd_ratio: calculate_ccd_ratio
    }
  end
end
```

## Digital Banking Channels

```ruby
# app/models/transaction.rb
class Transaction < ApplicationRecord
  CHANNELS = {
    'Branch' => { code: 'BR', availability: '24/5' },
    'ATM' => { code: 'ATM', availability: '24/7', limits: { daily: 100_000 } },
    'Mobile Banking' => { code: 'MB', availability: '24/7', limits: { daily: 200_000 } },
    'Internet Banking' => { code: 'IB', availability: '24/7', limits: { daily: 500_000 } },
    'Agent Banking' => { code: 'AB', availability: 'varies', limits: { daily: 50_000 } },
    'POS' => { code: 'POS', availability: '24/7', limits: { daily: 500_000 } }
  }
  
  # Popular payment systems in Nepal
  PAYMENT_SYSTEMS = ['NPS (Nepal Payment System)', 'connectIPS', 'eSewa', 'Khalti', 'IME Pay']
end
```

## Interest Rate Conventions

```ruby
# app/models/interest_rate.rb
class InterestRate < ApplicationRecord
  # NRB sets bank rate, which influences all other rates
  def self.current_bank_rate
    # Bank rate set by NRB (example: 7.5%)
    7.5
  end
  
  # Typical interest rate ranges (as of 2026 - adjust as needed)
  RATE_RANGES = {
    savings: { min: 3.0, max: 7.0 },
    fixed_deposit: { min: 7.0, max: 12.0 },
    personal_loan: { min: 12.0, max: 18.0 },
    home_loan: { min: 10.0, max: 14.0 },
    business_loan: { min: 11.0, max: 16.0 }
  }
  
  # Interest calculation (commonly monthly compounding)
  def calculate_interest(principal, annual_rate, months)
    monthly_rate = annual_rate / 12 / 100
    principal * monthly_rate * months
  end
end
```

## Public Holidays (Banking Days)

```ruby
# app/models/banking_calendar.rb
class BankingCalendar
  # Nepal has unique holidays based on lunar calendar
  PUBLIC_HOLIDAYS = [
    'Dashain (15 days in Sep/Oct)',
    'Tihar (5 days in Oct/Nov)',
    'Constitution Day (20 Sep)',
    'Republic Day (29 May)',
    'Democracy Day (7 Baisakh / ~April 19)',
    'Teej (1 day in Aug/Sep)',
    'Holi (1 day in March)',
    'Buddha Jayanti (1 day in May)',
    'Eid (varies)',
    'Christmas (25 Dec)'
  ]
  
  # Saturday is regular holiday
  def self.working_day?(date)
    return false if date.saturday?
    return false if public_holiday?(date)
    true
  end
  
  def self.banking_days_in_month(year, month)
    days = Date.new(year, month, 1)..Date.new(year, month, -1)
    days.count { |d| working_day?(d) }
  end
end
```

## Data Validation Rules

```ruby
# app/validators/nepal_banking_validator.rb
class NepalBankingValidator < ActiveModel::Validator
  def validate(record)
    case record
    when Account
      validate_account(record)
    when Loan
      validate_loan(record)
    when Customer
      validate_customer(record)
    end
  end
  
  def validate_account(account)
    if account.account_type == 'Fixed Deposit'
      if account.balance < 10_000
        account.errors.add(:balance, 'Fixed Deposit minimum is NPR 10,000')
      end
    end
    
    if account.currency != 'NPR'
      unless account.customer.segment == 'Corporate'
        account.errors.add(:currency, 'Foreign currency accounts only for Corporate')
      end
    end
  end
  
  def validate_loan(loan)
    # Maximum loan-to-value ratios by type
    ltv_limits = {
      'Home Loan' => 70,
      'Vehicle Loan' => 80,
      'Personal Loan' => 50
    }
    
    if loan.collateral_value.present?
      ltv = (loan.principal_amount / loan.collateral_value * 100)
      max_ltv = ltv_limits[loan.loan_type]
      
      if max_ltv && ltv > max_ltv
        loan.errors.add(:principal_amount, "LTV exceeds #{max_ltv}% limit")
      end
    end
  end
end
```

## Sample Data Seeds

```ruby
# db/seeds.rb
# Seed Nepal-specific data

# Provinces and regions
provinces = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']
regions = ['Central', 'Eastern', 'Western', 'Mid-Western', 'Far-Western']

# Create branches in major cities
major_cities = [
  { name: 'Kathmandu Main', district: 'Kathmandu', region: 'Central', province: 'Bagmati' },
  { name: 'Lalitpur Branch', district: 'Lalitpur', region: 'Central', province: 'Bagmati' },
  { name: 'Pokhara Branch', district: 'Kaski', region: 'Western', province: 'Gandaki' },
  { name: 'Biratnagar Branch', district: 'Morang', region: 'Eastern', province: 'Koshi' },
  { name: 'Butwal Branch', district: 'Rupandehi', region: 'Western', province: 'Lumbini' },
]

major_cities.each do |city_data|
  Branch.create!(
    code: "BR#{Branch.count + 1}",
    name: city_data[:name],
    district: city_data[:district],
    region: city_data[:region],
    province: city_data[:province],
    category: 'Urban',
    active: true
  )
end

puts "Created #{Branch.count} branches"
```

## Time Zone

```ruby
# Nepal uses +05:45 UTC (unique 45-minute offset)
# config/application.rb
config.time_zone = 'Kathmandu'
config.active_record.default_timezone = :local

# Always display Nepal Time (NPT) in UI
# lib/nepal_time.rb
class NepalTime
  def self.now
    Time.current.in_time_zone('Kathmandu')
  end
  
  def self.format(time)
    time.in_time_zone('Kathmandu').strftime('%d %b %Y, %I:%M %p NPT')
  end
end
```

This skill provides Nepal-specific banking domain knowledge. Combine with [rails-nextjs-postgres-stack](../rails-nextjs-postgres-stack/SKILL.md) for full implementation.
