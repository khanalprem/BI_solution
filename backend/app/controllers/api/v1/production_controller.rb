module Api
  module V1
    class ProductionController < BaseController
      def catalog
        render json: production_service.catalog
      end

      def table
        render json: production_service.table_detail(
          table_name: params[:table_name].to_s,
          page: params[:page],
          page_size: params[:page_size]
        )
      end

      def lookup
        render json: production_service.lookup_preview(
          data_type: params[:data_type].to_s,
          limit: params[:limit]
        )
      end

      def explorer
        # Parse dates explicitly so we can distinguish "user set a range" from "no range set".
        # When start_date is absent (e.g. ALL period before filter-stats loads), pass nil so
        # explorer_where_clause skips the tran_date BETWEEN clause rather than defaulting to
        # last-30-days and silently showing a narrow window.
        explicit_start    = parse_date(param_value(:start_date, :startDate))
        explicit_end      = parse_date(param_value(:end_date, :endDate))
        measures          = parse_multi_value_param(params[:measures]) || 'total_amount'
        time_comparisons  = Array.wrap(parse_multi_value_param(params[:time_comparisons]))
        raw_dims          = param_value(:dimensions, :dimension)
        dimensions        = Array.wrap(parse_multi_value_param(raw_dims))
        dimensions        = ['gam_branch'] if dimensions.empty?
        # partitionby_clause: full PARTITION BY clause from the frontend (e.g. "PARTITION BY tran_date").
        partitionby_clause = params[:partitionby_clause].to_s.strip
        # orderby_clause: full ORDER BY clause from the frontend (e.g. "ORDER BY tran_date, acct_num").
        # Empty string means fall back to the default measure-based ORDER BY in the service.
        orderby_clause = params[:orderby_clause].to_s.strip

        render json: production_service.tran_summary_explorer(
          start_date:        explicit_start,
          end_date:          explicit_end,
          dimensions:        dimensions,
          measures:          measures,
          filters:           filter_params,
          time_comparisons:  time_comparisons,
          partitionby_clause: partitionby_clause,
          orderby_clause:    orderby_clause,
          page:              params[:page],
          page_size:         params[:page_size]
        )
      end

      private

      def production_service
        @production_service ||= ProductionDataService.new
      end
    end
  end
end
