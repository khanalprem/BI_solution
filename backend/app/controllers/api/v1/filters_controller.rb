module Api
  module V1
    class FiltersController < BaseController
      def values
        # Filter options returned to the UI. Only filters whose values produce
        # SQL WHERE clauses downstream are included. District/municipality were
        # always empty and scheme_type had no live WHERE support, so they were
        # removed from the response to avoid populating dead dropdowns.
        data = Rails.cache.fetch('filter_values_v2', expires_in: 1.hour) do
          {
            provinces: distinct_values(:gam_province),
            branches: distinct_values(:gam_branch, limit: 100),
            clusters: distinct_values(:gam_cluster),
            solids: distinct_values(:gam_solid, limit: 100),
            tran_types: distinct_values(:tran_type),
            part_tran_types: distinct_values(:part_tran_type),
            tran_sources: distinct_values(:tran_source),
            products: distinct_values(:product, limit: 50),
            services: distinct_values(:service, limit: 50),
            merchants: distinct_values(:merchant, limit: 50),
            gl_sub_head_codes: distinct_values(:gl_sub_head_code, limit: 100),
            entry_users: distinct_values(:entry_user, limit: 50),
            vfd_users: distinct_values(:vfd_user, limit: 50)
          }
        end
        render json: data
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

      # Cached: runs 7 aggregate queries which are expensive on large tables.
      def statistics
        stats = Rails.cache.fetch('filter_statistics', expires_in: 30.minutes) do
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
              unique_customers: TranSummary.distinct.count(:cif_id),
              provinces: TranSummary.distinct.count(:gam_province),
              branches: TranSummary.distinct.count(:gam_branch)
            }
          }
        end
        render json: stats
      end

      private

      def distinct_values(column, limit: nil)
        relation = TranSummary.where.not(column => [nil, '']).distinct.order(column)
        relation = relation.limit(limit) if limit
        relation.pluck(column).map(&:to_s)
      end
    end
  end
end
