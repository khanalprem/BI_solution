module Api
  module V1
    class FiltersController < BaseController
      def values
        svc = ProductionDataService.new
        render json: {
          branches:          svc.static_lookup('branch'),
          clusters:          svc.static_lookup('cluster'),
          provinces:         svc.static_lookup('province'),
          gl_sub_head_codes: svc.static_lookup('gsh'),
          products:          svc.static_lookup('product'),
          services:          svc.static_lookup('service'),
          merchants:         svc.static_lookup('merchant'),
          acct_nums:         svc.static_lookup('acctnum'),
          acids:             svc.static_lookup('acid'),
          cif_ids:           svc.static_lookup('cifid'),
          users:             svc.static_lookup('user')
        }
      end

      def branches
        province_filter = parse_multi_value_param(params[:province])
        province_key = Array.wrap(province_filter).sort.join('_').presence || 'all'
        cache_key = "filter_branches_#{province_key}"

        branches = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          scope = TranSummary.where.not(gam_branch: [nil, ''])
          scope = scope.where(gam_province: province_filter) if province_filter.present?

          if province_filter.present?
            scope.distinct
                 .order(:gam_branch)
                 .pluck(:gam_branch, :gam_cluster)
                 .map { |code, cluster| { code: code, cluster: cluster } }
          else
            scope.distinct
                 .order(:gam_branch)
                 .limit(100)
                 .pluck(:gam_branch)
                 .map { |code| { code: code } }
          end
        end

        render json: branches
      end

      # Cached: runs aggregate queries which are expensive on large tables.
      def statistics
        stats = Rails.cache.fetch('filter_statistics_v2', expires_in: 30.minutes) do
          {
            date_range: {
              min: TranSummary.minimum(:tran_date),
              max: TranSummary.maximum(:tran_date)
            },
            amount_range: {
              min: TranSummary.minimum(:tran_amt),
              max: TranSummary.maximum(:tran_amt)
            },
            counts: {
              total_transactions: TranSummary.count,
              unique_accounts: TranSummary.distinct.count(:acct_num),
              unique_customers: TranSummary.distinct.count(:cif_id)
            }
          }
        end
        render json: stats
      end
    end
  end
end
