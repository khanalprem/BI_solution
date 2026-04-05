# Dynamic Dashboard Service
# Aggregates data from tran_summary with flexible filtering
class DynamicDashboardService
  def initialize(start_date:, end_date:, filters: {})
    @start_date = start_date
    @end_date = end_date
    @filters = filters
  end
  
  def execute
    {
      summary: calculate_summary,
      by_branch: branch_breakdown,
      by_province: province_breakdown,
      by_channel: channel_breakdown,
      trend: daily_trend
    }
  end

  def top_customers(limit: 20)
    capped_limit = [[limit.to_i, 1].max, 200].min

    results = filtered_scope
              .where.not(cif_id: [nil, ''])
              .group(:cif_id)
              .select(
                "cif_id",
                "COALESCE(MAX(NULLIF(acct_name, '')), 'Customer') as customer_name",
                "SUM(tran_amt) as total_amount",
                "SUM(tran_count) as transaction_count",
                "COUNT(DISTINCT acct_num) as accounts"
              )
              .order('SUM(tran_amt) DESC')
              .limit(capped_limit)

    results.map do |record|
      total_amount = record.total_amount.to_f
      transaction_count = record.transaction_count.to_i
      accounts = record.accounts.to_i
      avg_transaction = transaction_count.positive? ? (total_amount / transaction_count) : 0

      {
        cif_id: record.cif_id,
        name: record.customer_name,
        segment: infer_segment(total_amount),
        amount: total_amount,
        accounts: accounts,
        risk: infer_risk_tier(avg_transaction),
        transaction_count: transaction_count
      }
    end
  end

  def recent_transactions(limit: 50)
    capped_limit = [[limit.to_i, 1].max, 200].min

    records = filtered_scope
              .select(
                :tran_date,
                :acct_num,
                :acid,
                :part_tran_type,
                :tran_amt,
                :signed_tranamt,
                :eod_balance,
                :merchant,
                :service,
                :product,
                :tran_source,
                :gl_sub_head_code,
                :row_id
              )
              .order(tran_date: :desc, row_id: :desc)
              .limit(capped_limit)

    records.map do |record|
      part_type = record.part_tran_type.to_s.strip.upcase
      tx_type = part_type == 'CR' ? 'income' : 'expense'
      signed_amount = if record.signed_tranamt.nil?
                        part_type == 'CR' ? record.tran_amt.to_f : -record.tran_amt.to_f
                      else
                        record.signed_tranamt.to_f
                      end

      {
        date: record.tran_date,
        description: build_transaction_description(record),
        category: build_transaction_category(record),
        type: tx_type,
        part_tran_type: part_type,
        amount: signed_amount,
        balance_after: record.eod_balance.to_f,
        account_number: record.acct_num,
        acid: record.acid
      }
    end
  end

  private
  
  def calculate_summary
    filters = base_filters
    
    {
      total_amount: TranSummary.total_amount(filters),
      total_count: TranSummary.total_count(filters),
      unique_accounts: TranSummary.unique_accounts(filters),
      unique_customers: TranSummary.unique_customers(filters),
      avg_transaction_size: TranSummary.average_transaction(filters)
    }
  end
  
  def branch_breakdown
    scope = filtered_scope
    
    results = scope.group(:gam_branch, :gam_province)
                   .select(
                     'gam_branch as branch_code',
                     'gam_province as province',
                     'SUM(tran_amt) as total_amount',
                     'SUM(tran_count) as transaction_count',
                     'COUNT(DISTINCT acct_num) as unique_accounts',
                     'AVG(tran_amt) as avg_transaction'
                   )
                   .order('SUM(tran_amt) DESC')
                   .limit(100)
    
    results.map do |record|
      {
        branch_code: record.branch_code,
        province: record.province,
        total_amount: record.total_amount.to_f,
        transaction_count: record.transaction_count.to_i,
        unique_accounts: record.unique_accounts.to_i,
        avg_transaction: record.avg_transaction.to_f
      }
    end
  end
  
  def province_breakdown
    scope = filtered_scope
    
    results = scope.group(:gam_province)
                   .select(
                     'gam_province as province',
                     'SUM(tran_amt) as total_amount',
                     'SUM(tran_count) as transaction_count',
                     'COUNT(DISTINCT gam_branch) as branch_count',
                     'COUNT(DISTINCT acct_num) as unique_accounts'
                   )
                   .order('SUM(tran_amt) DESC')
    
    results.map do |r|
      total_amount = r.total_amount.to_f
      branch_count = r.branch_count.to_i

      {
        province: r.province,
        amount: total_amount,
        count: r.transaction_count.to_i,
        branches: branch_count,
        total_amount: total_amount,
        transaction_count: r.transaction_count.to_i,
        branch_count: branch_count,
        unique_accounts: r.unique_accounts.to_i,
        avg_per_branch: branch_count.positive? ? (total_amount / branch_count) : 0
      }
    end
  end
  
  def channel_breakdown
    scope = filtered_scope
    
    results = scope.group(:tran_source)
                   .select(
                     'tran_source as channel',
                     'SUM(tran_amt) as amount',
                     'SUM(tran_count) as count'
                   )
                   .order('SUM(tran_amt) DESC')
    
    results.map do |r|
      {
        channel: r.channel,
        amount: r.amount.to_f,
        count: r.count.to_i,
        total_amount: r.amount.to_f,
        transaction_count: r.count.to_i
      }
    end
  end
  
  def daily_trend
    scope = filtered_scope
    
    results = scope.group(:tran_date)
                   .select(
                     'tran_date',
                     'SUM(tran_amt) as amount',
                     'SUM(tran_count) as count'
                   )
                   .order(:tran_date)
    
    results.map do |r|
      {
        date: r.tran_date,
        amount: r.amount.to_f,
        count: r.count.to_i
      }
    end
  end
  
  def apply_filters(scope)
    {
      gam_branch: @filters[:branch],
      gam_province: @filters[:province],
      gam_cluster: @filters[:cluster],
      gam_solid: @filters[:solid],
      tran_type: @filters[:tran_type],
      part_tran_type: @filters[:part_tran_type],
      tran_source: @filters[:tran_source],
      product: @filters[:product],
      service: @filters[:service],
      merchant: @filters[:merchant],
      gl_sub_head_code: @filters[:gl_sub_head_code],
      entry_user: @filters[:entry_user],
      vfd_user: @filters[:vfd_user],
      acct_num: @filters[:acct_num],
      cif_id: @filters[:cif_id]
    }.each do |column, value|
      scope = scope.where(column => value) if value.present?
    end

    scope = scope.where('tran_amt >= ?', @filters[:min_amount]) unless @filters[:min_amount].nil?
    scope = scope.where('tran_amt <= ?', @filters[:max_amount]) unless @filters[:max_amount].nil?
    
    scope
  end

  def filtered_scope
    scope = TranSummary.by_date_range(@start_date, @end_date)
    apply_filters(scope)
  end
  
  def base_filters
    {
      start_date: @start_date,
      end_date: @end_date
    }.merge(@filters)
  end

  def infer_segment(total_amount)
    case total_amount
    when 1_000_000_000..Float::INFINITY then 'Private Banking'
    when 200_000_000...1_000_000_000 then 'Affluent'
    when 50_000_000...200_000_000 then 'SME'
    else 'Mass Retail'
    end
  end

  def infer_risk_tier(avg_transaction)
    case avg_transaction
    when 5_000_000..Float::INFINITY then 3
    when 1_000_000...5_000_000 then 2
    else 1
    end
  end

  def normalize_text(value)
    text = value.to_s.strip
    return nil if text.blank?
    return nil if text.casecmp('null').zero?

    text
  end

  def build_transaction_category(record)
    normalize_text(record.service) ||
      normalize_text(record.product) ||
      normalize_text(record.tran_source) ||
      normalize_text(record.gl_sub_head_code) ||
      'General'
  end

  def build_transaction_description(record)
    merchant = normalize_text(record.merchant)
    category = build_transaction_category(record)
    account = normalize_text(record.acct_num)

    if merchant
      "#{merchant} · #{category}"
    elsif account
      "#{category} · Acct #{account}"
    else
      category
    end
  end
end
