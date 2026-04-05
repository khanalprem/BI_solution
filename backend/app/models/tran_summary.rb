# TranSummary model for existing tran_summary table
# DO NOT create migration - table already exists in your database
class TranSummary < ApplicationRecord
  self.table_name = 'tran_summary'
  self.primary_key = nil  # Fact table without single primary key
  
  # Scopes for common filters
  scope :by_date_range, ->(start_date, end_date) { 
    where(tran_date: start_date..end_date) 
  }
  
  scope :by_branch, ->(branch_code) { 
    where(gam_branch: branch_code) 
  }
  
  scope :by_province, ->(province) { 
    where(gam_province: province) 
  }
  
  scope :by_account, ->(acct_num) { 
    where(acct_num: acct_num) 
  }
  
  scope :by_customer, ->(cif_id) { 
    where(cif_id: cif_id) 
  }
  
  scope :by_tran_type, ->(type) { 
    where(tran_type: type) 
  }
  
  scope :by_channel, ->(channel) { 
    where(tran_source: channel) 
  }
  
  scope :current_month, -> { 
    where('month_startdate <= ? AND month_enddate >= ?', Date.today, Date.today) 
  }
  
  scope :current_year, -> { 
    where(year: Date.today.year) 
  }
  
  # Aggregation methods
  def self.total_amount(filters = {})
    apply_filters(filters).sum(:tran_amt) || 0
  end
  
  def self.total_count(filters = {})
    apply_filters(filters).sum(:tran_count) || 0
  end
  
  def self.unique_accounts(filters = {})
    apply_filters(filters).distinct.count(:acct_num)
  end
  
  def self.unique_customers(filters = {})
    apply_filters(filters).distinct.count(:cif_id)
  end
  
  def self.average_transaction(filters = {})
    apply_filters(filters).average(:tran_amt)&.to_f || 0
  end
  
  # Breakdown by province
  def self.by_province_summary(start_date, end_date)
    where(tran_date: start_date..end_date)
      .group(:gam_province)
      .select(
        'gam_province',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as total_count',
        'COUNT(DISTINCT gam_branch) as branch_count',
        'COUNT(DISTINCT acct_num) as account_count'
      )
  end
  
  # Breakdown by branch
  def self.by_branch_summary(start_date, end_date, province: nil)
    scope = where(tran_date: start_date..end_date)
    scope = scope.where(gam_province: province) if province
    
    scope.group(:gam_branch, :gam_province)
         .select(
           'gam_branch',
           'gam_province',
           'SUM(tran_amt) as total_amount',
           'SUM(tran_count) as total_count',
           'COUNT(DISTINCT acct_num) as account_count',
           'COUNT(DISTINCT acct_num) as unique_accounts',
           'AVG(tran_amt) as avg_transaction'
         )
         .order('SUM(tran_amt) DESC')
  end
  
  # Breakdown by channel
  def self.by_channel_summary(start_date, end_date)
    where(tran_date: start_date..end_date)
      .group(:tran_source)
      .select(
        'tran_source as channel',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as total_count'
      )
      .order('SUM(tran_amt) DESC')
  end
  
  # Daily trend
  def self.daily_trend(start_date, end_date)
    where(tran_date: start_date..end_date)
      .group(:tran_date)
      .select(
        'tran_date',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as total_count'
      )
      .order(:tran_date)
  end
  
  private
  
  def self.apply_filters(filters)
    scope = all
    scope = scope.where(tran_date: filters[:start_date]..filters[:end_date]) if filters[:start_date] && filters[:end_date]

    {
      gam_branch: filters[:branch],
      gam_province: filters[:province],
      gam_cluster: filters[:cluster],
      gam_solid: filters[:solid],
      tran_type: filters[:tran_type],
      part_tran_type: filters[:part_tran_type],
      tran_source: (filters[:tran_source] || filters[:channel]),
      product: filters[:product],
      service: filters[:service],
      merchant: filters[:merchant],
      gl_sub_head_code: filters[:gl_sub_head_code],
      entry_user: filters[:entry_user],
      vfd_user: filters[:vfd_user],
      acct_num: filters[:acct_num],
      cif_id: filters[:cif_id]
    }.each do |column, value|
      scope = scope.where(column => value) if value.present?
    end

    scope = scope.where('tran_amt >= ?', filters[:min_amount]) unless filters[:min_amount].nil?
    scope = scope.where('tran_amt <= ?', filters[:max_amount]) unless filters[:max_amount].nil?

    scope
  end
end
