require 'rails_helper'

# SECURITY (C-1) regression: confirms every API endpoint that should be
# behind the auth wall returns 401 without a token. Previously these all
# returned 200 with full data because BaseController used optional auth.
#
# When you add a new route under /api/v1/, add it to PROTECTED_ROUTES below
# (or to PUBLIC_ROUTES if it is intentionally public).

RSpec.describe 'API v1 auth gate', type: :request do
  PROTECTED_ROUTES = [
    [:get, '/api/v1/dashboards/executive'],
    [:get, '/api/v1/dashboards/branch_performance'],
    [:get, '/api/v1/dashboards/customers_top'],
    [:get, '/api/v1/dashboards/customer_profile?cif_id=1'],
    [:get, '/api/v1/dashboards/financial_summary'],
    [:get, '/api/v1/dashboards/risk_summary'],
    [:get, '/api/v1/dashboards/kpi_summary'],
    [:get, '/api/v1/dashboards/employer_summary'],
    [:get, '/api/v1/dashboards/employee_detail?entry_user=u1'],
    [:get, '/api/v1/dashboards/demographics'],
    [:get, '/api/v1/filters/values'],
    [:get, '/api/v1/filters/branches'],
    [:get, '/api/v1/production/catalog'],
    [:get, '/api/v1/production/explorer'],
    [:get, '/api/v1/production/deposits'],
    [:get, '/api/v1/production/htd_detail'],
    [:get, '/api/v1/users']
  ].freeze

  PUBLIC_ROUTES = [
    [:post, '/api/v1/auth/signin']
  ].freeze

  PROTECTED_ROUTES.each do |verb, path|
    it "#{verb.to_s.upcase} #{path} returns 401 without a token" do
      send(verb, path)
      expect(response).to have_http_status(:unauthorized),
        "Expected #{verb.to_s.upcase} #{path} to require auth (got #{response.status}). " \
        'If this route should be public, add it to PUBLIC_ROUTES; otherwise fix the controller.'
    end
  end
end
