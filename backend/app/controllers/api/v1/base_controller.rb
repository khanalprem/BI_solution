module Api
  module V1
    class BaseController < ApplicationController
      # SECURITY (C-1, fixed 2026-04-25): every endpoint inherits the
      # `before_action :authenticate_user!` from ApplicationController.
      # If a subclass needs to be public it must call `skip_before_action`
      # explicitly with a justifying comment (see AuthController#signin).
      # The previous `authenticate_user_optional!` shortcut is removed —
      # it allowed unauthenticated access to every dashboard / production
      # endpoint and leaked customer PII. See CLAUDE.md "Authentication
      # & Authorization" for the full contract.

      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
      rescue_from StandardError, with: :internal_error

      private

      def not_found(exception)
        render json: { error: exception.message }, status: :not_found
      end

      def unprocessable_entity(exception)
        render json: { error: exception.message }, status: :unprocessable_entity
      end

      def internal_error(exception)
        # SECURITY (M-3, fixed 2026-04-27): include request_id in the response
        # so support can correlate user reports to server logs. Body remains
        # opaque — never leak the exception message or backtrace.
        Rails.logger.error("[#{request.request_id}] API Error: #{exception.message}\n#{exception.backtrace&.first(10)&.join("\n")}")
        render json: {
          error: 'Internal server error',
          request_id: request.request_id
        }, status: :internal_server_error
      end

      def parse_date(date_string)
        return nil if date_string.blank?
        Date.parse(date_string)
      rescue ArgumentError
        nil
      end

      def parse_decimal(value)
        return nil if value.blank?
        BigDecimal(value.to_s)
      rescue ArgumentError
        nil
      end

      # SECURITY (M-5, fixed 2026-04-27): cap multi-value filter inputs to
      # MAX_MULTI_VALUE_PARAMS entries. Without this an attacker can submit
      # ?cif_id=a,b,c,... with 100k tokens, producing a huge IN(...) clause
      # that exhausts memory or saturates the planner before statement_timeout
      # fires. 500 is well above any legitimate UI use (the dropdown caps far
      # lower) and trivial to raise per-endpoint if a real need surfaces.
      MAX_MULTI_VALUE_PARAMS = 500

      def parse_multi_value_param(value)
        values =
          case value
          when Array
            value
          else
            value.to_s.split(',')
          end

        normalized = values.filter_map do |item|
          text = item.to_s.strip
          text.presence
        end

        return nil if normalized.empty?
        if normalized.length > MAX_MULTI_VALUE_PARAMS
          raise ActionController::BadRequest,
                "Too many values: max #{MAX_MULTI_VALUE_PARAMS} per filter"
        end
        return normalized.first if normalized.length == 1

        normalized
      end

      def param_value(*keys)
        keys.each do |key|
          value = params[key]
          return value if value.present?
        end
        nil
      end

      def filter_params
        # Only filters that actually produce SQL WHERE clauses are listed here.
        # Previously-accepted-but-ignored filters (district, municipality, scheme_type)
        # were removed — their UI rows were also removed to avoid silent no-ops.
        {
          branch: parse_multi_value_param(param_value(:branch_code, :branchCode, :branch)),
          province: parse_multi_value_param(param_value(:province)),
          cluster: parse_multi_value_param(param_value(:cluster)),
          solid: parse_multi_value_param(param_value(:solid)),
          tran_branch:   parse_multi_value_param(param_value(:tran_branch,   :tranBranch)),
          tran_cluster:  parse_multi_value_param(param_value(:tran_cluster,  :tranCluster)),
          tran_province: parse_multi_value_param(param_value(:tran_province, :tranProvince)),
          tran_type: parse_multi_value_param(param_value(:tran_type, :tranType)),
          tran_sub_type: parse_multi_value_param(param_value(:tran_sub_type, :tranSubType)),
          part_tran_type: parse_multi_value_param(param_value(:part_tran_type, :partTranType)),
          tran_source: parse_multi_value_param(param_value(:tran_source, :tranSource, :channel)),
          product: parse_multi_value_param(param_value(:product)),
          service: parse_multi_value_param(param_value(:service)),
          merchant: parse_multi_value_param(param_value(:merchant)),
          # Account scheme classification — fixed dropdowns on tran_summary directly
          # (no gam join needed, unlike schm_code below).
          schm_type: parse_multi_value_param(param_value(:schm_type, :schmType)),
          schm_sub_type: parse_multi_value_param(param_value(:schm_sub_type, :schmSubType)),
          gl_sub_head_code: parse_multi_value_param(param_value(:gl_sub_head_code, :glSubHeadCode)),
          entry_user: parse_multi_value_param(param_value(:entry_user, :entryUser)),
          vfd_user: parse_multi_value_param(param_value(:vfd_user, :vfdUser)),
          min_amount: parse_decimal(param_value(:min_amount, :minAmount)),
          max_amount: parse_decimal(param_value(:max_amount, :maxAmount)),
          acct_num: parse_multi_value_param(param_value(:acct_num, :acctNum)),
          cif_id: parse_multi_value_param(param_value(:cif_id, :cifId)),
          acct_name: parse_multi_value_param(param_value(:acct_name, :acctName)),
          acid: parse_multi_value_param(param_value(:acid)),
          # Account scheme code (gam.schm_code) — fixed dropdown:
          # saving / minor / woman / fixed / current. Used by pivot + deposit pages.
          schm_code: parse_multi_value_param(param_value(:schm_code, :schmCode)),
          # Date dimension exact-match filters (pivot explorer)
          tran_date:         parse_multi_value_param(param_value(:tran_date, :tranDate)),
          year_month:        parse_multi_value_param(param_value(:year_month, :yearMonth)),
          year_quarter:      parse_multi_value_param(param_value(:year_quarter, :yearQuarter)),
          year:              parse_multi_value_param(param_value(:year)),
          # Date dimension range filters
          tran_date_from:    param_value(:tran_date_from, :tranDateFrom),
          tran_date_to:      param_value(:tran_date_to, :tranDateTo),
          year_month_from:   param_value(:year_month_from, :yearMonthFrom),
          year_month_to:     param_value(:year_month_to, :yearMonthTo),
          year_quarter_from: param_value(:year_quarter_from, :yearQuarterFrom),
          year_quarter_to:   param_value(:year_quarter_to, :yearQuarterTo),
          year_from:         param_value(:year_from, :yearFrom),
          year_to:           param_value(:year_to, :yearTo)
        }.compact
      end
    end
  end
end
