module Api
  module V1
    class BaseController < ApplicationController
      # Dashboard, filter, and production endpoints use optional auth.
      # Token is validated if present; missing token is allowed for now.
      # UsersController overrides this with require_admin!
      skip_before_action :authenticate_user!
      before_action :authenticate_user_optional!

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
        Rails.logger.error("API Error: #{exception.message}\n#{exception.backtrace&.first(10)&.join("\n")}")
        render json: { error: 'Internal server error' }, status: :internal_server_error
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
        {
          branch: parse_multi_value_param(param_value(:branch_code, :branchCode, :branch)),
          province: parse_multi_value_param(param_value(:province)),
          district: parse_multi_value_param(param_value(:district)),
          municipality: parse_multi_value_param(param_value(:municipality)),
          cluster: parse_multi_value_param(param_value(:cluster)),
          solid: parse_multi_value_param(param_value(:solid)),
          scheme_type: parse_multi_value_param(param_value(:scheme_type, :schemeType)),
          tran_type: parse_multi_value_param(param_value(:tran_type, :tranType)),
          part_tran_type: parse_multi_value_param(param_value(:part_tran_type, :partTranType)),
          tran_source: parse_multi_value_param(param_value(:tran_source, :tranSource, :channel)),
          product: parse_multi_value_param(param_value(:product)),
          service: parse_multi_value_param(param_value(:service)),
          merchant: parse_multi_value_param(param_value(:merchant)),
          gl_sub_head_code: parse_multi_value_param(param_value(:gl_sub_head_code, :glSubHeadCode)),
          entry_user: parse_multi_value_param(param_value(:entry_user, :entryUser)),
          vfd_user: parse_multi_value_param(param_value(:vfd_user, :vfdUser)),
          min_amount: parse_decimal(param_value(:min_amount, :minAmount)),
          max_amount: parse_decimal(param_value(:max_amount, :maxAmount)),
          acct_num: param_value(:acct_num, :acctNum),
          cif_id: param_value(:cif_id, :cifId)
        }.compact
      end
    end
  end
end
