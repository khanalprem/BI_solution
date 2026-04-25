require 'rails_helper'

RSpec.describe Api::V1::FiltersController, type: :request do
  # SECURITY (C-1, fixed 2026-04-25): every API endpoint now requires auth.
  # Stubs current_user so the test focuses on the controller's payload shape
  # without needing a full User factory + JWT. The auth gate itself is
  # exercised in api_v1_auth_gate_spec.rb.
  before do
    user = User.new(id: 1, email: 'tester@example.com', role: 'admin', is_active: true)
    allow(User).to receive_message_chain(:active, :find_by).and_return(user)
    allow_any_instance_of(ApplicationController)
      .to receive(:decode_jwt).and_return('user_id' => 1)
  end

  let(:auth_headers) { { 'Authorization' => 'Bearer fake-token-for-test' } }

  describe 'GET /api/v1/filters/values' do
    before do
      allow_any_instance_of(ProductionDataService)
        .to receive(:static_lookup) do |_svc, type|
          [{ 'name' => "#{type}-Name", 'value' => "#{type}-Value" }]
        end
    end

    it 'returns procedure-backed dropdown arrays' do
      get '/api/v1/filters/values', headers: auth_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expected_keys = %w[branches clusters provinces gl_sub_head_codes products
                         services merchants acct_nums acids cif_ids users]
      expect(body.keys).to match_array(expected_keys)

      body.each_value do |arr|
        expect(arr).to be_an(Array)
        expect(arr.first).to match('name' => kind_of(String), 'value' => kind_of(String))
      end
    end

    it 'does not include removed keys' do
      get '/api/v1/filters/values', headers: auth_headers
      body = JSON.parse(response.body)
      removed = %w[tran_sources tran_types part_tran_types solids entry_users vfd_users]
      removed.each { |k| expect(body).not_to have_key(k) }
    end
  end
end
