require 'rails_helper'

# Regression for Phase 1 R-1: permissions_list moved from controllers to model.
RSpec.describe User, type: :model do
  describe '#permissions_list' do
    it 'returns the union of all permission lists for superadmin' do
      user = User.new(role: 'superadmin')
      expected = User::PERMISSIONS.values.flatten.uniq
      expect(user.permissions_list).to match_array(expected)
    end

    User::PERMISSIONS.each do |role, perms|
      next if perms == :all

      it "returns the configured permissions for role #{role}" do
        user = User.new(role: role.to_s)
        expect(user.permissions_list).to match_array(Array(perms))
      end
    end
  end

  describe '#can?' do
    it 'returns true for superadmin regardless of permission' do
      user = User.new(role: 'superadmin')
      expect(user.can?(:any_permission_at_all)).to be true
    end

    it 'returns true when the role has the permission' do
      user = User.new(role: 'analyst')
      expect(user.can?(:dashboard)).to be true
    end

    it 'returns false when the role lacks the permission' do
      user = User.new(role: 'auditor')
      expect(user.can?(:users)).to be false
    end
  end

  describe '#can_see_pii?' do
    it 'is true for superadmin / admin / manager' do
      %w[superadmin admin manager].each do |role|
        expect(User.new(role: role).can_see_pii?).to be(true), "expected #{role} can_see_pii?"
      end
    end

    it 'is false for analyst / branch_staff / auditor' do
      %w[analyst branch_staff auditor].each do |role|
        expect(User.new(role: role).can_see_pii?).to be(false), "expected #{role} cannot_see_pii?"
      end
    end
  end
end
