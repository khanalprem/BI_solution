class ApplicationController < ActionController::API
  # JWT issuer / audience constants and encode/decode logic live in
  # BankBi::JwtToken (lib/bank_bi/jwt_token.rb). Two aliases below keep the
  # legacy constant names available so other code that still references
  # ApplicationController::JWT_ISSUER / JWT_AUDIENCE keeps working.
  JWT_ISSUER   = BankBi::JwtToken::ISSUER
  JWT_AUDIENCE = BankBi::JwtToken::AUDIENCE

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

  # SECURITY (C-2, fixed 2026-04-25): gate every endpoint that returns
  # personal data (name, DOB, email, phone, address) behind this check.
  # Roles allowed: superadmin, admin, manager (User::PII_ROLES).
  def require_pii!
    return if current_user&.can_see_pii?
    render json: { error: 'PII access not permitted for your role' }, status: :forbidden
  end

  # Apply branch scope for branch_staff — uses production user_branch_cluster table
  def scoped_branch_filter(filters)
    return filters unless current_user&.branch_scoped?
    allowed = current_user.allowed_branch_names
    return filters if allowed.nil? # nil = non-branch_staff, no restriction
    return filters.merge(branch: ['__NONE__']) if allowed.empty? # empty = deny all (failed lookup)
    filters.merge(branch: allowed)
  end

  # SECURITY (C-3, fixed 2026-04-25): single helper that every dashboard /
  # production controller MUST use in place of `filter_params`. Forces the
  # branch_staff allow-list through scoped_branch_filter so a teller in
  # Branch A can never query Branch B by passing `branch=BRANCH-B`.
  def scoped_filter_params
    raise NoMethodError, 'scoped_filter_params requires filter_params on the subclass' unless respond_to?(:filter_params, true)
    scoped_branch_filter(filter_params)
  end

  def render_unauthorized
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end

  def decode_jwt(token)
    BankBi::JwtToken.decode(token)
  end
end
