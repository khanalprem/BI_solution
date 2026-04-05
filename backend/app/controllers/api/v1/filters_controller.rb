module Api
  module V1
    class FiltersController < BaseController
      # GET /api/v1/filters/values
      # Returns all unique values for each filterable dimension
      def values
        data = Rails.cache.fetch('filter_values', expires_in: 1.hour) do
          {
            provinces: distinct_values(:gam_province),
            branches: distinct_values(:gam_branch, limit: 100),
            clusters: distinct_values(:gam_cluster),
            districts: [], # Would come from branches table or separate dimension
            municipalities: [], # Would come from branches table
            
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
      
      # GET /api/v1/filters/branches?province=province 1
      # Returns branches for a specific province
      def branches
        cache_key = "filter_branches_#{params[:province].presence || 'all'}"
        branches = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          if params[:province].present?
            TranSummary.where(gam_province: params[:province])
                       .where.not(gam_branch: [nil, ''])
                       .distinct
                       .order(:gam_branch)
                       .pluck(:gam_branch, :gam_cluster)
                       .map { |code, cluster| { code: code, cluster: cluster } }
          else
            TranSummary.where.not(gam_branch: [nil, ''])
                       .distinct
                       .order(:gam_branch)
                       .limit(100)
                       .pluck(:gam_branch)
                       .map { |code| { code: code } }
          end
        end
        
        render json: branches
      end
      
      # GET /api/v1/filters/statistics
      # Returns filter statistics and counts
      def statistics
        stats = {
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
        
        render json: stats
      end

      private

      def distinct_values(column, limit: nil)
        relation = TranSummary.where.not(column => [nil, '']).distinct.order(column)
        relation = relation.limit(limit) if limit
        relation.pluck(column)
      end
    end
  end
end
