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
        # Parse the period-selector dates. They no longer flow into where_clause as a
        # global tran_date BETWEEN (the service builds where_clause strictly from
        # user filter fields). They're still used for period-comparison anchors and
        # the EAB join's as-of date, so we keep parsing them here.
        explicit_start    = parse_date(param_value(:start_date, :startDate))
        explicit_end      = parse_date(param_value(:end_date, :endDate))
        # No fallback measure: an empty `measures` param means the user picked none,
        # which the service treats as a measure-less "SELECT <dims> GROUP BY <dims>"
        # query. Defaulting to `total_amount` here would silently inject an Amount
        # column the user never asked for.
        measures          = parse_multi_value_param(params[:measures])
        time_comparisons  = Array.wrap(parse_multi_value_param(params[:time_comparisons]))
        raw_dims          = param_value(:dimensions, :dimension)
        dimensions        = Array.wrap(parse_multi_value_param(raw_dims))
        # Both dims AND measures empty would produce a no-op query — fall back to
        # gam_branch for a sensible default (caller intent unclear). Measure-only
        # mode (dims empty, measures present) is supported: the service returns a
        # single aggregate row across the filter scope.
        dimensions        = ['gam_branch'] if dimensions.empty? && Array(measures).empty?
        # partitionby_clause: full PARTITION BY clause from the frontend (e.g. "PARTITION BY tran_date").
        # Sanitized to prevent SQL injection — only known dimension/measure keys allowed.
        partitionby_clause = sanitize_sql_clause(params[:partitionby_clause].to_s.strip, 'PARTITION BY')
        # orderby_clause: full ORDER BY clause from the frontend (e.g. "ORDER BY tran_date, acct_num").
        # Empty string means fall back to the default measure-based ORDER BY in the service.
        orderby_clause = sanitize_sql_clause(params[:orderby_clause].to_s.strip, 'ORDER BY')

        # having: structured measure-level comparison filters. Frontend sends
        #   having[<measure_key>][op]=>=    having[<measure_key>][value]=1000
        # The controller validates each pair and assembles a safe HAVING clause — we never
        # accept a raw HAVING string from the client.
        having_clause = build_having_clause(params[:having])

        # disable_tiebreaker: when true, skip the `, acct_num ASC` pagination tiebreaker the
        # service normally appends. Used by /dashboard/segmentation where the user's chosen
        # sort (e.g. rfm_score DESC) must stand alone without a secondary sort column.
        disable_tiebreaker = ActiveModel::Type::Boolean.new.cast(params[:disable_tiebreaker])

        render json: production_service.tran_summary_explorer(
          start_date:        explicit_start,
          end_date:          explicit_end,
          dimensions:        dimensions,
          measures:          measures,
          filters:           scoped_filter_params,
          time_comparisons:  time_comparisons,
          partitionby_clause: partitionby_clause,
          orderby_clause:    orderby_clause,
          having_clause:     having_clause,
          page:              params[:page],
          page_size:         params[:page_size],
          disable_tiebreaker: disable_tiebreaker
        )
      end

      def deposits
        explicit_start = parse_date(param_value(:start_date, :startDate))
        explicit_end   = parse_date(param_value(:end_date,   :endDate))
        raw_dims       = param_value(:dimensions, :dimension)
        dimensions     = Array.wrap(parse_multi_value_param(raw_dims))
        dimensions     = ['gam_branch'] if dimensions.empty?

        # Sanitize against the deposit-side whitelist (smaller than the pivot one —
        # only dims/functions that appear inside get_deposit are valid).
        partitionby_clause = sanitize_deposit_clause(params[:partitionby_clause].to_s.strip)
        orderby_clause     = sanitize_deposit_clause(params[:orderby_clause].to_s.strip)

        result = production_service.deposit_explorer(
          start_date:         explicit_start,
          end_date:           explicit_end,
          dimensions:         dimensions,
          filters:            scoped_filter_params,
          partitionby_clause: partitionby_clause,
          orderby_clause:     orderby_clause,
          page:               params[:page],
          page_size:          params[:page_size]
        )
        render json: result
      rescue ActiveRecord::StatementInvalid, PG::Error => e
        # SECURITY (H-6, fixed 2026-04-25): never return raw PG / procedure
        # error messages to the client — they leak column / table / SQL
        # structure. The full error is logged with the request_id so an
        # operator can correlate the user's report to the server log.
        Rails.logger.error(<<~LOG)
          [deposits] procedure call failed (request_id=#{request.request_id})
            dims:               #{dimensions.inspect}
            partitionby_clause: #{partitionby_clause.inspect}
            orderby_clause:     #{orderby_clause.inspect}
            error:              #{e.message}
        LOG
        render json: {
          error: 'Deposit query failed. Please contact support if this persists.',
          request_id: request.request_id
        }, status: :internal_server_error
      end

      def htd_detail
        explicit_start = parse_date(param_value(:start_date, :startDate))
        explicit_end   = parse_date(param_value(:end_date, :endDate))

        # SECURITY (M-4, fixed 2026-04-25): permit only the dim keys the
        # service actually maps (HTD_DIM_MAP). Unknown keys are silently
        # dropped — to_unsafe_h is no longer used.
        row_dims = if params[:row_dims].present?
          permitted_dim_keys = ProductionDataService::HTD_DIM_MAP.keys.map(&:to_s)
          params.require(:row_dims).permit(*permitted_dim_keys).to_h
        else
          {}
        end

        render json: production_service.htd_detail(
          start_date: explicit_start,
          end_date:   explicit_end,
          filters:    scoped_filter_params,
          row_dims:   row_dims,
          page:       params[:page],
          page_size:  params[:page_size]
        )
      end

      private

      # Aggregate expression per measure used when building the HAVING clause.
      # Must mirror the aggregate from MEASURES[key][:select_sql]. Numeric kinds
      # accept a numeric literal; date kinds accept an ISO date string.
      HAVING_EXPR = {
        'tran_amt'        => { expr: 'SUM(tran_amt)',        kind: :numeric },
        'tran_count'      => { expr: 'SUM(tran_count)',      kind: :numeric },
        'signed_tranamt'  => { expr: 'SUM(signed_tranamt)',  kind: :numeric },
        'cr_amt'          => { expr: "SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END)",   kind: :numeric },
        'cr_count'        => { expr: "SUM(CASE WHEN part_tran_type='CR' THEN tran_count ELSE 0 END)", kind: :numeric },
        'dr_amt'          => { expr: "SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END)",   kind: :numeric },
        'dr_count'        => { expr: "SUM(CASE WHEN part_tran_type='DR' THEN tran_count ELSE 0 END)", kind: :numeric },
        'tran_acct_count' => { expr: 'COUNT(DISTINCT acct_num)', kind: :numeric },
        'tran_maxdate'    => { expr: 'MAX(tran_date)',       kind: :date },
        'rfm_score'       => { expr: 'SUM(tran_count)*0.001 + SUM(tran_amt)*0.0001 + (CURRENT_DATE-MAX(tran_date)::date)*(-0.001)', kind: :numeric }
      }.freeze
      HAVING_OPS = %w[= <= >= < >].freeze

      def build_having_clause(raw)
        return '' if raw.blank?
        hash = raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw.to_h
        clauses = hash.filter_map do |key, spec|
          meta = HAVING_EXPR[key.to_s]
          next unless meta
          next unless spec.is_a?(Hash) || spec.is_a?(ActionController::Parameters)
          op    = spec['op'].to_s
          value = spec['value'].to_s.strip
          next if value.blank?
          next unless HAVING_OPS.include?(op)

          literal =
            case meta[:kind]
            when :numeric
              next unless value.match?(/\A-?\d+(\.\d+)?\z/)
              value
            when :date
              next unless value.match?(/\A\d{4}-\d{2}-\d{2}\z/)
              ActiveRecord::Base.connection.quote(value)
            end
          "#{meta[:expr]} #{op} #{literal}"
        end
        clauses.empty? ? '' : "HAVING #{clauses.join(' AND ')}"
      end

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

      # Tighter whitelist for /production/deposits — only deposit-side dim keys,
      # SQL keywords, and the single aggregate the procedure itself emits.
      DEPOSIT_ALLOWED_FUNCS = %w[SUM].freeze

      def sanitize_deposit_clause(raw)
        return '' if raw.blank?
        valid = ProductionDataService::DEPOSIT_DIMENSIONS.keys + %w[deposit tran_date_bal e]

        tokens = raw.gsub(/[();.]/, ' ').split(/[\s,]+/).reject(&:blank?)
        tokens.each do |token|
          next if ALLOWED_SQL_TOKENS.include?(token.upcase)
          next if valid.include?(token)
          next if DEPOSIT_ALLOWED_FUNCS.include?(token.upcase)
          next if token.match?(/\A\d+\z/)
          Rails.logger.warn("Rejected deposit clause due to unknown token: #{token.inspect}")
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
