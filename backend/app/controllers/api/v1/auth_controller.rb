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
          permissions:        user_permissions(user),
          can_see_pii:        user.can_see_pii?,
          branch_scoped:      user.branch_scoped?,
          # From production user_branch_cluster table
          branch_access:      user.production_branch_access,
          allowed_branches:   user.allowed_branch_names,
          is_active:          user.is_active,
        }
      end

      def user_permissions(user)
        perms = User::PERMISSIONS[user.role]
        return User::PERMISSIONS.values.flatten.uniq if perms == :all
        Array(perms)
      end

      def encode_jwt(user)
        secret = ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
        payload = {
          user_id:    user.id,
          email:      user.email,
          role:       user.role,
          exp:        24.hours.from_now.to_i
        }
        JWT.encode(payload, secret, 'HS256')
      end

      def decode_jwt(token)
        secret = ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
        JWT.decode(token, secret, true, algorithm: 'HS256').first
      rescue JWT::DecodeError
        nil
      end
    end
  end
end
