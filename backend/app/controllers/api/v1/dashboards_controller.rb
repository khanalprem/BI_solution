module Api
  module V1
    class DashboardsController < BaseController
      # GET /api/v1/dashboards/executive
      def executive
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        
        data = Rails.cache.fetch(cache_key('executive'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params
          )
          service.execute
        end
        
        render json: data
      end
      
      # GET /api/v1/dashboards/branch_performance
      def branch_performance
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        
        data = Rails.cache.fetch(cache_key('branch_performance'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params
          )
          dashboard_data = service.execute

          {
            branches: dashboard_data[:by_branch],
            provinces: dashboard_data[:by_province],
            total_amount: dashboard_data.dig(:summary, :total_amount).to_f,
            total_count: dashboard_data.dig(:summary, :total_count).to_i,
            unique_accounts: dashboard_data.dig(:summary, :unique_accounts).to_i,
            unique_customers: dashboard_data.dig(:summary, :unique_customers).to_i
          }
        end
        
        render json: data
      end
      
      # GET /api/v1/dashboards/province_summary
      def province_summary
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        
        data = Rails.cache.fetch(cache_key('province_summary'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params
          )
          service.execute[:by_province]
        end
        
        render json: data
      end
      
      # GET /api/v1/dashboards/channel_breakdown
      def channel_breakdown
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        
        data = Rails.cache.fetch(cache_key('channel_breakdown'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params
          )
          service.execute[:by_channel]
        end
        
        render json: data
      end
      
      # GET /api/v1/dashboards/daily_trend
      def daily_trend
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        
        data = Rails.cache.fetch(cache_key('daily_trend'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params
          )
          service.execute[:trend]
        end
        
        render json: data
      end

      # GET /api/v1/dashboards/customers_top
      def customers_top
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        limit = params[:limit].to_i
        limit = 20 if limit <= 0

        data = Rails.cache.fetch(cache_key('customers_top'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params.except(:cif_id)
          )
          service.top_customers(limit: limit)
        end

        render json: data
      end

      # GET /api/v1/dashboards/customer_profile?cif_id=...
      def customer_profile
        start_date = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date = parse_date(param_value(:end_date, :endDate)) || Date.today
        requested_cif_id = param_value(:cif_id, :cifId)
        transactions_limit = params[:transactions_limit].to_i
        transactions_limit = 30 if transactions_limit <= 0

        if requested_cif_id.blank?
          render json: { error: 'cif_id is required' }, status: :unprocessable_entity
          return
        end

        resolved_cif_id = resolve_cif_id(requested_cif_id, start_date, end_date)

        data = Rails.cache.fetch(cache_key('customer_profile'), expires_in: 15.minutes) do
          service = DynamicDashboardService.new(
            start_date: start_date,
            end_date: end_date,
            filters: filter_params.merge(cif_id: resolved_cif_id)
          )
          dashboard_data = service.execute
          total_amount = dashboard_data.dig(:summary, :total_amount).to_f
          avg_transaction = dashboard_data.dig(:summary, :avg_transaction_size).to_f

          {
            cif_id: resolved_cif_id,
            requested_cif_id: requested_cif_id,
            customer_name: customer_name_for(resolved_cif_id, start_date, end_date),
            segment: infer_segment(total_amount),
            risk_tier: infer_risk_tier(avg_transaction),
            summary: dashboard_data[:summary],
            by_branch: dashboard_data[:by_branch],
            by_channel: dashboard_data[:by_channel],
            trend: dashboard_data[:trend],
            recent_transactions: service.recent_transactions(limit: transactions_limit)
          }
        end
        
        render json: data
      end
      
      private
      
      def cache_key(action)
        params_hash = request.query_parameters.sort.to_h
        "dashboard_#{action}_#{Digest::MD5.hexdigest(params_hash.to_query)}"
      end

      def resolve_cif_id(requested_cif_id, start_date, end_date)
        raw = requested_cif_id.to_s.strip
        digits = raw.gsub(/\D/, '')
        normalized = digits.sub(/^0+/, '')

        candidates = [raw, digits, normalized].reject(&:blank?).uniq
        matched = candidates.find do |candidate|
          TranSummary.by_date_range(start_date, end_date).where(cif_id: candidate).exists?
        end

        matched || raw
      end

      def customer_name_for(cif_id, start_date, end_date)
        TranSummary.by_date_range(start_date, end_date)
                   .where(cif_id: cif_id)
                   .where.not(acct_name: [nil, ''])
                   .pick(:acct_name) || "Customer #{cif_id}"
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
    end
  end
end
