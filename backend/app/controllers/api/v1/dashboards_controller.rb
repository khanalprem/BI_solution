module Api
  module V1
    class DashboardsController < BaseController
      def executive
        data = cached('executive') do
          build_service.execute
        end
        render json: data
      end

      def branch_performance
        data = cached('branch_performance') do
          result = build_service.execute(only: %i[summary by_branch by_province])
          {
            branches: result[:by_branch],
            provinces: result[:by_province],
            total_amount: result.dig(:summary, :total_amount).to_f,
            total_count: result.dig(:summary, :total_count).to_i,
            unique_accounts: result.dig(:summary, :unique_accounts).to_i,
            unique_customers: result.dig(:summary, :unique_customers).to_i
          }
        end
        render json: data
      end

      def province_summary
        data = cached('province_summary') do
          build_service.execute(only: [:by_province])[:by_province]
        end
        render json: data
      end

      def channel_breakdown
        data = cached('channel_breakdown') do
          build_service.execute(only: [:by_channel])[:by_channel]
        end
        render json: data
      end

      def daily_trend
        data = cached('daily_trend') do
          build_service.execute(only: [:trend])[:trend]
        end
        render json: data
      end

      def customers_top
        limit = params[:limit].to_i
        limit = 20 if limit <= 0

        data = cached('customers_top') do
          build_service(exclude_filters: [:cif_id]).top_customers(limit: limit)
        end
        render json: data
      end

      def customer_profile
        requested_cif_id = param_value(:cif_id, :cifId)
        transactions_limit = params[:transactions_limit].to_i
        transactions_limit = 30 if transactions_limit <= 0

        if requested_cif_id.blank?
          render json: { error: 'cif_id is required' }, status: :unprocessable_entity
          return
        end

        resolved_cif_id = resolve_cif_id(requested_cif_id)

        data = cached('customer_profile') do
          service = build_service(extra_filters: { cif_id: resolved_cif_id })
          dashboard_data = service.execute(only: %i[summary by_branch by_channel trend])
          total_amount = dashboard_data.dig(:summary, :total_amount).to_f
          avg_transaction = dashboard_data.dig(:summary, :avg_transaction_size).to_f

          {
            cif_id: resolved_cif_id,
            requested_cif_id: requested_cif_id,
            customer_name: customer_name_for(resolved_cif_id),
            segment: SegmentClassifier.segment_for(total_amount),
            risk_tier: SegmentClassifier.risk_tier_for(avg_transaction),
            summary: dashboard_data[:summary],
            by_branch: dashboard_data[:by_branch],
            by_channel: dashboard_data[:by_channel],
            trend: dashboard_data[:trend],
            recent_transactions: service.recent_transactions(limit: transactions_limit)
          }
        end
        render json: data
      end

      def financial_summary
        data = cached('financial_summary') do
          build_service.financial_summary
        end
        render json: data
      end

      def digital_channels
        data = cached('digital_channels') do
          build_service.digital_channels
        end
        render json: data
      end

      def risk_summary
        data = cached('risk_summary') do
          build_service.risk_summary
        end
        render json: data
      end

      def kpi_summary
        data = cached('kpi_summary') do
          build_service.kpi_summary
        end
        render json: data
      end

      def employer_summary
        data = cached('employer_summary') do
          build_service.employer_summary
        end
        render json: data
      end

      private

      def resolved_dates
        @resolved_dates ||= {
          start_date: parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date,
          end_date: parse_date(param_value(:end_date, :endDate)) || Date.today
        }
      end

      def build_service(exclude_filters: [], extra_filters: {})
        filters = filter_params.except(*exclude_filters).merge(extra_filters)
        DynamicDashboardService.new(
          start_date: resolved_dates[:start_date],
          end_date: resolved_dates[:end_date],
          filters: filters
        )
      end

      # Cache key includes the resolved (not raw) dates so rolling defaults
      # produce distinct keys as the day changes.
      def cached(action, expires_in: 15.minutes, &block)
        key_data = request.query_parameters
                     .merge('_sd' => resolved_dates[:start_date].to_s,
                            '_ed' => resolved_dates[:end_date].to_s)
                     .sort.to_h
        cache_key = "dashboard_#{action}_#{Digest::MD5.hexdigest(key_data.to_query)}"
        Rails.cache.fetch(cache_key, expires_in: expires_in, &block)
      end

      def resolve_cif_id(requested_cif_id)
        raw = requested_cif_id.to_s.strip
        digits = raw.gsub(/\D/, '')
        normalized = digits.sub(/^0+/, '')
        date_scope = TranSummary.by_date_range(resolved_dates[:start_date], resolved_dates[:end_date])

        [raw, digits, normalized].reject(&:blank?).uniq.find do |candidate|
          date_scope.where(cif_id: candidate).exists?
        end || raw
      end

      def customer_name_for(cif_id)
        TranSummary.by_date_range(resolved_dates[:start_date], resolved_dates[:end_date])
                   .where(cif_id: cif_id)
                   .where.not(acct_name: [nil, ''])
                   .pick(:acct_name) || "Customer #{cif_id}"
      end
    end
  end
end
