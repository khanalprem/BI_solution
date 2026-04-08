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

  def financial_summary
    scope = filtered_scope
    cr = scope.where(part_tran_type: 'CR')
    dr = scope.where(part_tran_type: 'DR')

    credit_amt  = cr.sum(:tran_amt).to_f
    debit_amt   = dr.sum(:tran_amt).to_f
    credit_cnt  = cr.sum(:tran_count).to_i
    debit_cnt   = dr.sum(:tran_count).to_i
    total_amt   = credit_amt + debit_amt
    net_flow    = credit_amt - debit_amt

    # Monthly trend for P&L chart
    monthly = scope.group("TO_CHAR(tran_date, 'YYYY-MM')")
                   .select("TO_CHAR(tran_date, 'YYYY-MM') as month,
                            SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) as credit,
                            SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) as debit,
                            SUM(tran_amt) as total")
                   .order("TO_CHAR(tran_date, 'YYYY-MM')")
                   .map { |r| { month: r.month, credit: r.credit.to_f, debit: r.debit.to_f, net: (r.credit.to_f - r.debit.to_f) } }

    # GL breakdown (top 10)
    by_gl = scope.where.not(gl_sub_head_code: [nil, ''])
                 .group(:gl_sub_head_code, :part_tran_type)
                 .select('gl_sub_head_code, part_tran_type, SUM(tran_amt) as amount, SUM(tran_count) as txn_count')
                 .order('SUM(tran_amt) DESC')
                 .limit(20)
                 .map { |r| { gl_code: r.gl_sub_head_code, type: r.part_tran_type, amount: r.amount.to_f, count: r.txn_count.to_i } }

    {
      credit_amount: credit_amt,
      debit_amount:  debit_amt,
      net_flow:      net_flow,
      total_amount:  total_amt,
      credit_count:  credit_cnt,
      debit_count:   debit_cnt,
      credit_ratio:  total_amt > 0 ? (credit_amt / total_amt * 100).round(2) : 0,
      avg_credit:    credit_cnt > 0 ? (credit_amt / credit_cnt).round(2) : 0,
      avg_debit:     debit_cnt  > 0 ? (debit_amt  / debit_cnt ).round(2) : 0,
      monthly_trend: monthly,
      by_gl:         by_gl
    }
  end

  def digital_channels
    scope = filtered_scope

    # Channel summary
    channels = scope.group(:tran_source)
                    .select('tran_source as channel,
                             SUM(tran_amt) as total_amount,
                             SUM(tran_count) as transaction_count,
                             COUNT(DISTINCT acct_num) as unique_accounts,
                             SUM(CASE WHEN part_tran_type=\'CR\' THEN tran_amt ELSE 0 END) as credit_amount,
                             SUM(CASE WHEN part_tran_type=\'DR\' THEN tran_amt ELSE 0 END) as debit_amount')
                    .order('SUM(tran_amt) DESC')
                    .map do |r|
                      {
                        channel: r.channel || 'Branch',
                        total_amount: r.total_amount.to_f,
                        transaction_count: r.transaction_count.to_i,
                        unique_accounts: r.unique_accounts.to_i,
                        credit_amount: r.credit_amount.to_f,
                        debit_amount: r.debit_amount.to_f
                      }
                    end

    # Daily trend per channel (last 30 days of data)
    trend = scope.where.not(tran_source: nil)
                 .group(:tran_date, :tran_source)
                 .select('tran_date, tran_source as channel, SUM(tran_amt) as amount, SUM(tran_count) as count')
                 .order(:tran_date)
                 .limit(200)
                 .map { |r| { date: r.tran_date, channel: r.channel, amount: r.amount.to_f, count: r.count.to_i } }

    total_digital = channels.reject { |c| c[:channel] == 'Branch' }.sum { |c| c[:total_amount] }
    total_branch  = channels.find { |c| c[:channel] == 'Branch' }&.dig(:total_amount) || 0
    total_all     = channels.sum { |c| c[:total_amount] }

    {
      channels: channels,
      trend: trend,
      digital_amount: total_digital,
      branch_amount: total_branch,
      digital_ratio: total_all > 0 ? (total_digital / total_all * 100).round(2) : 0,
      total_digital_accounts: channels.reject { |c| c[:channel] == 'Branch' }.sum { |c| c[:unique_accounts] }
    }
  end

  def risk_summary
    scope = filtered_scope
    total  = scope.sum(:tran_amt).to_f
    cr_amt = scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f
    dr_amt = scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f

    # High-value transactions (top 1%)
    high_val_threshold = scope.order(tran_amt: :desc)
                               .offset((scope.count * 0.01).to_i)
                               .limit(1).pick(:tran_amt).to_f rescue 0

    high_value_count = scope.where('tran_amt >= ?', high_val_threshold).count

    # Concentration by branch (Herfindahl index proxy)
    branch_totals = scope.group(:gam_branch)
                         .sum(:tran_amt)
                         .values.map(&:to_f)
                         .sort.reverse

    top3_share = branch_totals.first(3).sum / [total, 1].max * 100

    # By GL code risk
    by_gl = scope.where.not(gl_sub_head_code: [nil, ''])
                 .group(:gl_sub_head_code)
                 .select('gl_sub_head_code, SUM(tran_amt) as amount, SUM(tran_count) as txn_count, COUNT(DISTINCT acct_num) as accounts')
                 .order('SUM(tran_amt) DESC')
                 .limit(15)
                 .map { |r| { gl_code: r.gl_sub_head_code, amount: r.amount.to_f, count: r.txn_count.to_i, accounts: r.accounts.to_i } }

    # Province risk distribution
    by_province = scope.group(:gam_province)
                       .select('gam_province as province, SUM(tran_amt) as amount, COUNT(DISTINCT acct_num) as accounts,
                                SUM(CASE WHEN part_tran_type=\'DR\' THEN tran_amt ELSE 0 END) as debit_amount')
                       .order('SUM(tran_amt) DESC')
                       .map { |r| { province: r.province, amount: r.amount.to_f, accounts: r.accounts.to_i, debit_amount: r.debit_amount.to_f } }

    # Monthly volatility (std dev proxy)
    monthly_amounts = scope.group("DATE_TRUNC('month', tran_date)")
                            .sum(:tran_amt)
                            .values.map(&:to_f)
    avg_monthly = monthly_amounts.empty? ? 0 : monthly_amounts.sum / monthly_amounts.size
    variance    = monthly_amounts.empty? ? 0 : monthly_amounts.map { |v| (v - avg_monthly)**2 }.sum / monthly_amounts.size
    volatility  = Math.sqrt(variance).round(2) rescue 0

    {
      total_amount: total,
      credit_amount: cr_amt,
      debit_amount: dr_amt,
      net_flow: cr_amt - dr_amt,
      high_value_count: high_value_count,
      high_value_threshold: high_val_threshold,
      top3_branch_share: top3_share.round(2),
      monthly_volatility: volatility,
      avg_monthly_volume: avg_monthly.round(2),
      by_gl: by_gl,
      by_province: by_province
    }
  end

  def kpi_summary
    scope = filtered_scope
    total  = scope.sum(:tran_amt).to_f
    count  = scope.sum(:tran_count).to_i
    cr     = scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f
    dr     = scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f
    avg    = count > 0 ? (total / count).round(2) : 0
    accounts   = scope.distinct.count(:acct_num)
    customers  = scope.distinct.count(:cif_id)
    branches   = scope.distinct.count(:gam_branch)
    provinces  = scope.distinct.count(:gam_province)

    cr_ratio = total > 0 ? (cr / total * 100).round(2) : 0
    net_flow = cr - dr
    txn_per_account = accounts > 0 ? (count.to_f / accounts).round(2) : 0
    vol_per_account = accounts > 0 ? (total / accounts).round(2) : 0

    # Quarter-over-quarter trend
    by_quarter = scope.group("TO_CHAR(tran_date, 'YYYY-\"Q\"Q')")
                      .select("TO_CHAR(tran_date, 'YYYY-\"Q\"Q') as period,
                               SUM(tran_amt) as amount, SUM(tran_count) as txn_count,
                               COUNT(DISTINCT acct_num) as accounts")
                      .order("TO_CHAR(tran_date, 'YYYY-\"Q\"Q')")
                      .map { |r| { period: r.period, amount: r.amount.to_f, count: r.txn_count.to_i, accounts: r.accounts.to_i } }

    # Top products
    by_product = scope.where.not(product: [nil, ''])
                      .group(:product)
                      .select('product, SUM(tran_amt) as amount, SUM(tran_count) as txn_count')
                      .order('SUM(tran_amt) DESC')
                      .limit(10)
                      .map { |r| { product: r.product, amount: r.amount.to_f, count: r.txn_count.to_i } }

    # Top services
    by_service = scope.where.not(service: [nil, ''])
                      .group(:service)
                      .select('service, SUM(tran_amt) as amount, SUM(tran_count) as txn_count')
                      .order('SUM(tran_amt) DESC')
                      .limit(10)
                      .map { |r| { service: r.service, amount: r.amount.to_f, count: r.txn_count.to_i } }

    {
      total_amount: total,
      total_count: count,
      credit_amount: cr,
      debit_amount: dr,
      net_flow: net_flow,
      avg_transaction: avg,
      credit_ratio: cr_ratio,
      unique_accounts: accounts,
      unique_customers: customers,
      unique_branches: branches,
      unique_provinces: provinces,
      txn_per_account: txn_per_account,
      vol_per_account: vol_per_account,
      by_quarter: by_quarter,
      by_product: by_product,
      by_service: by_service
    }
  end

  def employer_summary
    scope = filtered_scope

    # Group by entry_user as proxy for employer/payroll grouping
    by_user = scope.where.not(entry_user: [nil, ''])
                   .group(:entry_user)
                   .select('entry_user,
                            SUM(tran_amt) as total_amount,
                            SUM(tran_count) as txn_count,
                            COUNT(DISTINCT acct_num) as accounts,
                            SUM(CASE WHEN part_tran_type=\'CR\' THEN tran_amt ELSE 0 END) as credit_amount')
                   .order('SUM(tran_amt) DESC')
                   .limit(20)
                   .map { |r| { user: r.entry_user, amount: r.total_amount.to_f, count: r.txn_count.to_i, accounts: r.accounts.to_i, credit: r.credit_amount.to_f } }

    # By branch with user activity
    by_branch = scope.where.not(entry_user: [nil, ''])
                     .group(:gam_branch, :gam_province)
                     .select('gam_branch as branch, gam_province as province,
                              COUNT(DISTINCT entry_user_id) as user_count,
                              SUM(tran_amt) as total_amount,
                              SUM(tran_count) as txn_count')
                     .order('COUNT(DISTINCT entry_user_id) DESC')
                     .limit(20)
                     .map { |r| { branch: r.branch, province: r.province, users: r.user_count.to_i, amount: r.total_amount.to_f, count: r.txn_count.to_i } }

    total_users    = scope.where.not(entry_user_id: nil).distinct.count(:entry_user_id)
    total_vfd      = scope.where.not(vfd_user_id: nil).distinct.count(:vfd_user_id)
    total_branches = scope.distinct.count(:gam_branch)

    {
      total_entry_users: total_users,
      total_vfd_users: total_vfd,
      total_branches: total_branches,
      total_amount: scope.sum(:tran_amt).to_f,
      total_count: scope.sum(:tran_count).to_i,
      by_user: by_user,
      by_branch: by_branch
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

    names_by_cif = AccountMasterLookup.customer_names_for(results.map(&:cif_id))

    results.map do |record|
      total_amount = record.total_amount.to_f
      transaction_count = record.transaction_count.to_i
      accounts = record.accounts.to_i
      avg_transaction = transaction_count.positive? ? (total_amount / transaction_count) : 0

      {
        cif_id: record.cif_id,
        name: names_by_cif[record.cif_id] || record.customer_name,
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
    total_amount = scope.sum(:tran_amt).to_f
    total_count  = scope.sum(:tran_count).to_i

    cr_scope = scope.where(part_tran_type: 'CR')
    dr_scope = scope.where(part_tran_type: 'DR')
    credit_amount = cr_scope.sum(:tran_amt).to_f
    debit_amount  = dr_scope.sum(:tran_amt).to_f
    credit_count  = cr_scope.sum(:tran_count).to_i
    debit_count   = dr_scope.sum(:tran_count).to_i

    {
      total_amount:        total_amount,
      total_count:         total_count,
      unique_accounts:     scope.distinct.count(:acct_num),
      unique_customers:    scope.distinct.count(:cif_id),
      avg_transaction_size: scope.average(:tran_amt)&.to_f || 0,
      credit_amount:       credit_amount,
      debit_amount:        debit_amount,
      net_flow:            credit_amount - debit_amount,
      credit_count:        credit_count,
      debit_count:         debit_count,
      credit_ratio:        total_amount > 0 ? (credit_amount / total_amount * 100).round(2) : 0
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
      vfd_user: @filters[:vfd_user]
    }.each do |column, value|
      next if value.blank?

      normalized_value =
        if value.is_a?(Array)
          value.filter_map do |item|
            text = item.to_s.strip
            text.presence
          end
        else
          value
        end

      next if normalized_value.blank?

      scope = scope.where(column => normalized_value)
    end

    scope = apply_partial_text_filter(scope, :acct_num, @filters[:acct_num])
    scope = apply_partial_text_filter(scope, :cif_id, @filters[:cif_id])

    if @filters[:scheme_type].present?
      account_scope = AccountMasterLookup.account_number_scope(@filters)
      scope = scope.where(acct_num: account_scope) if account_scope.present?
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

  def apply_partial_text_filter(scope, column, value)
    term = normalize_text(value)
    return scope if term.blank?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(term)}%"
    scope.where("#{scope.table_name}.#{column}::text ILIKE ?", pattern)
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
