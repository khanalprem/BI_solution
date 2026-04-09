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
        start_date       = parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date
        end_date         = parse_date(param_value(:end_date, :endDate)) || Date.today
        measures         = parse_multi_value_param(params[:measures]) || 'total_amount'
        time_comparisons = Array.wrap(parse_multi_value_param(params[:time_comparisons]))
        raw_dims         = param_value(:dimensions, :dimension)
        dimensions       = Array.wrap(parse_multi_value_param(raw_dims))
        dimensions       = ['gam_branch'] if dimensions.empty?

        render json: production_service.tran_summary_explorer(
          start_date:       start_date,
          end_date:         end_date,
          dimensions:       dimensions,
          measures:         measures,
          filters:          filter_params,
          time_comparisons: time_comparisons,
          page:             params[:page],
          page_size:        params[:page_size]
        )
      end

      private

      def production_service
        @production_service ||= ProductionDataService.new
      end
    end
  end
end
