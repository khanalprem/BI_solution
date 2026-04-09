module Api
  module V1
    class DashboardsController < BaseController
      def executive
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('executive') do
          scope = TranSummary.apply_filters(filters)

          summary = build_summary(scope)
          by_branch = scope.group(:gam_branch, :gam_province)
                           .select('gam_branch AS branch_code, gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT acct_num) AS unique_accounts, AVG(tran_amt) AS avg_transaction')
                           .order('SUM(tran_amt) DESC')
                           .limit(20)
                           .map { |r| row_to_h(r, :branch_code, :province, :total_amount, :transaction_count, :unique_accounts, :avg_transaction) }

          by_province = scope.group(:gam_province)
                             .select('gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT gam_branch) AS branch_count, COUNT(DISTINCT acct_num) AS unique_accounts')
                             .order('SUM(tran_amt) DESC')
                             .map { |r| row_to_h(r, :province, :total_amount, :transaction_count, :branch_count, :unique_accounts).merge(avg_per_branch: safe_divide(r.total_amount, r.branch_count)) }

          by_channel = scope.where.not(tran_source: nil)
                            .group(:tran_source)
                            .select('tran_source AS channel, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count')
                            .order('SUM(tran_amt) DESC')
                            .map { |r| row_to_h(r, :channel, :total_amount, :transaction_count) }

          trend = scope.group(:tran_date)
                       .select('tran_date AS date, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                       .order(:tran_date)
                       .map { |r| row_to_h(r, :date, :amount, :count) }

          { summary: summary, by_branch: by_branch, by_province: by_province, by_channel: by_channel, trend: trend }
        end

        render json: data
      end

      def branch_performance
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('branch_performance') do
          scope = TranSummary.apply_filters(filters)

          branches = scope.group(:gam_branch, :gam_province)
                          .select('gam_branch AS branch_code, gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT acct_num) AS unique_accounts, AVG(tran_amt) AS avg_transaction')
                          .order('SUM(tran_amt) DESC')
                          .map { |r| row_to_h(r, :branch_code, :province, :total_amount, :transaction_count, :unique_accounts, :avg_transaction) }

          provinces = scope.group(:gam_province)
                           .select('gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT gam_branch) AS branch_count, COUNT(DISTINCT acct_num) AS unique_accounts')
                           .order('SUM(tran_amt) DESC')
                           .map { |r| row_to_h(r, :province, :total_amount, :transaction_count, :branch_count, :unique_accounts).merge(avg_per_branch: safe_divide(r.total_amount, r.branch_count)) }

          {
            branches: branches,
            provinces: provinces,
            total_amount: scope.sum(:tran_amt).to_f,
            total_count: scope.sum(:tran_count).to_i,
            unique_accounts: scope.distinct.count(:acct_num),
            unique_customers: scope.distinct.count(:cif_id)
          }
        end

        render json: data
      end

      def province_summary
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('province_summary') do
          TranSummary.apply_filters(filters)
                     .group(:gam_province)
                     .select('gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT gam_branch) AS branch_count, COUNT(DISTINCT acct_num) AS unique_accounts')
                     .order('SUM(tran_amt) DESC')
                     .map { |r| row_to_h(r, :province, :total_amount, :transaction_count, :branch_count, :unique_accounts).merge(avg_per_branch: safe_divide(r.total_amount, r.branch_count)) }
        end

        render json: data
      end

      def channel_breakdown
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('channel_breakdown') do
          TranSummary.apply_filters(filters)
                     .group(:tran_source)
                     .select('tran_source AS channel, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count')
                     .order('SUM(tran_amt) DESC')
                     .map { |r| row_to_h(r, :channel, :total_amount, :transaction_count) }
        end

        render json: data
      end

      def daily_trend
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('daily_trend') do
          TranSummary.apply_filters(filters)
                     .group(:tran_date)
                     .select('tran_date AS date, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                     .order(:tran_date)
                     .map { |r| row_to_h(r, :date, :amount, :count) }
        end

        render json: data
      end

      def customers_top
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)
        limit = [[params[:limit].to_i, 1].max, 100].min
        limit = 20 if limit == 0

        data = cached("customers_top_#{limit}") do
          rows = TranSummary.apply_filters(filters)
                            .group(:cif_id, :acct_name)
                            .select('cif_id, acct_name AS name, SUM(tran_amt) AS amount, COUNT(DISTINCT acct_num) AS accounts, SUM(tran_count) AS transaction_count')
                            .order('SUM(tran_amt) DESC')
                            .limit(limit)

          rows.map do |r|
            amt = r.amount.to_f
            avg = r.transaction_count.to_i > 0 ? amt / r.transaction_count.to_i : 0
            {
              cif_id: r.cif_id,
              name: r.name.presence || 'Unknown',
              segment: SegmentClassifier.segment_for(amt),
              amount: amt,
              accounts: r.accounts.to_i,
              risk: SegmentClassifier.risk_tier_for(avg),
              transaction_count: r.transaction_count.to_i
            }
          end
        end

        render json: data
      end

      def customer_profile
        cif_id = param_value(:cif_id, :cifId).to_s.strip
        return render json: { error: 'cif_id is required' }, status: :bad_request if cif_id.blank?

        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date, cif_id: cif_id)

        data = cached("customer_profile_#{cif_id}") do
          scope = TranSummary.apply_filters(filters)
          summary = build_summary(scope)
          customer_name = AccountMasterLookup.customer_name_for(cif_id) || scope.where.not(acct_name: [nil, '']).pick(:acct_name) || 'Unknown'
          accounts = AccountMasterLookup.customer_accounts(cif_id: cif_id)
          amt = summary[:total_amount].to_f
          avg = summary[:total_count].to_i > 0 ? amt / summary[:total_count].to_i : 0

          by_branch = scope.group(:gam_branch, :gam_province)
                           .select('gam_branch AS branch_code, gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT acct_num) AS unique_accounts, AVG(tran_amt) AS avg_transaction')
                           .order('SUM(tran_amt) DESC')
                           .map { |r| row_to_h(r, :branch_code, :province, :total_amount, :transaction_count, :unique_accounts, :avg_transaction) }

          by_channel = scope.where.not(tran_source: nil)
                            .group(:tran_source)
                            .select('tran_source AS channel, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count')
                            .order('SUM(tran_amt) DESC')
                            .map { |r| row_to_h(r, :channel, :total_amount, :transaction_count) }

          trend = scope.group(:tran_date)
                       .select('tran_date AS date, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                       .order(:tran_date)
                       .map { |r| row_to_h(r, :date, :amount, :count) }

          recent = scope.order(tran_date: :desc).limit(20).map do |t|
            {
              date: t.tran_date.to_s,
              description: [t.merchant, t.service, t.product].compact.first || t.gl_sub_head_code || 'Transaction',
              category: t.gl_sub_head_code || 'General',
              type: t.part_tran_type == 'CR' ? 'income' : 'expense',
              part_tran_type: t.part_tran_type,
              amount: t.tran_amt.to_f,
              balance_after: t.eod_balance.to_f,
              account_number: t.acct_num.to_s,
              acid: t.acid.to_s
            }
          end

          {
            cif_id: cif_id,
            requested_cif_id: cif_id,
            customer_name: customer_name,
            segment: SegmentClassifier.segment_for(amt),
            risk_tier: SegmentClassifier.risk_tier_for(avg),
            accounts: accounts,
            summary: summary,
            by_branch: by_branch,
            by_channel: by_channel,
            trend: trend,
            recent_transactions: recent
          }
        end

        render json: data
      end

      def financial_summary
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('financial_summary') do
          scope = TranSummary.apply_filters(filters)
          cr = scope.where(part_tran_type: 'CR')
          dr = scope.where(part_tran_type: 'DR')

          credit_amount = cr.sum(:tran_amt).to_f
          debit_amount  = dr.sum(:tran_amt).to_f
          credit_count  = cr.sum(:tran_count).to_i
          debit_count   = dr.sum(:tran_count).to_i

          monthly_trend = scope.group(:year_month)
                               .select("year_month AS month, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) AS credit, SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) AS debit, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE -tran_amt END) AS net")
                               .order(:year_month)
                               .map { |r| { month: r.month, credit: r.credit.to_f, debit: r.debit.to_f, net: r.net.to_f } }

          by_gl = scope.joins("JOIN gsh ON gsh.gl_sub_head_code::varchar = tran_summary.gl_sub_head_code::varchar")
                       .group('tran_summary.gl_sub_head_code, gsh.gl_sub_head_desc, tran_summary.part_tran_type')
                       .select('tran_summary.gl_sub_head_code AS gl_code, gsh.gl_sub_head_desc AS gl_desc, tran_summary.part_tran_type AS type, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                       .order('SUM(tran_amt) DESC')
                       .limit(20)
                       .map { |r| { gl_code: r.gl_code, gl_desc: r.gl_desc, type: r.type, amount: r.amount.to_f, count: r.count.to_i } }

          {
            credit_amount: credit_amount,
            debit_amount: debit_amount,
            net_flow: credit_amount - debit_amount,
            total_amount: credit_amount + debit_amount,
            credit_count: credit_count,
            debit_count: debit_count,
            credit_ratio: safe_divide(credit_amount * 100, credit_amount + debit_amount),
            avg_credit: safe_divide(credit_amount, credit_count),
            avg_debit: safe_divide(debit_amount, debit_count),
            monthly_trend: monthly_trend,
            by_gl: by_gl
          }
        end

        render json: data
      end

      def digital_channels
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('digital_channels') do
          scope = TranSummary.apply_filters(filters)
          digital = scope.where(tran_source: %w[mobile internet])
          branch_scope = scope.where(tran_source: nil)

          channels = scope.where.not(tran_source: nil)
                          .group(:tran_source)
                          .select("tran_source AS channel, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT acct_num) AS unique_accounts, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) AS credit_amount, SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) AS debit_amount")
                          .order('SUM(tran_amt) DESC')
                          .map { |r| { channel: r.channel, total_amount: r.total_amount.to_f, transaction_count: r.transaction_count.to_i, unique_accounts: r.unique_accounts.to_i, credit_amount: r.credit_amount.to_f, debit_amount: r.debit_amount.to_f } }

          trend = scope.where.not(tran_source: nil)
                       .group(:tran_date, :tran_source)
                       .select('tran_date AS date, tran_source AS channel, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                       .order(:tran_date)
                       .map { |r| { date: r.date.to_s, channel: r.channel, amount: r.amount.to_f, count: r.count.to_i } }

          digital_amount = digital.sum(:tran_amt).to_f
          branch_amount  = branch_scope.sum(:tran_amt).to_f
          total = digital_amount + branch_amount

          {
            channels: channels,
            trend: trend,
            digital_amount: digital_amount,
            branch_amount: branch_amount,
            digital_ratio: safe_divide(digital_amount * 100, total),
            total_digital_accounts: digital.distinct.count(:acct_num)
          }
        end

        render json: data
      end

      def risk_summary
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('risk_summary') do
          scope = TranSummary.apply_filters(filters)
          total = scope.sum(:tran_amt).to_f
          high_value_threshold = 5_000_000

          by_gl = scope.group(:gl_sub_head_code)
                       .select('gl_sub_head_code, SUM(tran_amt) AS amount, SUM(tran_count) AS count, COUNT(DISTINCT acct_num) AS accounts')
                       .order('SUM(tran_amt) DESC')
                       .limit(15)
                       .map { |r| { gl_code: r.gl_sub_head_code, amount: r.amount.to_f, count: r.count.to_i, accounts: r.accounts.to_i } }

          by_province = scope.group(:gam_province)
                             .select("gam_province AS province, SUM(tran_amt) AS amount, COUNT(DISTINCT acct_num) AS accounts, SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) AS debit_amount")
                             .order('SUM(tran_amt) DESC')
                             .map { |r| { province: r.province, amount: r.amount.to_f, accounts: r.accounts.to_i, debit_amount: r.debit_amount.to_f } }

          top3_amount = by_province.first(3).sum { |p| p[:amount] }
          monthly_amounts = scope.group(:year_month).sum(:tran_amt).values.map(&:to_f)
          avg_monthly = monthly_amounts.sum / [monthly_amounts.size, 1].max
          volatility = monthly_amounts.size > 1 ? Math.sqrt(monthly_amounts.map { |v| (v - avg_monthly)**2 }.sum / monthly_amounts.size) : 0

          {
            total_amount: total,
            credit_amount: scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f,
            debit_amount: scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f,
            net_flow: scope.sum(:signed_tranamt).to_f,
            high_value_count: scope.where('tran_amt >= ?', high_value_threshold).count,
            high_value_threshold: high_value_threshold,
            top3_branch_share: safe_divide(top3_amount * 100, total),
            monthly_volatility: volatility.round(2),
            avg_monthly_volume: avg_monthly.round(2),
            by_gl: by_gl,
            by_province: by_province
          }
        end

        render json: data
      end

      def kpi_summary
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('kpi_summary') do
          scope = TranSummary.apply_filters(filters)
          total_amount = scope.sum(:tran_amt).to_f
          total_count  = scope.sum(:tran_count).to_i
          credit_amount = scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f
          debit_amount  = scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f
          unique_accounts  = scope.distinct.count(:acct_num)
          unique_customers = scope.distinct.count(:cif_id)
          unique_branches  = scope.distinct.count(:gam_branch)
          unique_provinces = scope.distinct.count(:gam_province)

          by_quarter = scope.group(:year_quarter)
                            .select('year_quarter AS period, SUM(tran_amt) AS amount, SUM(tran_count) AS count, COUNT(DISTINCT acct_num) AS accounts')
                            .order(:year_quarter)
                            .map { |r| { period: r.period, amount: r.amount.to_f, count: r.count.to_i, accounts: r.accounts.to_i } }

          by_product = scope.where.not(product: [nil, ''])
                            .group(:product)
                            .select('product, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                            .order('SUM(tran_amt) DESC').limit(10)
                            .map { |r| { product: r.product, amount: r.amount.to_f, count: r.count.to_i } }

          by_service = scope.where.not(service: [nil, ''])
                            .group(:service)
                            .select('service, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                            .order('SUM(tran_amt) DESC').limit(10)
                            .map { |r| { service: r.service, amount: r.amount.to_f, count: r.count.to_i } }

          {
            total_amount: total_amount,
            total_count: total_count,
            credit_amount: credit_amount,
            debit_amount: debit_amount,
            net_flow: credit_amount - debit_amount,
            avg_transaction: safe_divide(total_amount, total_count),
            credit_ratio: safe_divide(credit_amount * 100, total_amount),
            unique_accounts: unique_accounts,
            unique_customers: unique_customers,
            unique_branches: unique_branches,
            unique_provinces: unique_provinces,
            txn_per_account: safe_divide(total_count, unique_accounts),
            vol_per_account: safe_divide(total_amount, unique_accounts),
            by_quarter: by_quarter,
            by_product: by_product,
            by_service: by_service
          }
        end

        render json: data
      end

      def employee_detail
        user_id = param_value(:entry_user, :user_id).to_s.strip
        return render json: { error: 'entry_user is required' }, status: :bad_request if user_id.blank?

        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date, entry_user: user_id)

        data = cached("employee_detail_#{user_id}") do
          scope = TranSummary.apply_filters(filters)
          summary = build_summary(scope)

          by_branch = scope.group(:gam_branch, :gam_province)
                           .select('gam_branch AS branch, gam_province AS province, SUM(tran_amt) AS amount, SUM(tran_count) AS count, COUNT(DISTINCT acct_num) AS accounts')
                           .order('SUM(tran_amt) DESC')
                           .map { |r| { branch: r.branch, province: r.province, amount: r.amount.to_f, count: r.count.to_i, accounts: r.accounts.to_i } }

          by_account = scope.group(:acct_num)
                            .select('acct_num, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                            .order('SUM(tran_amt) DESC').limit(15)
                            .map { |r| { acct_num: r.acct_num, amount: r.amount.to_f, count: r.count.to_i } }

          daily_trend = scope.group(:tran_date)
                             .select('tran_date AS date, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                             .order(:tran_date)
                             .map { |r| { date: r.date.to_s, amount: r.amount.to_f, count: r.count.to_i } }

          monthly_trend = scope.group(:year_month)
                               .select("year_month AS month, SUM(tran_amt) AS amount, SUM(tran_count) AS count, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) AS credit, SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) AS debit")
                               .order(:year_month)
                               .map { |r| { month: r.month, amount: r.amount.to_f, count: r.count.to_i, credit: r.credit.to_f, debit: r.debit.to_f } }

          by_product = scope.where.not(product: [nil, ''])
                            .group(:product)
                            .select('product, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                            .order('SUM(tran_amt) DESC').limit(10)
                            .map { |r| { product: r.product, amount: r.amount.to_f, count: r.count.to_i } }

          {
            user_id: user_id,
            summary: summary,
            by_branch: by_branch,
            by_account: by_account,
            daily_trend: daily_trend,
            monthly_trend: monthly_trend,
            by_product: by_product,
            active_branches: by_branch.size
          }
        end

        render json: data
      end

      def demographics
        # Join chain: tran_summary -> accounts -> customers (date_of_birth)
        # No gender column exists in production — age groups derived from customers.date_of_birth
        data = Rails.cache.fetch('dashboard_demographics', expires_in: 30.minutes) do
          sql = <<~SQL
            SELECT
              CASE
                WHEN EXTRACT(YEAR FROM AGE(c.date_of_birth)) < 25 THEN 'Under 25'
                WHEN EXTRACT(YEAR FROM AGE(c.date_of_birth)) BETWEEN 25 AND 34 THEN '25-34'
                WHEN EXTRACT(YEAR FROM AGE(c.date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
                WHEN EXTRACT(YEAR FROM AGE(c.date_of_birth)) BETWEEN 45 AND 54 THEN '45-54'
                WHEN EXTRACT(YEAR FROM AGE(c.date_of_birth)) BETWEEN 55 AND 64 THEN '55-64'
                ELSE '65+'
              END AS age_group,
              COUNT(DISTINCT c.customer_id)                                                        AS customers,
              COUNT(DISTINCT a.account_id)                                                         AS accounts,
              SUM(ts.tran_amt)                                                                      AS total_amount,
              SUM(ts.tran_count)                                                                    AS transaction_count,
              SUM(CASE WHEN ts.part_tran_type = 'CR' THEN ts.tran_amt ELSE 0 END)                  AS credit_amount,
              SUM(CASE WHEN ts.part_tran_type = 'DR' THEN ts.tran_amt ELSE 0 END)                  AS debit_amount
            FROM tran_summary ts
            JOIN accounts a  ON a.account_number = ts.acct_num
            JOIN customers c ON c.customer_id    = a.customer_id
            WHERE c.date_of_birth IS NOT NULL
            GROUP BY 1
            ORDER BY 1
          SQL

          rows = ActiveRecord::Base.connection.exec_query(sql).to_a
          age_groups = rows.map do |r|
            {
              age_group:         r['age_group'],
              customers:         r['customers'].to_i,
              accounts:          r['accounts'].to_i,
              total_amount:      r['total_amount'].to_f,
              transaction_count: r['transaction_count'].to_i,
              credit_amount:     r['credit_amount'].to_f,
              debit_amount:      r['debit_amount'].to_f
            }
          end

          total_customers = age_groups.sum { |r| r[:customers] }

          { age_groups: age_groups, total_customers: total_customers }
        end

        render json: data
      end

      def employer_summary
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('employer_summary') do
          scope = TranSummary.apply_filters(filters)

          by_user = scope.where.not(entry_user: [nil, ''])
                         .group(:entry_user)
                         .select("entry_user AS user, SUM(tran_amt) AS amount, SUM(tran_count) AS count, COUNT(DISTINCT acct_num) AS accounts, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) AS credit")
                         .order('SUM(tran_amt) DESC').limit(20)
                         .map { |r| { user: r.user, amount: r.amount.to_f, count: r.count.to_i, accounts: r.accounts.to_i, credit: r.credit.to_f } }

          by_branch = scope.group(:gam_branch, :gam_province)
                           .select('gam_branch AS branch, gam_province AS province, COUNT(DISTINCT entry_user) AS users, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                           .order('SUM(tran_amt) DESC').limit(20)
                           .map { |r| { branch: r.branch, province: r.province, users: r.users.to_i, amount: r.amount.to_f, count: r.count.to_i } }

          {
            total_entry_users: scope.distinct.count(:entry_user),
            total_vfd_users: scope.distinct.count(:vfd_user),
            total_branches: scope.distinct.count(:gam_branch),
            total_amount: scope.sum(:tran_amt).to_f,
            total_count: scope.sum(:tran_count).to_i,
            by_user: by_user,
            by_branch: by_branch
          }
        end

        render json: data
      end

      private

      def resolved_dates
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date   = parse_date(param_value(:end_date, :endDate))     || Date.today
        [start_date, end_date]
      end

      def cached(action, expires_in: 15.minutes, &block)
        key_data = request.query_parameters
                          .merge('_sd' => resolved_dates[0].to_s, '_ed' => resolved_dates[1].to_s)
                          .sort.to_h
        cache_key = "dashboard_#{action}_#{Digest::MD5.hexdigest(key_data.to_query)}"
        Rails.cache.fetch(cache_key, expires_in: expires_in, &block)
      end

      def build_summary(scope)
        total_amount  = scope.sum(:tran_amt).to_f
        total_count   = scope.sum(:tran_count).to_i
        credit_amount = scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f
        debit_amount  = scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f
        credit_count  = scope.where(part_tran_type: 'CR').sum(:tran_count).to_i
        debit_count   = scope.where(part_tran_type: 'DR').sum(:tran_count).to_i

        {
          total_amount: total_amount,
          total_count: total_count,
          unique_accounts: scope.distinct.count(:acct_num),
          unique_customers: scope.distinct.count(:cif_id),
          avg_transaction_size: safe_divide(total_amount, total_count),
          credit_amount: credit_amount,
          debit_amount: debit_amount,
          net_flow: credit_amount - debit_amount,
          credit_count: credit_count,
          debit_count: debit_count,
          credit_ratio: safe_divide(credit_amount * 100, total_amount)
        }
      end

      def row_to_h(record, *attrs)
        attrs.each_with_object({}) do |attr, hash|
          val = record.public_send(attr)
          hash[attr] = val.is_a?(BigDecimal) ? val.to_f : val
        end
      end

      def safe_divide(numerator, denominator)
        return 0.0 if denominator.nil? || denominator.to_f.zero?
        (numerator.to_f / denominator.to_f).round(2)
      end
    end
  end
end
