---
name: bankbi-config-management
description: Configuration management for BankBI including KPI thresholds, data source connections, user access management, role-based permissions, and system settings. Use when implementing settings pages, user management, alert thresholds, or data integration configuration.
---

# BankBI Configuration & Settings Management

Comprehensive configuration and administration features for the BankBI platform.

## Configuration Sections

### 1. KPI Alert Thresholds

Configure breach triggers that activate notification rules for regulatory and operational metrics.

#### Backend Implementation

```ruby
# app/models/kpi_threshold.rb
class KpiThreshold < ApplicationRecord
  THRESHOLD_TYPES = {
    'npl_ratio_warning' => { default: 2.5, unit: '%', description: 'NPL Ratio Warning Level' },
    'npl_ratio_critical' => { default: 3.0, unit: '%', description: 'NPL Ratio Critical Level' },
    'cost_to_income_warning' => { default: 52.0, unit: '%', description: 'Cost-to-Income Warning' },
    'cost_to_income_critical' => { default: 55.0, unit: '%', description: 'Cost-to-Income Critical' },
    'lcr_min_threshold' => { default: 100.0, unit: '%', description: 'Liquidity Coverage Ratio Minimum' },
    'car_min_threshold' => { default: 10.5, unit: '%', description: 'Capital Adequacy Ratio Minimum' },
    'cd_ratio_max' => { default: 90.0, unit: '%', description: 'Credit-Deposit Ratio Maximum' },
    'casa_ratio_min' => { default: 60.0, unit: '%', description: 'CASA Ratio Minimum Target' }
  }
  
  validates :threshold_type, presence: true, inclusion: { in: THRESHOLD_TYPES.keys }
  validates :threshold_value, presence: true, numericality: true
  
  scope :active, -> { where(active: true) }
  
  def self.get_threshold(type, branch_id: nil)
    threshold = where(threshold_type: type, branch_id: branch_id).or(
      where(threshold_type: type, branch_id: nil)
    ).order('branch_id DESC NULLS LAST').first
    
    threshold&.threshold_value || THRESHOLD_TYPES.dig(type, :default)
  end
  
  def check_breach(current_value)
    case threshold_type
    when 'npl_ratio_warning', 'npl_ratio_critical', 'cost_to_income_warning', 'cost_to_income_critical'
      current_value >= threshold_value  # Breach if equal or above
    when 'lcr_min_threshold', 'car_min_threshold', 'casa_ratio_min'
      current_value <= threshold_value  # Breach if equal or below
    when 'cd_ratio_max'
      current_value >= threshold_value  # Breach if equal or above
    end
  end
end
```

**Migration:**
```ruby
# db/migrate/TIMESTAMP_create_kpi_thresholds.rb
class CreateKpiThresholds < ActiveRecord::Migration[7.1]
  def change
    create_table :kpi_thresholds do |t|
      t.string :threshold_type, null: false
      t.decimal :threshold_value, precision: 10, scale: 2, null: false
      t.references :branch, foreign_key: true  # Null for global thresholds
      t.string :alert_level  # 'warning', 'critical'
      t.boolean :active, default: true
      t.text :notes
      t.timestamps
      
      t.index [:threshold_type, :branch_id], unique: true, where: "branch_id IS NOT NULL"
      t.index [:threshold_type], unique: true, where: "branch_id IS NULL"
    end
  end
end
```

**Service for threshold monitoring:**
```ruby
# app/services/threshold_monitoring_service.rb
class ThresholdMonitoringService
  def initialize(branch_id: nil)
    @branch_id = branch_id
  end
  
  def check_all_thresholds
    metrics = calculate_current_metrics
    breaches = []
    
    KpiThreshold::THRESHOLD_TYPES.each_key do |threshold_type|
      threshold_value = KpiThreshold.get_threshold(threshold_type, branch_id: @branch_id)
      current_value = metrics[threshold_type]
      
      if current_value && threshold_breached?(threshold_type, current_value, threshold_value)
        breaches << {
          type: threshold_type,
          threshold: threshold_value,
          current: current_value,
          severity: threshold_type.include?('critical') ? 'critical' : 'warning',
          message: breach_message(threshold_type, current_value, threshold_value)
        }
      end
    end
    
    create_alerts(breaches) if breaches.any?
    breaches
  end
  
  private
  
  def calculate_current_metrics
    {
      'npl_ratio_warning' => calculate_npl_ratio,
      'npl_ratio_critical' => calculate_npl_ratio,
      'cost_to_income_warning' => calculate_cost_to_income,
      'cost_to_income_critical' => calculate_cost_to_income,
      'lcr_min_threshold' => calculate_lcr,
      'car_min_threshold' => calculate_car,
      'cd_ratio_max' => calculate_cd_ratio,
      'casa_ratio_min' => calculate_casa_ratio
    }
  end
  
  def threshold_breached?(type, current, threshold)
    KpiThreshold.new(threshold_type: type, threshold_value: threshold)
                .check_breach(current)
  end
  
  def breach_message(type, current, threshold)
    config = KpiThreshold::THRESHOLD_TYPES[type]
    "#{config[:description]}: Current #{current}#{config[:unit]} breached threshold of #{threshold}#{config[:unit]}"
  end
end
```

**API Endpoint:**
```ruby
# app/controllers/api/v1/configurations_controller.rb
module Api
  module V1
    class ConfigurationsController < BaseController
      # GET /api/v1/configurations/kpi_thresholds
      def kpi_thresholds
        thresholds = KpiThreshold.active.order(:threshold_type)
        render json: KpiThresholdSerializer.new(thresholds)
      end
      
      # PUT /api/v1/configurations/kpi_thresholds/:id
      def update_kpi_threshold
        threshold = KpiThreshold.find(params[:id])
        
        if threshold.update(threshold_params)
          # Check if new threshold causes breaches
          monitoring = ThresholdMonitoringService.new(branch_id: threshold.branch_id)
          breaches = monitoring.check_all_thresholds
          
          render json: {
            threshold: KpiThresholdSerializer.new(threshold),
            breaches: breaches
          }
        else
          render json: { errors: threshold.errors }, status: :unprocessable_entity
        end
      end
      
      private
      
      def threshold_params
        params.require(:kpi_threshold).permit(:threshold_value, :active, :notes)
      end
    end
  end
end
```

### 2. Data Source Connections

Monitor and manage integration status with external systems.

```ruby
# app/models/data_source.rb
class DataSource < ApplicationRecord
  SYNC_TYPES = ['real-time', 'batch', 'hourly', 'daily']
  CONNECTION_STATUSES = ['connected', 'degraded', 'disconnected', 'maintenance']
  
  SOURCES = {
    'core_banking' => {
      name: 'Core Banking System',
      systems: ['Finnacle', 'T24', 'BaNCS'],
      sync_type: 'real-time',
      critical: true
    },
    'risk_warehouse' => {
      name: 'Risk Data Warehouse',
      sync_type: 'batch',
      critical: true
    },
    'gl_finance' => {
      name: 'GL / Finance System',
      sync_type: 'hourly',
      critical: true
    },
    'crm' => {
      name: 'CRM System',
      sync_type: 'hourly',
      critical: false
    },
    'market_data' => {
      name: 'Market Data Feed',
      systems: ['Refinitiv', 'Bloomberg', 'Local'],
      sync_type: 'real-time',
      critical: false
    }
  }
  
  validates :source_key, presence: true, inclusion: { in: SOURCES.keys }
  validates :connection_status, inclusion: { in: CONNECTION_STATUSES }
  validates :sync_type, inclusion: { in: SYNC_TYPES }
  
  scope :critical, -> { where(critical: true) }
  scope :connected, -> { where(connection_status: 'connected') }
  scope :issues, -> { where(connection_status: ['degraded', 'disconnected']) }
  
  def health_check
    case source_key
    when 'core_banking'
      check_core_banking_connection
    when 'risk_warehouse'
      check_warehouse_connection
    else
      check_generic_connection
    end
  end
  
  def sync_status_color
    case connection_status
    when 'connected' then 'green'
    when 'degraded' then 'amber'
    when 'disconnected' then 'red'
    when 'maintenance' then 'blue'
    end
  end
  
  def time_since_sync
    return 'Never' unless last_sync_at
    
    seconds = Time.current - last_sync_at
    return "#{seconds.to_i} sec ago" if seconds < 60
    return "#{(seconds / 60).to_i} min ago" if seconds < 3600
    return "#{(seconds / 3600).to_i} hours ago" if seconds < 86400
    "#{(seconds / 86400).to_i} days ago"
  end
  
  private
  
  def check_core_banking_connection
    # Implementation specific to core banking system
    # Check database connection, API availability, etc.
    begin
      # Attempt connection
      result = CoreBankingConnector.ping
      update(
        connection_status: 'connected',
        last_sync_at: Time.current,
        error_message: nil
      )
      true
    rescue => e
      update(
        connection_status: 'disconnected',
        error_message: e.message
      )
      false
    end
  end
end
```

**Background job for monitoring:**
```ruby
# app/jobs/data_source_health_check_job.rb
class DataSourceHealthCheckJob < ApplicationJob
  queue_as :default
  
  def perform
    DataSource.find_each do |source|
      source.health_check
      
      # Alert if critical source is down
      if source.critical? && source.connection_status != 'connected'
        AlertService.notify(
          type: 'data_source_down',
          severity: 'critical',
          message: "Critical data source #{source.name} is #{source.connection_status}",
          source: source
        )
      end
    end
  end
end
```

**API Endpoint:**
```ruby
# GET /api/v1/configurations/data_sources
def data_sources
  sources = DataSource.all.map do |source|
    {
      id: source.id,
      name: source.name,
      status: source.connection_status,
      status_color: source.sync_status_color,
      last_sync: source.time_since_sync,
      sync_type: source.sync_type,
      critical: source.critical?,
      error_message: source.error_message
    }
  end
  
  render json: sources
end

# POST /api/v1/configurations/data_sources/:id/test_connection
def test_connection
  source = DataSource.find(params[:id])
  success = source.health_check
  
  render json: {
    success: success,
    status: source.connection_status,
    message: success ? 'Connection successful' : source.error_message
  }
end
```

### 3. User Access Management

Role-based access control with granular permissions.

```ruby
# app/models/user.rb (enhanced)
class User < ApplicationRecord
  has_secure_password
  
  ROLES = {
    'admin' => {
      name: 'Admin',
      permissions: ['all'],
      description: 'Full system access'
    },
    'cfo' => {
      name: 'CFO',
      permissions: ['view_all', 'export', 'configure_kpi'],
      description: 'C-level financial overview'
    },
    'risk_manager' => {
      name: 'Risk Manager',
      permissions: ['view_risk', 'view_loans', 'export', 'manage_thresholds'],
      description: 'Risk and compliance oversight'
    },
    'branch_manager' => {
      name: 'Branch Manager',
      permissions: ['view_branch', 'view_customers', 'view_own_branch'],
      description: 'Branch-level access'
    },
    'analyst' => {
      name: 'Analyst',
      permissions: ['view_dashboards', 'export'],
      description: 'View and analyze data'
    },
    'read_only' => {
      name: 'Read Only',
      permissions: ['view_dashboards'],
      description: 'View-only access (auditors, external)'
    }
  }
  
  USER_STATUSES = ['active', 'inactive', 'locked', 'temp']
  
  validates :email, presence: true, uniqueness: true
  validates :role, inclusion: { in: ROLES.keys }
  validates :status, inclusion: { in: USER_STATUSES }
  
  has_many :user_branch_assignments, dependent: :destroy
  has_many :branches, through: :user_branch_assignments
  has_many :audit_logs, dependent: :nullify
  
  scope :active, -> { where(status: 'active') }
  scope :by_role, ->(role) { where(role: role) }
  
  # Permission checks
  def can?(permission)
    return true if role == 'admin'
    ROLES.dig(role, :permissions)&.include?(permission) || false
  end
  
  def can_access_branch?(branch_id)
    return true if role == 'admin'
    return true if role == 'cfo'
    branches.exists?(branch_id)
  end
  
  def accessible_branches
    return Branch.all if role.in?(['admin', 'cfo', 'risk_manager'])
    branches
  end
  
  def role_name
    ROLES.dig(role, :name) || role.titleize
  end
  
  def role_description
    ROLES.dig(role, :description)
  end
end
```

**User-Branch Assignment:**
```ruby
# app/models/user_branch_assignment.rb
class UserBranchAssignment < ApplicationRecord
  belongs_to :user
  belongs_to :branch
  
  validates :user_id, uniqueness: { scope: :branch_id }
  
  scope :active, -> { joins(:user).where(users: { status: 'active' }) }
end
```

**Migration:**
```ruby
# db/migrate/TIMESTAMP_add_rbac_to_users.rb
class AddRbacToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :role, :string, default: 'analyst', null: false
    add_column :users, :status, :string, default: 'active', null: false
    add_column :users, :last_login_at, :datetime
    add_column :users, :failed_login_attempts, :integer, default: 0
    add_column :users, :locked_at, :datetime
    add_column :users, :temp_access_until, :datetime
    
    add_index :users, :role
    add_index :users, :status
  end
end

# db/migrate/TIMESTAMP_create_user_branch_assignments.rb
class CreateUserBranchAssignments < ActiveRecord::Migration[7.1]
  def change
    create_table :user_branch_assignments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :branch, null: false, foreign_key: true
      t.timestamps
      
      t.index [:user_id, :branch_id], unique: true
    end
  end
end
```

**Policy for authorization:**
```ruby
# app/policies/dashboard_policy.rb
class DashboardPolicy
  attr_reader :user, :dashboard
  
  def initialize(user, dashboard)
    @user = user
    @dashboard = dashboard
  end
  
  def view_executive?
    user.role.in?(['admin', 'cfo'])
  end
  
  def view_financial?
    user.role.in?(['admin', 'cfo'])
  end
  
  def view_branch?
    user.can?('view_branch') || user.can?('view_all')
  end
  
  def view_risk?
    user.can?('view_risk') || user.can?('view_all')
  end
  
  def export?
    user.can?('export')
  end
  
  def configure_thresholds?
    user.can?('manage_thresholds') || user.role == 'admin'
  end
end
```

**API Endpoints:**
```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < BaseController
      before_action :require_admin, except: [:me, :update_me]
      
      # GET /api/v1/users
      def index
        users = User.includes(:branches)
                   .order(:full_name)
        
        render json: users.map { |u| UserSerializer.new(u) }
      end
      
      # POST /api/v1/users
      def create
        user = User.new(user_params)
        
        if user.save
          # Assign branches if provided
          assign_branches(user, params[:branch_ids]) if params[:branch_ids]
          
          # Send welcome email
          UserMailer.welcome(user).deliver_later
          
          render json: UserSerializer.new(user), status: :created
        else
          render json: { errors: user.errors }, status: :unprocessable_entity
        end
      end
      
      # PUT /api/v1/users/:id
      def update
        user = User.find(params[:id])
        
        if user.update(user_params)
          assign_branches(user, params[:branch_ids]) if params[:branch_ids]
          render json: UserSerializer.new(user)
        else
          render json: { errors: user.errors }, status: :unprocessable_entity
        end
      end
      
      # DELETE /api/v1/users/:id
      def destroy
        user = User.find(params[:id])
        user.update(status: 'inactive')
        head :no_content
      end
      
      # POST /api/v1/users/:id/lock
      def lock
        user = User.find(params[:id])
        user.update(status: 'locked', locked_at: Time.current)
        render json: { message: 'User locked successfully' }
      end
      
      # POST /api/v1/users/:id/unlock
      def unlock
        user = User.find(params[:id])
        user.update(status: 'active', locked_at: nil, failed_login_attempts: 0)
        render json: { message: 'User unlocked successfully' }
      end
      
      private
      
      def user_params
        params.require(:user).permit(:email, :full_name, :role, :status, :password, :temp_access_until)
      end
      
      def assign_branches(user, branch_ids)
        user.user_branch_assignments.destroy_all
        branch_ids.each do |branch_id|
          user.user_branch_assignments.create(branch_id: branch_id)
        end
      end
      
      def require_admin
        render json: { error: 'Unauthorized' }, status: :forbidden unless current_user.role == 'admin'
      end
    end
  end
end
```

### 4. Audit Logging

Track all configuration changes and user actions.

```ruby
# app/models/audit_log.rb
class AuditLog < ApplicationRecord
  belongs_to :user, optional: true
  
  ACTIONS = [
    'user_created', 'user_updated', 'user_deleted', 'user_locked', 'user_unlocked',
    'threshold_updated', 'data_source_updated',
    'login_success', 'login_failed', 'logout',
    'export_data', 'view_dashboard', 'configuration_changed'
  ]
  
  validates :action, inclusion: { in: ACTIONS }
  
  scope :by_user, ->(user_id) { where(user_id: user_id) }
  scope :by_action, ->(action) { where(action: action) }
  scope :recent, -> { order(created_at: :desc).limit(100) }
  
  def self.log(action:, user:, details: {}, ip_address: nil)
    create!(
      action: action,
      user: user,
      details: details,
      ip_address: ip_address
    )
  end
end
```

**Controller concern for automatic logging:**
```ruby
# app/controllers/concerns/auditable.rb
module Auditable
  extend ActiveSupport::Concern
  
  included do
    after_action :log_action, if: :should_log?
  end
  
  private
  
  def log_action
    AuditLog.log(
      action: audit_action_name,
      user: current_user,
      details: audit_details,
      ip_address: request.remote_ip
    )
  end
  
  def should_log?
    current_user.present? && !request.path.include?('health')
  end
  
  def audit_action_name
    "#{controller_name}_#{action_name}"
  end
  
  def audit_details
    {
      controller: controller_name,
      action: action_name,
      params: filtered_params
    }
  end
  
  def filtered_params
    params.except(:password, :password_confirmation, :token).to_unsafe_h
  end
end
```

## Frontend Implementation

### Configuration Page Component

```typescript
// app/settings/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface KpiThreshold {
  id: number;
  threshold_type: string;
  threshold_value: number;
  description: string;
  unit: string;
}

interface DataSource {
  id: number;
  name: string;
  status: 'connected' | 'degraded' | 'disconnected';
  last_sync: string;
  sync_type: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

export default function SettingsPage() {
  const [section, setSection] = useState('all');
  const queryClient = useQueryClient();
  
  // Fetch KPI thresholds
  const { data: thresholds } = useQuery({
    queryKey: ['kpi-thresholds'],
    queryFn: async () => {
      const { data } = await apiClient.get('/configurations/kpi_thresholds');
      return data as KpiThreshold[];
    },
  });
  
  // Fetch data sources
  const { data: dataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const { data } = await apiClient.get('/configurations/data_sources');
      return data as DataSource[];
    },
  });
  
  // Fetch users
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data as User[];
    },
  });
  
  // Update threshold mutation
  const updateThreshold = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: number }) => {
      const { data } = await apiClient.put(`/configurations/kpi_thresholds/${id}`, {
        kpi_threshold: { threshold_value: value }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-thresholds'] });
    },
  });
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration</h1>
      
      {/* Filter Bar */}
      <div className="flex gap-4 items-center">
        <select 
          className="px-4 py-2 border rounded"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="all">All Settings</option>
          <option value="kpi">KPI Thresholds</option>
          <option value="data">Data Sources</option>
          <option value="users">Users & Roles</option>
        </select>
      </div>
      
      {/* KPI Thresholds */}
      {(section === 'all' || section === 'kpi') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">KPI Alert Thresholds</h2>
              <p className="text-sm text-gray-500">Breach triggers notification rules</p>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded">
              Save
            </button>
          </div>
          
          <div className="space-y-3">
            {thresholds?.map((threshold) => (
              <div key={threshold.id} className="flex justify-between items-center">
                <span className="text-sm">{threshold.description}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={threshold.threshold_value}
                    onChange={(e) => updateThreshold.mutate({
                      id: threshold.id,
                      value: parseFloat(e.target.value)
                    })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm">{threshold.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Data Sources */}
      {(section === 'all' || section === 'data') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Data Source Connections</h2>
          <div className="space-y-3">
            {dataSources?.map((source) => (
              <div key={source.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    source.status === 'connected' ? 'bg-green-500' :
                    source.status === 'degraded' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">{source.name}</div>
                    <div className="text-xs text-gray-500">
                      Last sync: {source.last_sync} · {source.sync_type}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  source.status === 'connected' ? 'bg-green-100 text-green-800' :
                  source.status === 'degraded' ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Users */}
      {(section === 'all' || section === 'users') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">User Access Management</h2>
              <p className="text-sm text-gray-500">Role-based permissions</p>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
              Add User
            </button>
          </div>
          
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">User</th>
                <th className="text-right py-2">Role</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-3">{user.full_name}</td>
                  <td className="text-right text-gray-500">{user.role}</td>
                  <td className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## Security Considerations

1. **Password Requirements**: Minimum 8 characters, complexity requirements
2. **Session Management**: JWT expiry, refresh tokens
3. **Rate Limiting**: Protect against brute force attacks
4. **Audit Trail**: Log all sensitive operations
5. **Two-Factor Authentication**: Optional for admin users
6. **IP Whitelisting**: Restrict access by IP for sensitive roles

## Testing Configuration Features

```ruby
# spec/models/kpi_threshold_spec.rb
RSpec.describe KpiThreshold, type: :model do
  describe '.get_threshold' do
    it 'returns branch-specific threshold if exists' do
      branch = create(:branch)
      create(:kpi_threshold, threshold_type: 'npl_ratio_warning', 
             threshold_value: 2.0, branch: branch)
      
      expect(KpiThreshold.get_threshold('npl_ratio_warning', branch_id: branch.id))
        .to eq(2.0)
    end
    
    it 'falls back to default if no custom threshold' do
      expect(KpiThreshold.get_threshold('npl_ratio_warning'))
        .to eq(2.5)
    end
  end
end
```

This skill provides complete configuration management for the BankBI system. Combine with other skills for full implementation.
