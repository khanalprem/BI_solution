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
        # Sanitized to prevent SQL injection — only known dimension/measure keys allowed.
        partitionby_clause = sanitize_sql_clause(params[:partitionby_clause].to_s.strip, 'PARTITION BY')
        # orderby_clause: full ORDER BY clause from the frontend (e.g. "ORDER BY tran_date, acct_num").
        # Empty string means fall back to the default measure-based ORDER BY in the service.
        orderby_clause = sanitize_sql_clause(params[:orderby_clause].to_s.strip, 'ORDER BY')

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

      def htd_detail
        explicit_start = parse_date(param_value(:start_date, :startDate))
        explicit_end   = parse_date(param_value(:end_date, :endDate))

        # Row dimension values passed as row_dims[dim_key]=value
        row_dims = params[:row_dims].present? ? params[:row_dims].to_unsafe_h : {}

        render json: production_service.htd_detail(
          start_date: explicit_start,
          end_date:   explicit_end,
          filters:    filter_params,
          row_dims:   row_dims,
          page:       params[:page],
          page_size:  params[:page_size]
        )
      end

      private

      # Sanitize ORDER BY / PARTITION BY clauses to only allow known dimension/measure keys
      # and SQL keywords (ASC, DESC, ORDER BY, PARTITION BY). Prevents SQL injection.
      ALLOWED_SQL_TOKENS = %w[ORDER BY PARTITION ASC DESC NULLS FIRST LAST].freeze

      def sanitize_sql_clause(raw, clause_type)
        return '' if raw.blank?
        valid_fields = ProductionDataService::DIMENSIONS.keys +
                       ProductionDataService::MEASURES.keys +
                       ProductionDataService::MEASURES.values.flat_map { |m|
                         m[:order_sql].to_s.scan(/\b\w+\b/) rescue []
                       }

        # Tokenize: split on commas, spaces, and parentheses
        tokens = raw.gsub(/[();]/, ' ').split(/[\s,]+/).reject(&:blank?)
        tokens.each do |token|
          next if ALLOWED_SQL_TOKENS.include?(token.upcase)
          next if valid_fields.include?(token)
          next if token.match?(/\A(SUM|COUNT|MAX|MIN|AVG|DISTINCT)\z/i)
          next if token.match?(/\A\d+\z/) # numeric literals (e.g., limit)
          # Unknown token — reject the entire clause for safety
          Rails.logger.warn("Rejected #{clause_type} clause due to unknown token: #{token.inspect}")
          return ''
        end

        raw
      end

      def production_service
        @production_service ||= ProductionDataService.new
      end
    end
  end
end
