class Branch < ApplicationRecord
  self.table_name = 'branch'
  self.primary_key = 'sol_id'

  # Production branch dimension: sol_id, branch_name, province, cluster_id
  PROVINCES = %w[Bagmati Gandaki Lumbini Madhesh Koshi Karnali Sudurpashchim].freeze
end
