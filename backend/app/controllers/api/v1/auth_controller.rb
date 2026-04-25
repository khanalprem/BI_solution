module Api
  module V1
    class AuthController < ActionController::API
      skip_before_action :authenticate_user!, raise: false
      def signin
        user = User.active.find_by(email: params[:email]&.downcase&.strip)

        unless user&.authenticate(params[:password])
          return render json: { error: 'Invalid email or password' }, status: :unauthorized
        end

        token = encode_jwt(user)
        render json: {
          token: token,
          user: user_payload(user)
        }
      end

      def me
        token = request.headers['Authorization']&.split(' ')&.last
        return render json: { error: 'Unauthorized' }, status: :unauthorized unless token

        payload = decode_jwt(token)
        return render json: { error: 'Unauthorized' }, status: :unauthorized unless payload

        user = User.active.find_by(id: payload['user_id'])
        return render json: { error: 'Unauthorized' }, status: :unauthorized unless user

        render json: { user: user_payload(user) }
      end

      private

      def user_payload(user)
        {
          id:                 user.id,
          email:              user.email,
          first_name:         user.first_name,
          last_name:          user.last_name,
          role:               user.role,
          display_role:       user.display_role,
          permissions:        user.permissions_list,
          can_see_pii:        user.can_see_pii?,
          branch_scoped:      user.branch_scoped?,
          # From production user_branch_cluster table
          branch_access:      user.production_branch_access,
          allowed_branches:   user.allowed_branch_names,
          is_active:          user.is_active,
        }
      end

      # JWT encode/decode lives in BankBi::JwtToken (Phase 1 R-2).
      # Keeping these tiny wrappers so the controller's intent is local and
      # so a future refactor can stub them in tests if needed.
      def encode_jwt(user); BankBi::JwtToken.encode(user); end
      def decode_jwt(token); BankBi::JwtToken.decode(token); end
    end
  end
end
