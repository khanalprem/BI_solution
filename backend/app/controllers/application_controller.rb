class ApplicationController < ActionController::API
  before_action :authenticate_user!

  private

  def authenticate_user!
    token = request.headers['Authorization']&.split(' ')&.last
    return render_unauthorized unless token

    payload = decode_jwt(token)
    return render_unauthorized unless payload

    @current_user = User.active.find_by(id: payload['user_id'])
    render_unauthorized unless @current_user
  rescue StandardError
    render_unauthorized
  end

  # Optional auth — sets current_user if token present, but doesn't block
  def authenticate_user_optional!
    token = request.headers['Authorization']&.split(' ')&.last
    return unless token
    payload = decode_jwt(token)
    return unless payload
    @current_user = User.active.find_by(id: payload['user_id'])
  rescue StandardError
    nil
  end

  def current_user
    @current_user
  end

  def require_role!(*roles)
    unless roles.map(&:to_s).include?(current_user&.role)
      render json: { error: 'Insufficient permissions', required: roles }, status: :forbidden
    end
  end

  def require_permission!(permission)
    unless current_user&.can?(permission)
      render json: { error: "Access denied: #{permission} not allowed for #{current_user&.role}" }, status: :forbidden
    end
  end

  # Apply branch scope for branch_staff — uses production user_branch_cluster table
  def scoped_branch_filter(filters)
    return filters unless current_user&.branch_scoped?
    allowed = current_user.allowed_branch_names
    return filters if allowed.nil? || allowed.empty?
    filters.merge(branch: allowed)
  end

  def render_unauthorized
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end

  def decode_jwt(token)
    secret = ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
    JWT.decode(token, secret, true, algorithm: 'HS256').first
  rescue JWT::DecodeError
    nil
  end
end
