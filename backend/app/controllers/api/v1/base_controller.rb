module Api
  module V1
    class BaseController < ActionController::API
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

      def param_value(*keys)
        keys.each do |key|
          value = params[key]
          return value if value.present?
        end
        nil
      end

      def filter_params
        {
          branch: param_value(:branch_code, :branchCode, :branch),
          province: param_value(:province),
          district: param_value(:district),
          municipality: param_value(:municipality),
          cluster: param_value(:cluster),
          solid: param_value(:solid),
          tran_type: param_value(:tran_type, :tranType),
          part_tran_type: param_value(:part_tran_type, :partTranType),
          tran_source: param_value(:tran_source, :tranSource, :channel),
          product: param_value(:product),
          service: param_value(:service),
          merchant: param_value(:merchant),
          gl_sub_head_code: param_value(:gl_sub_head_code, :glSubHeadCode),
          entry_user: param_value(:entry_user, :entryUser),
          vfd_user: param_value(:vfd_user, :vfdUser),
          min_amount: parse_decimal(param_value(:min_amount, :minAmount)),
          max_amount: parse_decimal(param_value(:max_amount, :maxAmount)),
          acct_num: param_value(:acct_num, :acctNum),
          cif_id: param_value(:cif_id, :cifId)
        }.compact
      end
    end
  end
end
