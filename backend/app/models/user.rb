class User < ApplicationRecord
  has_secure_password

  ROLES = %w[superadmin admin manager analyst branch_staff auditor].freeze

  ROLE_LEVEL = ROLES.each_with_index.to_h.freeze

  PERMISSIONS = {
    'superadmin'   => :all,
    'admin'        => %i[dashboard analytics customers branches financial risk digital employer kpi pivot config users],
    'manager'      => %i[dashboard analytics customers branches financial risk digital employer kpi pivot],
    'analyst'      => %i[dashboard analytics branches financial risk digital kpi pivot],
    'branch_staff' => %i[dashboard branches],
    'auditor'      => %i[dashboard analytics branches financial risk],
  }.freeze

  PII_ROLES = %w[superadmin admin manager].freeze

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: ROLES }

  scope :active, -> { where(is_active: true) }

  def can?(permission)
    return true if PERMISSIONS[role] == :all
    Array(PERMISSIONS[role]).include?(permission.to_sym)
  end

  def can_see_pii?
    PII_ROLES.include?(role)
  end

  def branch_scoped?
    role == 'branch_staff'
  end

  def role_level
    ROLE_LEVEL[role] || 0
  end

  def display_role
    role.humanize
  end

  # Look up allowed branches from production user_branch_cluster table
  # Matches on user_name = "user {id}" pattern in user_master
  def production_branch_access
    return [] unless branch_scoped?
    Rails.cache.fetch("user_branch_access_#{id}", expires_in: 15.minutes) do
      conn = ActiveRecord::Base.connection
      rows = conn.exec_query(<<~SQL.squish).to_a
        SELECT b.branch_name, b.sol_id, b.province, c.cluster_name, ubc.access_level
        FROM user_branch_cluster ubc
        JOIN branch b ON b.sol_id = ubc.sol_id
        LEFT JOIN cluster c ON c.cluster_id = ubc.cluster_id
        JOIN user_master um ON um.user_id = ubc.user_id
        WHERE um.user_name = #{conn.quote("user #{id}")}
        ORDER BY b.branch_name
      SQL
      rows.map do |r|
        {
          branch_name:  r['branch_name'],
          sol_id:       r['sol_id'],
          province:     r['province'],
          cluster_name: r['cluster_name'],
          access_level: r['access_level']&.strip
        }
      end
    end
  rescue StandardError
    []
  end

  def allowed_branch_names
    return nil unless branch_scoped? # nil = no restriction (non-branch_staff)
    names = production_branch_access.map { |r| r[:branch_name] }
    names.presence || [] # empty = deny all access (failed lookup), not "allow all"
  end
end
