class TranSummary < ApplicationRecord
  self.table_name = 'tran_summary'
  self.primary_key = nil

  scope :by_date_range, ->(start_date, end_date) {
    where(tran_date: start_date..end_date)
  }

  scope :by_branch, ->(branch_code) { where(gam_branch: branch_code) }
  scope :by_province, ->(province) { where(gam_province: province) }
  scope :by_customer, ->(cif_id) { where(cif_id: cif_id) }

  def self.total_amount(filters = {})
    apply_filters(filters).sum(:tran_amt) || 0
  end

  def self.total_count(filters = {})
    apply_filters(filters).sum(:tran_count) || 0
  end

  def self.unique_accounts(filters = {})
    apply_filters(filters).distinct.count(:acct_num)
  end

  def self.unique_customers(filters = {})
    apply_filters(filters).distinct.count(:cif_id)
  end

  def self.average_transaction(filters = {})
    apply_filters(filters).average(:tran_amt)&.to_f || 0
  end

  # Shared filter logic used by both the model class methods and
  # DynamicDashboardService. Keeps one source of truth.
  def self.apply_filters(filters)
    scope = all
    scope = scope.where(tran_date: filters[:start_date]..filters[:end_date]) if filters[:start_date] && filters[:end_date]

    {
      gam_branch:      (filters[:branch]),
      gam_province:    (filters[:province]),
      gam_cluster:     (filters[:cluster]),
      gam_solid:       (filters[:solid]),
      tran_type:       (filters[:tran_type]),
      part_tran_type:  (filters[:part_tran_type]),
      tran_source:     (filters[:tran_source] || filters[:channel]),
      product:         (filters[:product]),
      service:         (filters[:service]),
      merchant:        (filters[:merchant]),
      gl_sub_head_code:(filters[:gl_sub_head_code]),
      entry_user:      (filters[:entry_user]),
      vfd_user:        (filters[:vfd_user])
    }.each do |column, value|
      scope = scope.where(column => value) if value.present?
    end

    scope = apply_partial_text_filter(scope, :acct_num, filters[:acct_num])
    scope = apply_partial_text_filter(scope, :cif_id, filters[:cif_id])

    if filters[:scheme_type].present?
      account_scope = AccountMasterLookup.account_number_scope(filters)
      scope = scope.where(acct_num: account_scope) if account_scope.present?
    end

    scope = scope.where('tran_amt >= ?', filters[:min_amount]) unless filters[:min_amount].nil?
    scope = scope.where('tran_amt <= ?', filters[:max_amount]) unless filters[:max_amount].nil?

    scope
  end

  def self.apply_partial_text_filter(scope, column, value)
    term = value.to_s.strip
    return scope if term.blank?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(term)}%"
    scope.where("#{table_name}.#{column}::text ILIKE ?", pattern)
  end
end
