module Api
  module V1
    class UsersController < BaseController
      before_action :require_admin!
      before_action :set_user, only: %i[show update destroy]

      # GET /api/v1/users
      def index
        users = User.order(:role, :email).map { |u| user_summary(u) }
        render json: { users: users, roles: User::ROLES, permissions: User::PERMISSIONS }
      end

      # GET /api/v1/users/:id
      def show
        render json: { user: user_detail(@user) }
      end

      # POST /api/v1/users
      def create
        user = User.new(user_params)
        user.is_active = true
        user.is_staff  = %w[admin manager analyst branch_staff auditor].include?(user.role)
        user.is_superuser = user.role == 'superadmin'

        if user.save
          render json: { user: user_detail(user) }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/users/:id
      def update
        # Prevent demoting the last superadmin
        if @user.role == 'superadmin' && params[:role] && params[:role] != 'superadmin'
          remaining = User.where(role: 'superadmin').count
          if remaining <= 1
            return render json: { error: 'Cannot demote the last superadmin' }, status: :unprocessable_entity
          end
        end

        attrs = update_params
        attrs[:is_staff]     = %w[admin manager analyst branch_staff auditor].include?(attrs[:role]) if attrs[:role]
        attrs[:is_superuser] = attrs[:role] == 'superadmin' if attrs[:role]

        if @user.update(attrs)
          render json: { user: user_detail(@user) }
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:id  (deactivate, not hard delete)
      def destroy
        if @user == current_user
          return render json: { error: 'Cannot deactivate your own account' }, status: :unprocessable_entity
        end
        @user.update!(is_active: false)
        render json: { message: 'User deactivated' }
      end

      private

      def require_admin!
        unless %w[superadmin admin].include?(current_user&.role)
          render json: { error: 'Admin access required' }, status: :forbidden
        end
      end

      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :not_found
      end

      def user_params
        params.permit(:email, :password, :first_name, :last_name, :role,
                      assigned_branches: [], assigned_provinces: [])
      end

      def update_params
        params.permit(:email, :password, :first_name, :last_name, :role, :is_active,
                      assigned_branches: [], assigned_provinces: [])
      end

      def user_summary(user)
        {
          id:                user.id,
          email:             user.email,
          first_name:        user.first_name,
          last_name:         user.last_name,
          role:              user.role,
          display_role:      user.display_role,
          is_active:         user.is_active,
          assigned_branches: user.assigned_branches,
          assigned_provinces: user.assigned_provinces,
          created_at:        user.created_at&.iso8601,
        }
      end

      def user_detail(user)
        user_summary(user).merge(
          permissions:   user_permissions(user),
          can_see_pii:   user.can_see_pii?,
          branch_scoped: user.branch_scoped?,
        )
      end

      def user_permissions(user)
        perms = User::PERMISSIONS[user.role]
        return User::PERMISSIONS.values.flatten.uniq if perms == :all
        Array(perms)
      end
    end
  end
end
