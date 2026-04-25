class TranSummary < ApplicationRecord
  self.table_name = 'tran_summary'
  self.primary_key = nil

  # `by_date_range` scope is the only public scope retained — used implicitly
  # via `apply_filters` and explicitly in lib/tasks/import_data.rake docs.
  # Removed in Phase 1 (REVIEW_OPTIMIZATION.md R-3): `by_branch`, `by_province`,
  # `by_customer` scopes; `total_amount`, `total_count`, `unique_accounts`,
  # `unique_customers`, `average_transaction` class methods. None of them had
  # any caller in app code (only `puts` doc strings in import_data.rake).
  scope :by_date_range, ->(start_date, end_date) {
    where(tran_date: start_date..end_date)
  }

  # Shared filter logic used by every dashboards / production endpoint.
  # Inputs come from BaseController#filter_params; the keys here must match.
  def self.apply_filters(filters)
    scope = all
    scope = scope.where(tran_date: filters[:start_date]..filters[:end_date]) if filters[:start_date] && filters[:end_date]

    {
      gam_branch:      filters[:branch],
      gam_province:    filters[:province],
      gam_cluster:     filters[:cluster],
      gam_solid:       filters[:solid],
      tran_type:       filters[:tran_type],
      part_tran_type:  filters[:part_tran_type],
      tran_source:     (filters[:tran_source] || filters[:channel]),
      product:         filters[:product],
      service:         filters[:service],
      merchant:        filters[:merchant],
      gl_sub_head_code: filters[:gl_sub_head_code],
      entry_user:      filters[:entry_user],
      vfd_user:        filters[:vfd_user]
    }.each do |column, value|
      scope = scope.where(column => value) if value.present?
    end

    scope = apply_partial_text_filter(scope, :acct_num, filters[:acct_num])
    scope = apply_partial_text_filter(scope, :cif_id, filters[:cif_id])

    # `scheme_type` filter branch removed in Phase 1 (R-4): the frontend filter
    # was deleted (CLAUDE.md "Filter set" section) and BaseController#filter_params
    # never sets this key, so the branch was unreachable.

    scope = scope.where('tran_amt >= ?', filters[:min_amount]) unless filters[:min_amount].nil?
    scope = scope.where('tran_amt <= ?', filters[:max_amount]) unless filters[:max_amount].nil?

    scope
  end

  def self.apply_partial_text_filter(scope, column, value)
    terms = Array.wrap(value).map { |v| v.to_s.strip }.reject(&:blank?)
    return scope if terms.empty?

    patterns = terms.map { |t| "%#{ActiveRecord::Base.sanitize_sql_like(t)}%" }
    placeholders = patterns.map { "#{table_name}.#{column}::text ILIKE ?" }.join(' OR ')
    scope.where(placeholders, *patterns)
  end
end
