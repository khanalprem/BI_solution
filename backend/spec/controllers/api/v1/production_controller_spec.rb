require 'rails_helper'

RSpec.describe Api::V1::ProductionController, type: :request do
  before do
    user = User.new(id: 1, email: 'tester@example.com', role: 'admin', is_active: true)
    allow(User).to receive_message_chain(:active, :find_by).and_return(user)
    allow_any_instance_of(ApplicationController)
      .to receive(:decode_jwt).and_return('user_id' => 1)
  end

  let(:auth_headers) { { 'Authorization' => 'Bearer fake-token-for-test' } }

  describe 'GET /api/v1/production/explorer' do
    # Bug 1: an empty `measures` param previously fell back to 'total_amount',
    # which silently injected an Amount column when the user picked no measure.
    # The controller must now pass `nil`/`[]` straight through to the service.
    it 'does not inject a default measure when the measures param is empty' do
      captured = nil
      allow_any_instance_of(ProductionDataService).to receive(:tran_summary_explorer) do |_svc, **kwargs|
        captured = kwargs
        { rows: [], columns: kwargs[:dimensions], total_rows: 0, page: 1, page_size: 10,
          dimensions: kwargs[:dimensions], measures: [], time_comparisons: [],
          empty_periods: [], sql_preview: {} }
      end

      get '/api/v1/production/explorer',
        params: { dimensions: 'gam_province', measures: '' },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(Array(captured[:measures])).to be_empty
    end

    it 'does not inject a default measure when the measures param is omitted entirely' do
      captured = nil
      allow_any_instance_of(ProductionDataService).to receive(:tran_summary_explorer) do |_svc, **kwargs|
        captured = kwargs
        { rows: [], columns: kwargs[:dimensions], total_rows: 0, page: 1, page_size: 10,
          dimensions: kwargs[:dimensions], measures: [], time_comparisons: [],
          empty_periods: [], sql_preview: {} }
      end

      get '/api/v1/production/explorer',
        params: { dimensions: 'gam_province' },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(Array(captured[:measures])).to be_empty
    end

    it 'forwards the explicit measures param unchanged' do
      captured = nil
      allow_any_instance_of(ProductionDataService).to receive(:tran_summary_explorer) do |_svc, **kwargs|
        captured = kwargs
        { rows: [], columns: kwargs[:dimensions], total_rows: 0, page: 1, page_size: 10,
          dimensions: kwargs[:dimensions], measures: kwargs[:measures], time_comparisons: [],
          empty_periods: [], sql_preview: {} }
      end

      get '/api/v1/production/explorer',
        params: { dimensions: 'gam_province', measures: 'tran_amt' },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(Array(captured[:measures])).to eq(['tran_amt'])
    end

    # Measure-only mode: dimensions empty + measures present should NOT silently inject
    # gam_branch — the service produces "SELECT <agg>" for a single scalar row.
    it 'does not inject a default dimension when measures are present and dimensions are empty' do
      captured = nil
      allow_any_instance_of(ProductionDataService).to receive(:tran_summary_explorer) do |_svc, **kwargs|
        captured = kwargs
        { rows: [{ 'tran_amt' => 5_000_000 }], columns: ['tran_amt'], total_rows: 1, page: 1, page_size: 10,
          dimensions: [], measures: ['tran_amt'], time_comparisons: [],
          empty_periods: [], sql_preview: {} }
      end

      get '/api/v1/production/explorer',
        params: { dimensions: '', measures: 'tran_amt' },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(Array(captured[:dimensions])).to be_empty
      expect(Array(captured[:measures])).to eq(['tran_amt'])
    end

    # Both empty is still a no-op-ish call that must not crash; falls back to gam_branch
    # so legacy callers (and direct API consumers) get a sensible default.
    it 'falls back to gam_branch when both dimensions and measures are empty' do
      captured = nil
      allow_any_instance_of(ProductionDataService).to receive(:tran_summary_explorer) do |_svc, **kwargs|
        captured = kwargs
        { rows: [], columns: ['gam_branch'], total_rows: 0, page: 1, page_size: 10,
          dimensions: ['gam_branch'], measures: [], time_comparisons: [],
          empty_periods: [], sql_preview: {} }
      end

      get '/api/v1/production/explorer',
        params: { dimensions: '', measures: '' },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(Array(captured[:dimensions])).to eq(['gam_branch'])
    end
  end
end
