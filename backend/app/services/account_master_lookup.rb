class AccountMasterLookup
  FALLBACK_SCHEME_TYPE = 'Unclassified'.freeze

  class << self
    def available?
      Rails.cache.fetch('account_master_lookup_gam_available', expires_in: 15.minutes) { Gam.table_available? }
    rescue StandardError => exception
      log_warning("availability check failed: #{exception.message}")
      false
    end

    def distinct_values(column, limit: nil, filters: {})
      return [] unless available?
      return [] unless gam_column?(column)

      scope = apply_account_filters(Gam.all, filters)
      scope = scope.where.not(column => [nil, '']).distinct.order(column)
      scope = scope.limit(limit) if limit

      scope.pluck(column)
           .map { |value| normalize_text(value) }
           .compact
           .uniq
    rescue StandardError => exception
      log_warning("distinct #{column} failed: #{exception.message}")
      []
    end

    def customer_name_for(cif_id)
      return nil unless available?

      scope = Gam.where(cif_id: cif_id.to_s.strip)
                 .where.not(acct_name: [nil, ''])
                 .order(Arel.sql('COALESCE(lchg_time, CURRENT_TIMESTAMP) DESC'))

      normalize_text(scope.pick(:acct_name))
    rescue StandardError => exception
      log_warning("customer name lookup failed for #{cif_id}: #{exception.message}")
      nil
    end

    def customer_names_for(cif_ids)
      return {} unless available?

      normalized_ids = Array(cif_ids).filter_map { |value| normalize_text(value) }.uniq
      return {} if normalized_ids.empty?

      rows = Gam.where(cif_id: normalized_ids)
                .where.not(acct_name: [nil, ''])
                .order(:cif_id, Arel.sql('COALESCE(lchg_time, CURRENT_TIMESTAMP) DESC'))
                .pluck(:cif_id, :acct_name)

      rows.each_with_object({}) do |(cif_id, acct_name), memo|
        memo[cif_id] ||= acct_name
      end
    rescue StandardError => exception
      log_warning("customer names lookup failed: #{exception.message}")
      {}
    end

    def account_number_scope(filters = {})
      return nil unless available?

      apply_account_filters(Gam.all, filters, skip_cif: true)
        .where.not(acct_num: [nil, ''])
        .select(:acct_num)
    rescue StandardError => exception
      log_warning("account scope lookup failed: #{exception.message}")
      nil
    end

    def customer_accounts(cif_id:, filters: {})
      return [] unless available?

      scope = apply_account_filters(Gam.where(cif_id: cif_id.to_s.strip), filters, skip_cif: true)

      scope.select(
        :acct_num,
        :acid,
        :acct_name,
        :schm_type,
        :gl_sub_head_code,
        :sol_id,
        :eod_balance,
        :lchg_time
      )
           .order(Arel.sql('COALESCE(eod_balance, 0) DESC'), :acct_num)
           .map do |record|
        {
          acct_num: record.acct_num.to_s,
          acid: record.acid.to_s,
          acct_name: record.acct_name.to_s,
          scheme_type: normalize_text(record.schm_type) || FALLBACK_SCHEME_TYPE,
          gl_sub_head_code: normalize_text(record.gl_sub_head_code),
          sol_id: record.sol_id&.to_s,
          eod_balance: record.eod_balance.to_f,
          last_changed_at: record.lchg_time&.iso8601
        }
      end
    rescue StandardError => exception
      log_warning("customer account lookup failed for #{cif_id}: #{exception.message}")
      []
    end

    def apply_partial_text_filter(scope, column, value)
      term = normalize_text(value)
      return scope if term.blank?

      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(term)}%"
      scope.where("#{scope.table_name}.#{column}::text ILIKE ?", pattern)
    end

    private

    def apply_account_filters(scope, filters, skip_cif: false)
      scope = scope.where(sol_id: filters[:solid]) if filters[:solid].present? && gam_column?(:sol_id)
      scope = scope.where(gl_sub_head_code: filters[:gl_sub_head_code]) if filters[:gl_sub_head_code].present? && gam_column?(:gl_sub_head_code)
      scope = scope.where(schm_type: filters[:scheme_type]) if filters[:scheme_type].present? && gam_column?(:schm_type)
      scope = scope.where(cif_id: filters[:cif_id]) if !skip_cif && filters[:cif_id].present? && gam_column?(:cif_id)
      apply_partial_text_filter(scope, :acct_num, filters[:acct_num])
    end

    def gam_column?(column)
      Gam.column_names.include?(column.to_s)
    rescue StandardError
      false
    end

    def normalize_text(value)
      text = value.to_s.strip
      text.presence
    end

    def log_warning(message)
      Rails.logger.warn("AccountMasterLookup: #{message}")
    end
  end
end
