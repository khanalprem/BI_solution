class AddRoleToUsers < ActiveRecord::Migration[7.2]
  ROLES = %w[superadmin admin manager analyst branch_staff auditor].freeze

  def up
    add_column :users, :role, :string, default: 'analyst', null: false
    add_column :users, :assigned_branches, :text, array: true, default: []
    add_column :users, :assigned_provinces, :text, array: true, default: []
    add_index  :users, :role

    # Migrate existing flags → roles
    execute <<~SQL
      UPDATE users SET role = 'superadmin' WHERE is_superuser = true;
      UPDATE users SET role = 'admin'      WHERE is_superuser = false AND is_staff = true;
    SQL
  end

  def down
    remove_column :users, :role
    remove_column :users, :assigned_branches
    remove_column :users, :assigned_provinces
  end
end
