class DynamicDashboardService
  VALID_SECTIONS = %i[summary by_branch by_province by_channel trend].freeze

  def initialize(start_date:, end_date:, filters: {})
    @start_date = start_date
    @end_date = end_date
    @filters = filters
  end

  # Pass `only:` to run a subset of aggregations instead of all five.
  #   service.execute(only: [:summary, :by_branch])
  def execute(only: nil)
    sections = if only
                 Array(only).map(&:to_sym) & VALID_SECTIONS
               else
                 VALID_SECTIONS
               end

    sections.each_with_object({}) do |section, hash|
      hash[section] = case section
                      when :summary     then calculate_summary
                      when :by_branch   then branch_breakdown
                      when :by_province then province_breakdown
                      when :by_channel  then channel_breakdown
                      when :trend       then daily_trend
                      end
    end
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
        segment: SegmentClassifier.segment_for(total_amount),
        amount: total_amount,
        accounts: accounts,
        risk: SegmentClassifier.risk_tier_for(avg_transaction),
        transaction_count: transaction_count
      }
    end
  end

  def recent_transactions(limit: 50)
    capped_limit = [[limit.to_i, 1].max, 200].min

    records = filtered_scope
              .select(
                :tran_date, :acct_num, :acid, :part_tran_type,
                :tran_amt, :signed_tranamt, :eod_balance,
                :merchant, :service, :product, :tran_source,
                :gl_sub_head_code, :row_id
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
    scope = filtered_scope
    {
      total_amount: scope.sum(:tran_amt) || 0,
      total_count: scope.sum(:tran_count) || 0,
      unique_accounts: scope.distinct.count(:acct_num),
      unique_customers: scope.distinct.count(:cif_id),
      avg_transaction_size: scope.average(:tran_amt)&.to_f || 0
    }
  end

  def branch_breakdown
    filtered_scope
      .group(:gam_branch, :gam_province)
      .select(
        'gam_branch as branch_code',
        'gam_province as province',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as transaction_count',
        'COUNT(DISTINCT acct_num) as unique_accounts',
        'CASE WHEN SUM(tran_count) > 0 THEN SUM(tran_amt) / SUM(tran_count) ELSE 0 END as avg_transaction'
      )
      .order('SUM(tran_amt) DESC')
      .limit(100)
      .map do |r|
        {
          branch_code: r.branch_code,
          province: r.province,
          total_amount: r.total_amount.to_f,
          transaction_count: r.transaction_count.to_i,
          unique_accounts: r.unique_accounts.to_i,
          avg_transaction: r.avg_transaction.to_f
        }
      end
  end

  def province_breakdown
    filtered_scope
      .group(:gam_province)
      .select(
        'gam_province as province',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as transaction_count',
        'COUNT(DISTINCT gam_branch) as branch_count',
        'COUNT(DISTINCT acct_num) as unique_accounts'
      )
      .order('SUM(tran_amt) DESC')
      .map do |r|
        total_amount = r.total_amount.to_f
        branch_count = r.branch_count.to_i
        {
          province: r.province,
          total_amount: total_amount,
          transaction_count: r.transaction_count.to_i,
          branch_count: branch_count,
          unique_accounts: r.unique_accounts.to_i,
          avg_per_branch: branch_count.positive? ? (total_amount / branch_count) : 0
        }
      end
  end

  def channel_breakdown
    filtered_scope
      .group(:tran_source)
      .select(
        'tran_source as channel',
        'SUM(tran_amt) as total_amount',
        'SUM(tran_count) as transaction_count'
      )
      .order('SUM(tran_amt) DESC')
      .map do |r|
        {
          channel: r.channel,
          total_amount: r.total_amount.to_f,
          transaction_count: r.transaction_count.to_i
        }
      end
  end

  def daily_trend
    filtered_scope
      .group(:tran_date)
      .select(
        'tran_date',
        'SUM(tran_amt) as amount',
        'SUM(tran_count) as count'
      )
      .order(:tran_date)
      .map do |r|
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
