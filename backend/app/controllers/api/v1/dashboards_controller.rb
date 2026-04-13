module Api
  module V1
    class DashboardsController < BaseController
      def executive
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('executive') do
          scope = TranSummary.apply_filters(filters)

          summary = build_summary(scope)
          by_branch  = build_by_branch(scope, limit: 20)
          by_province = build_by_province(scope)
          by_channel  = build_by_channel(scope)
          trend       = build_daily_trend(scope)
          { summary: summary, by_branch: by_branch, by_province: by_province, by_channel: by_channel, trend: trend }
        end

        render json: data
      end

      def branch_performance
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('branch_performance') do
          scope = TranSummary.apply_filters(filters)

          branches  = build_by_branch(scope, limit: nil)
          provinces = build_by_province(scope)
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
          build_by_province(TranSummary.apply_filters(filters))
        end

        render json: data
      end

      def channel_breakdown
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('channel_breakdown') do
          build_by_channel(TranSummary.apply_filters(filters))
        end

        render json: data
      end

      def daily_trend
        start_date, end_date = resolved_dates
        filters = filter_params.merge(start_date: start_date, end_date: end_date)

        data = cached('daily_trend') do
          build_daily_trend(TranSummary.apply_filters(filters))
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
          amt = summary[:total_amount].to_f
          avg = summary[:total_count].to_i > 0 ? amt / summary[:total_count].to_i : 0

          # ── Personal info: customers → accounts → tran_summary ──
          personal_info = fetch_personal_info(cif_id)

          # Fallback name from gam/tran_summary
          customer_name = personal_info[:full_name].presence ||
                          AccountMasterLookup.customer_name_for(cif_id) ||
                          scope.where.not(acct_name: [nil, '']).pick(:acct_name) ||
                          "Customer #{cif_id}"

          accounts = AccountMasterLookup.customer_accounts(cif_id: cif_id)

          by_branch  = build_by_branch(scope, limit: nil)
          by_channel = build_by_channel(scope)
          trend      = build_daily_trend(scope)

          recent = scope.order(tran_date: :desc).limit(20).map do |t|
            {
              date: t.tran_date.to_s,
              description: [t.merchant, t.service, t.product].compact.first || t.gl_sub_head_code || 'Transaction',
              category: t.gl_sub_head_code || 'General',
              type: t.part_tran_type == 'CR' ? 'income' : 'expense',
              part_tran_type: t.part_tran_type,
              amount: t.tran_amt.to_f,
              balance_after: t[:eod_balance].to_f,
              account_number: t.acct_num.to_s,
              acid: t.acid.to_s
            }
          end

          {
            cif_id: cif_id,
            requested_cif_id: cif_id,
            customer_name: customer_name,
            # Personal info from customers table
            first_name:     personal_info[:first_name],
            last_name:      personal_info[:last_name],
            email:          personal_info[:email],
            phone_number:   personal_info[:phone_number],
            address:        personal_info[:address],
            date_of_birth:  personal_info[:date_of_birth],
            account_status: personal_info[:account_status],
            customer_id:    personal_info[:customer_id],
            age:            personal_info[:age],
            segment: SegmentClassifier.segment_for(amt),
            risk_tier: SegmentClassifier.risk_tier_for(avg),
            accounts: accounts,
            account_columns: AccountMasterLookup.gam_columns,
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
          # Configurable via env var (default Rs. 50 Lakh = 5,000,000)
          high_value_threshold = ENV.fetch('RISK_HIGH_VALUE_THRESHOLD', '5000000').to_i

          by_gl = scope.group(:gl_sub_head_code)
                       .select('gl_sub_head_code, SUM(tran_amt) AS amount, SUM(tran_count) AS count, COUNT(DISTINCT acct_num) AS accounts')
                       .order('SUM(tran_amt) DESC')
                       .limit(15)
                       .map { |r| { gl_code: r.gl_sub_head_code, amount: r.amount.to_f, count: r.count.to_i, accounts: r.accounts.to_i } }

          by_province = scope.group(:gam_province)
                             .select("gam_province AS province, SUM(tran_amt) AS amount, COUNT(DISTINCT acct_num) AS accounts, SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) AS debit_amount")
                             .order('SUM(tran_amt) DESC')
                             .map { |r| { province: r.province, amount: r.amount.to_f, accounts: r.accounts.to_i, debit_amount: r.debit_amount.to_f } }

          # Branch concentration — top 3 BRANCHES by volume (not provinces)
          by_branch = scope.group(:gam_branch)
                           .select('gam_branch AS branch, SUM(tran_amt) AS amount')
                           .order('SUM(tran_amt) DESC')
                           .limit(10)
                           .map { |r| { branch: r.branch, amount: r.amount.to_f } }
          top3_branch_amount = by_branch.first(3).sum { |b| b[:amount] }

          # Monthly volatility — CV% with MoM comparison
          monthly_amounts = scope.group(:year_month).sum(:tran_amt).sort.map { |_, v| v.to_f }
          avg_monthly = monthly_amounts.sum / [monthly_amounts.size, 1].max
          std_dev = monthly_amounts.size > 1 ? Math.sqrt(monthly_amounts.map { |v| (v - avg_monthly)**2 }.sum / (monthly_amounts.size - 1)) : 0
          cv_percent = avg_monthly > 0 ? (std_dev / avg_monthly) * 100 : 0

          # MoM trend: compare last month vs previous month
          last_month_amt   = monthly_amounts.length >= 1 ? monthly_amounts[-1] : 0
          prev_month_amt   = monthly_amounts.length >= 2 ? monthly_amounts[-2] : 0
          mom_volume_change = prev_month_amt > 0 ? ((last_month_amt - prev_month_amt) / prev_month_amt * 100).round(1) : 0

          credit_amount = scope.where(part_tran_type: 'CR').sum(:tran_amt).to_f
          debit_amount = scope.where(part_tran_type: 'DR').sum(:tran_amt).to_f

          # NPA proxy: accounts with acct_cls_flg in GAM (if available)
          npa_data = begin
            conn = ActiveRecord::Base.connection
            npa_rows = conn.exec_query(<<~SQL.squish).to_a
              SELECT g.acct_cls_flg,
                     COUNT(DISTINCT g.acid) AS accounts,
                     COALESCE(SUM(ts.tran_amt), 0) AS amount
              FROM gam g
              LEFT JOIN tran_summary ts ON ts.acct_num = g.foracid
              WHERE g.acct_cls_flg IS NOT NULL AND g.acct_cls_flg != ''
              GROUP BY g.acct_cls_flg
              ORDER BY SUM(ts.tran_amt) DESC NULLS LAST
            SQL
            npa_rows.map { |r| { classification: r['acct_cls_flg']&.strip, accounts: r['accounts'].to_i, amount: r['amount'].to_f } }
          rescue StandardError => e
            Rails.logger.warn("NPA query failed (non-critical): #{e.message}")
            []
          end

          # ── Dormancy Analysis ──
          # Classify accounts by last transaction date
          dormancy_data = begin
            conn = ActiveRecord::Base.connection
            today = end_date || Date.today
            dormancy_rows = conn.exec_query(<<~SQL.squish).to_a
              SELECT
                CASE
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 90).to_s)}' THEN 'Active (< 90 days)'
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 365).to_s)}' THEN 'Dormant (90-365 days)'
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 730).to_s)}' THEN 'Inactive (1-2 years)'
                  ELSE 'Inoperative (> 2 years)'
                END AS status,
                COUNT(DISTINCT acct_num) AS accounts,
                COALESCE(SUM(tran_amt), 0) AS total_amount
              FROM tran_summary
              GROUP BY 1
              ORDER BY MIN(
                CASE
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 90).to_s)}' THEN 1
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 365).to_s)}' THEN 2
                  WHEN MAX(tran_date) >= '#{conn.quote_string((today - 730).to_s)}' THEN 3
                  ELSE 4
                END
              )
            SQL
            dormancy_rows.map { |r| { status: r['status'], accounts: r['accounts'].to_i, amount: r['total_amount'].to_f } }
          rescue StandardError => e
            Rails.logger.warn("Dormancy query failed (non-critical): #{e.message}")
            []
          end

          # ── Deposit Concentration (HHI) ──
          # Herfindahl-Hirschman Index = sum(share_i^2) where share_i = branch_amount / total
          hhi = if by_branch.any? && total > 0
            by_branch.sum { |b| ((b[:amount] / total) * 100) ** 2 }.round(1)
          else
            0
          end
          # HHI interpretation: <1500 = competitive, 1500-2500 = moderate, >2500 = concentrated

          # ── Anomaly Detection (3-sigma) ──
          # Flag accounts with unusually high transaction amounts
          anomaly_data = begin
            conn = ActiveRecord::Base.connection
            anomaly_rows = conn.exec_query(<<~SQL.squish).to_a
              WITH acct_stats AS (
                SELECT acct_num,
                       SUM(tran_amt) AS total_amt,
                       COUNT(*) AS txn_count,
                       MAX(tran_date) AS last_txn
                FROM tran_summary
                GROUP BY acct_num
              ),
              portfolio_stats AS (
                SELECT AVG(total_amt) AS mean_amt,
                       STDDEV_SAMP(total_amt) AS stddev_amt
                FROM acct_stats
              )
              SELECT a.acct_num, a.total_amt, a.txn_count, a.last_txn,
                     ROUND(((a.total_amt - p.mean_amt) / NULLIF(p.stddev_amt, 0))::numeric, 2) AS z_score
              FROM acct_stats a, portfolio_stats p
              WHERE a.total_amt > (p.mean_amt + 3 * p.stddev_amt)
              ORDER BY a.total_amt DESC
              LIMIT 20
            SQL
            anomaly_rows.map do |r|
              { acct_num: r['acct_num'], total_amt: r['total_amt'].to_f, txn_count: r['txn_count'].to_i,
                last_txn: r['last_txn']&.to_s, z_score: r['z_score'].to_f }
            end
          rescue StandardError => e
            Rails.logger.warn("Anomaly detection query failed (non-critical): #{e.message}")
            []
          end

          # Configurable thresholds via env vars
          concentration_warn  = ENV.fetch('RISK_CONCENTRATION_WARN', '40').to_f
          concentration_high  = ENV.fetch('RISK_CONCENTRATION_HIGH', '60').to_f
          volatility_warn     = ENV.fetch('RISK_VOLATILITY_WARN', '25').to_f
          volatility_high     = ENV.fetch('RISK_VOLATILITY_HIGH', '50').to_f

          {
            total_amount: total,
            credit_amount: credit_amount,
            debit_amount: debit_amount,
            net_flow: credit_amount - debit_amount,
            high_value_count: scope.where('tran_amt >= ?', high_value_threshold).count,
            high_value_threshold: high_value_threshold,
            # Branch concentration (was incorrectly using provinces)
            top3_branch_share: safe_divide(top3_branch_amount * 100, total),
            top3_branches: by_branch.first(3),
            monthly_volatility: cv_percent.round(1),
            avg_monthly_volume: avg_monthly.round(2),
            mom_volume_change: mom_volume_change,
            # Configurable thresholds
            thresholds: {
              concentration_warn: concentration_warn,
              concentration_high: concentration_high,
              volatility_warn: volatility_warn,
              volatility_high: volatility_high,
            },
            by_gl: by_gl,
            by_province: by_province,
            by_branch: by_branch,
            npa_classification: npa_data,
            # New banking intelligence
            dormancy: dormancy_data,
            hhi_index: hhi,
            anomaly_alerts: anomaly_data
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

          # ── CASA Ratio (Current + Savings / Total Deposits) ──
          # Uses gl_sub_head_code to identify CASA accounts.
          # GL codes for CASA vary by bank — common: 10-19 (Current), 20-29 (Savings).
          # This returns the breakdown so the frontend can compute the ratio.
          casa_data = begin
            casa_rows = scope.group(:gl_sub_head_code)
                             .select("gl_sub_head_code, SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) AS deposit_amount")
                             .where("part_tran_type = 'CR'")
                             .order('deposit_amount DESC')
                             .limit(20)
                             .map { |r| { gl_code: r.gl_sub_head_code, deposit_amount: r.deposit_amount.to_f } }
            total_deposits = casa_rows.sum { |r| r[:deposit_amount] }
            { by_gl: casa_rows, total_deposits: total_deposits }
          rescue StandardError => e
            Rails.logger.warn("CASA query failed (non-critical): #{e.message}")
            { by_gl: [], total_deposits: 0 }
          end

          # ── Transaction Velocity ──
          # avg transactions per account per active day
          active_days = scope.distinct.count(:tran_date)
          txn_velocity = (unique_accounts > 0 && active_days > 0) ?
            safe_divide(total_count.to_f, unique_accounts * active_days) : 0

          # ── MoM Growth Trends ──
          monthly_data = scope.group(:year_month)
                              .select('year_month, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                              .order(:year_month)
                              .map { |r| { month: r.year_month, amount: r.amount.to_f, count: r.count.to_i } }
          # Compute MoM % change for each month
          mom_trends = monthly_data.each_with_index.map do |m, i|
            prev_amt = i > 0 ? monthly_data[i - 1][:amount] : nil
            mom_pct = prev_amt && prev_amt > 0 ? ((m[:amount] - prev_amt) / prev_amt * 100).round(1) : nil
            m.merge(mom_change: mom_pct)
          end

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
            # New banking intelligence
            txn_velocity: txn_velocity,
            active_days: active_days,
            casa: casa_data,
            mom_trends: mom_trends,
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

          by_branch = build_by_branch(scope, limit: nil).map { |r| { branch: r[:branch_code], province: r[:province], amount: r[:total_amount], count: r[:transaction_count], accounts: r[:unique_accounts] } }

          by_account = scope.group(:acct_num)
                            .select('acct_num, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
                            .order('SUM(tran_amt) DESC').limit(15)
                            .map { |r| { acct_num: r.acct_num, amount: r.amount.to_f, count: r.count.to_i } }

          daily_trend = build_daily_trend(scope)

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
              COUNT(DISTINCT c.id)                                                              AS customers,
              COUNT(DISTINCT a.account_id)                                                      AS accounts,
              SUM(ts.tran_amt)                                                                   AS total_amount,
              SUM(ts.tran_count)                                                                 AS transaction_count,
              SUM(CASE WHEN ts.part_tran_type = 'CR' THEN ts.tran_amt ELSE 0 END)               AS credit_amount,
              SUM(CASE WHEN ts.part_tran_type = 'DR' THEN ts.tran_amt ELSE 0 END)               AS debit_amount
            FROM tran_summary ts
            JOIN accounts a  ON a.account_number = ts.acct_num
            JOIN customers c ON c.id = a.customer_id
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

          { age_groups: age_groups, total_customers: age_groups.sum { |r| r[:customers] } }
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

      # Single aggregate query (was 8 separate queries — 8x fewer DB round-trips)
      def build_summary(scope)
        result = scope.select(
          'SUM(tran_amt) AS total_amount',
          'SUM(tran_count) AS total_count',
          "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) AS credit_amount",
          "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) AS debit_amount",
          "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_count ELSE 0 END) AS credit_count",
          "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_count ELSE 0 END) AS debit_count",
          'COUNT(DISTINCT acct_num) AS unique_accounts',
          'COUNT(DISTINCT cif_id) AS unique_customers'
        ).take

        total_amount  = result&.total_amount.to_f
        total_count   = result&.total_count.to_i
        credit_amount = result&.credit_amount.to_f
        debit_amount  = result&.debit_amount.to_f

        {
          total_amount: total_amount,
          total_count: total_count,
          unique_accounts: result&.unique_accounts.to_i,
          unique_customers: result&.unique_customers.to_i,
          avg_transaction_size: safe_divide(total_amount, total_count),
          credit_amount: credit_amount,
          debit_amount: debit_amount,
          net_flow: credit_amount - debit_amount,
          credit_count: result&.credit_count.to_i,
          debit_count: result&.debit_count.to_i,
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

      # ── Shared query builders (eliminate duplication across actions) ──────────

      def build_by_branch(scope, limit: 20)
        scope.group(:gam_branch, :gam_province)
             .select('gam_branch AS branch_code, gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT acct_num) AS unique_accounts, AVG(tran_amt) AS avg_transaction')
             .order('SUM(tran_amt) DESC')
             .then { |q| limit ? q.limit(limit) : q }
             .map { |r| row_to_h(r, :branch_code, :province, :total_amount, :transaction_count, :unique_accounts, :avg_transaction) }
      end

      def build_by_province(scope)
        scope.group(:gam_province)
             .select('gam_province AS province, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count, COUNT(DISTINCT gam_branch) AS branch_count, COUNT(DISTINCT acct_num) AS unique_accounts')
             .order('SUM(tran_amt) DESC')
             .map { |r| row_to_h(r, :province, :total_amount, :transaction_count, :branch_count, :unique_accounts).merge(avg_per_branch: safe_divide(r.total_amount, r.branch_count)) }
      end

      def build_by_channel(scope)
        scope.where.not(tran_source: nil)
             .group(:tran_source)
             .select('tran_source AS channel, SUM(tran_amt) AS total_amount, SUM(tran_count) AS transaction_count')
             .order('SUM(tran_amt) DESC')
             .map { |r| row_to_h(r, :channel, :total_amount, :transaction_count) }
      end

      def build_daily_trend(scope)
        scope.group(:tran_date)
             .select('tran_date AS date, SUM(tran_amt) AS amount, SUM(tran_count) AS count')
             .order(:tran_date)
             .map { |r| row_to_h(r, :date, :amount, :count) }
      end

      # Lookup personal info from customers table via:
      # customers.customer_id = cif_id directly — no accounts join needed
      def fetch_personal_info(cif_id)
        result = ActiveRecord::Base.connection.exec_query(<<~SQL.squish, 'PersonalInfo', [cif_id]).first
          SELECT c.customer_id AS cif_id, c.first_name, c.last_name, c.email,
                 c.phone_number, c.address, c.date_of_birth, c.status AS account_status,
                 EXTRACT(YEAR FROM AGE(c.date_of_birth))::integer AS age
          FROM customers c
          WHERE c.customer_id = $1
          LIMIT 1
        SQL

        return {} if result.nil?

        dob = result['date_of_birth']
        {
          customer_id:    result['cif_id'],
          first_name:     result['first_name'].presence,
          last_name:      result['last_name'].presence,
          full_name:      [result['first_name'], result['last_name']].compact.join(' ').presence,
          email:          result['email'].presence,
          phone_number:   result['phone_number'].presence,
          address:        result['address'].presence,
          date_of_birth:  dob.is_a?(String) ? dob.split(' ').first : dob&.to_s,
          account_status: result['account_status'].presence,
          age:            result['age']&.to_i
        }
      rescue StandardError => e
        Rails.logger.warn("fetch_personal_info failed for #{cif_id}: #{e.message}")
        {}
      end
    end
  end
end
