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
        attrs = user_params
        return if authorize_role_assignment!(attrs[:role])

        user = User.new(attrs)
        user.is_active = true
        user.is_staff     = (User::ROLES - %w[superadmin]).include?(user.role)
        user.is_superuser = user.role == 'superadmin'

        if user.save
          render json: { user: user_detail(user) }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/users/:id
      def update
        attrs = update_params

        # Strip blank password — never clear an existing password_digest
        attrs.delete(:password) if attrs[:password].blank?

        # SECURITY (C-4, fixed 2026-04-25): admin cannot create or promote a
        # user to a role at or above their own level (only superadmin can
        # assign superadmin). Also blocks editing a peer/superior even
        # without a role change (can't reset another superadmin's password).
        return if authorize_role_assignment!(attrs[:role])
        return if authorize_target_user!(@user)

        # Prevent demoting the last superadmin
        incoming_role = attrs[:role]
        if @user.role == 'superadmin' && incoming_role.present? && incoming_role != 'superadmin'
          remaining = User.where(role: 'superadmin').count
          if remaining <= 1
            return render json: { error: 'Cannot demote the last superadmin' }, status: :unprocessable_entity
          end
        end

        # Keep is_staff / is_superuser flags in sync with role
        if incoming_role.present?
          attrs[:is_staff]     = (User::ROLES - %w[superadmin]).include?(incoming_role)
          attrs[:is_superuser] = incoming_role == 'superadmin'
        end

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

      # Returns truthy and renders an error if the caller may not assign
      # `target_role`. Returns nil (falsy) when the assignment is allowed.
      # Rule: only superadmin may assign superadmin. Otherwise the target
      # role must be strictly LOWER (higher index) in User::ROLE_LEVEL than
      # the caller's role.
      def authorize_role_assignment!(target_role)
        return nil if target_role.blank?
        return nil if current_user.role == 'superadmin'

        if target_role == 'superadmin'
          render json: { error: 'Only superadmin can assign the superadmin role' }, status: :forbidden
          return true
        end

        target_level = User::ROLE_LEVEL[target_role.to_s]
        actor_level  = User::ROLE_LEVEL[current_user.role.to_s]
        if target_level.nil? || actor_level.nil? || target_level <= actor_level
          render json: { error: "You cannot assign role '#{target_role}' (equal or higher than your own)" },
                 status: :forbidden
          return true
        end
        nil
      end

      # Block editing a user whose role is at or above the caller's level
      # (except editing yourself). Prevents an admin from rotating a
      # superadmin's password or flipping their is_active flag.
      def authorize_target_user!(target)
        return nil if current_user.role == 'superadmin'
        return nil if target.id == current_user.id

        target_level = User::ROLE_LEVEL[target.role.to_s]
        actor_level  = User::ROLE_LEVEL[current_user.role.to_s]
        if target_level.nil? || actor_level.nil? || target_level <= actor_level
          render json: { error: "You cannot modify user with role '#{target.role}'" }, status: :forbidden
          return true
        end
        nil
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
          permissions:   user.permissions_list,
          can_see_pii:   user.can_see_pii?,
          branch_scoped: user.branch_scoped?,
        )
      end
    end
  end
end
