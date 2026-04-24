require 'rails_helper'

RSpec.describe Api::V1::FiltersController, type: :request do
  describe 'GET /api/v1/filters/values' do
    before do
      allow_any_instance_of(ProductionDataService)
        .to receive(:static_lookup) do |_svc, type|
          [{ 'name' => "#{type}-Name", 'value' => "#{type}-Value" }]
        end
    end

    it 'returns procedure-backed dropdown arrays' do
      get '/api/v1/filters/values'
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
      get '/api/v1/filters/values'
      body = JSON.parse(response.body)
      removed = %w[tran_sources tran_types part_tran_types solids entry_users vfd_users]
      removed.each { |k| expect(body).not_to have_key(k) }
    end
  end
end
