# spec/services/production_data_service_spec.rb
#
# Tests for ProductionDataService pure helper methods.
# Run with: cd backend && bundle exec rspec spec/services/production_data_service_spec.rb
#
# Golden Rule: run `bundle exec rspec` BEFORE making any backend fix.
# Add a test here when you add/change any method in ProductionDataService.

require 'rails_helper'
require 'date'

RSpec.describe ProductionDataService, type: :service do

  # ── Instantiate service (connection is lazy — won't hit DB for unit tests) ──
  let(:service) { described_class.new(connection: nil) }

  # ─────────────────────────────────────────────────────────────────────────────
  # MEASURES hash — canonical data-dictionary keys
  # ─────────────────────────────────────────────────────────────────────────────
  describe 'MEASURES constant' do
    let(:canonical_keys) do
      %w[tran_amt tran_count signed_tranamt cr_amt cr_count dr_amt dr_count tran_acct_count tran_maxdate]
    end

    it 'includes all 9 canonical data-dictionary measure keys' do
      canonical_keys.each do |key|
        expect(described_class::MEASURES).to have_key(key), "MEASURES missing canonical key: #{key}"
      end
    end

    it 'includes legacy aliases for backwards compatibility' do
      legacy = %w[total_amount transaction_count unique_accounts unique_customers
                  credit_amount debit_amount net_flow]
      legacy.each do |key|
        expect(described_class::MEASURES).to have_key(key), "Legacy alias missing: #{key}"
      end
    end

    it 'every measure has select_sql and order_sql' do
      described_class::MEASURES.each do |key, meta|
        expect(meta[:select_sql]).to be_present, "#{key} missing select_sql"
        expect(meta[:order_sql]).to be_present,  "#{key} missing order_sql"
      end
    end

    it 'select_sql aliases match the measure key for canonical keys' do
      canonical_keys.each do |key|
        sql = described_class::MEASURES[key][:select_sql]
        expect(sql).to end_with(" AS #{key}").or(end_with(" #{key}")),
          "#{key} select_sql should alias result as '#{key}', got: #{sql}"
      end
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # DIMENSIONS hash
  # ─────────────────────────────────────────────────────────────────────────────
  describe 'DIMENSIONS constant' do
    it 'includes tran_date_bal as EAB dimension (not a measure)' do
      expect(described_class::DIMENSIONS).to have_key('tran_date_bal')
      expect(described_class::DIMENSIONS['tran_date_bal'][:eab_required]).to be true
      expect(described_class::DIMENSIONS['tran_date_bal'][:outer_join_field]).to be true
    end

    it 'every dimension has a sql key' do
      described_class::DIMENSIONS.each do |key, meta|
        expect(meta[:sql]).to be_present, "Dimension #{key} missing :sql"
      end
    end

    it 'does not include tran_date_bal as a MEASURE (it is a dimension only)' do
      expect(described_class::MEASURES).not_to have_key('tran_date_bal')
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # period_stamp_date — natural date label for comparison column headers
  # ─────────────────────────────────────────────────────────────────────────────
  describe '#period_stamp_date' do
    let(:ref) { Date.new(2024, 2, 15) } # 2024-02-15

    it 'thismonth → YYYY-MM' do
      expect(service.send(:period_stamp_date, period: 'thismonth', reference_date: ref)).to eq('2024-02')
    end

    it 'thisyear → YYYY' do
      expect(service.send(:period_stamp_date, period: 'thisyear', reference_date: ref)).to eq('2024')
    end

    it 'prevdate → day before reference' do
      expect(service.send(:period_stamp_date, period: 'prevdate', reference_date: ref)).to eq('2024-02-14')
    end

    it 'prevmonth → YYYY-MM of previous calendar month' do
      expect(service.send(:period_stamp_date, period: 'prevmonth', reference_date: ref)).to eq('2024-01')
    end

    it 'prevyear → previous year as YYYY' do
      expect(service.send(:period_stamp_date, period: 'prevyear', reference_date: ref)).to eq('2023')
    end

    it 'prevmonthmtd → YYYY-MM of previous month' do
      expect(service.send(:period_stamp_date, period: 'prevmonthmtd', reference_date: ref)).to eq('2024-01')
    end

    it 'prevyearytd → previous year as YYYY' do
      expect(service.send(:period_stamp_date, period: 'prevyearytd', reference_date: ref)).to eq('2023')
    end

    it 'prevmonthsamedate → same day in previous month' do
      expect(service.send(:period_stamp_date, period: 'prevmonthsamedate', reference_date: ref)).to eq('2024-01-15')
    end

    it 'prevyearsamedate → same day in previous year' do
      expect(service.send(:period_stamp_date, period: 'prevyearsamedate', reference_date: ref)).to eq('2023-02-15')
    end

    it 'handles January → December roll-back for prevmonth' do
      jan_ref = Date.new(2024, 1, 15)
      expect(service.send(:period_stamp_date, period: 'prevmonth', reference_date: jan_ref)).to eq('2023-12')
    end

    it 'falls back to reference date string for unknown period key' do
      expect(service.send(:period_stamp_date, period: 'unknown', reference_date: ref)).to eq('2024-02-15')
    end

    it 'accepts a string reference_date as well as a Date object' do
      expect(service.send(:period_stamp_date, period: 'thismonth', reference_date: '2024-02-15')).to eq('2024-02')
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # PERIOD_COMPARISONS — all 9 periods must be present
  # ─────────────────────────────────────────────────────────────────────────────
  describe 'PERIOD_COMPARISONS constant' do
    let(:expected_periods) do
      %w[prevdate thismonth thisyear prevmonth prevyear
         prevmonthmtd prevyearytd prevmonthsamedate prevyearsamedate]
    end

    it 'defines all 9 comparison period keys' do
      expected_periods.each do |period|
        expect(described_class::PERIOD_COMPARISONS).to have_key(period),
          "PERIOD_COMPARISONS missing period: #{period}"
      end
    end

    it 'every period has a label' do
      described_class::PERIOD_COMPARISONS.each do |key, meta|
        expect(meta[:label]).to be_present, "Period #{key} missing :label"
      end
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # static_lookup — procedure-backed filter dropdown source
  # ─────────────────────────────────────────────────────────────────────────────
  describe '#static_lookup' do
    it 'calls the procedure and returns name/value rows' do
      connection = double('connection')
      allow(service).to receive(:with_connection) do |&block|
        service.instance_variable_set(:@connection, connection)
        block.call
      end
      allow(connection).to receive(:quote).with('branch').and_return("'branch'")
      expect(connection).to receive(:execute).with("CALL public.get_static_data('branch')")
      result_double = double('result', to_a: [{ 'name' => 'Kathmandu Main', 'value' => '001' }])
      expect(connection).to receive(:exec_query)
        .with('SELECT name, value FROM static_data')
        .and_return(result_double)

      expect(service.static_lookup('branch')).to eq([{ 'name' => 'Kathmandu Main', 'value' => '001' }])
    end

    it 'raises ArgumentError for unsupported type' do
      expect { service.static_lookup('bogus') }.to raise_error(ArgumentError, /Unsupported lookup type/)
    end

    it 'accepts the newly-added user/acctnum/acid/cifid types' do
      %w[acctnum acid cifid user].each do |type|
        expect(described_class::LOOKUP_TYPES).to include(type)
      end
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # explorer_where_clause — TRAN-side categorical filter support
  # ─────────────────────────────────────────────────────────────────────────────
  describe '#explorer_where_clause' do
    # Uses a real AR connection so @connection.quote works; the method itself
    # only constructs a string (no procedure call, no DB round-trip).
    let(:service_with_conn) { described_class.new(connection: ActiveRecord::Base.connection) }

    it 'emits IN clause for multi-value tran_branch filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_branch: ['001', '002'] })
      expect(result).to include("tran_branch IN ('001', '002')")
    end

    it 'emits = clause for single-value tran_cluster filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_cluster: ['north'] })
      expect(result).to include("tran_cluster = 'north'")
    end

    it 'emits = clause for single-value tran_province filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_province: ['Bagmati'] })
      expect(result).to include("tran_province = 'Bagmati'")
    end

    it 'emits IN clause for multi-value schm_type filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { schm_type: ['A', 'B'] })
      expect(result).to include("schm_type IN ('A', 'B')")
    end

    it 'emits = clause for single-value schm_sub_type filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { schm_sub_type: ['W'] })
      expect(result).to include("schm_sub_type = 'W'")
    end

    it 'emits IN clause for multi-value tran_sub_type filter' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_sub_type: ['P', 'I'] })
      expect(result).to include("tran_sub_type IN ('P', 'I')")
    end

    # The where_clause is built strictly from user filter fields — the TopBar
    # period selector no longer auto-injects a global tran_date BETWEEN.
    it 'returns WHERE 1=1 when filters are empty' do
      result = service_with_conn.send(:explorer_where_clause, filters: {})
      expect(result).to eq('WHERE 1=1 ')
    end

    it 'returns WHERE 1=1 when filters contain only blank/nil values' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_branch: [], cif_id: nil, acct_name: '', min_amount: nil })
      expect(result).to eq('WHERE 1=1 ')
    end

    it 'does not inject a global tran_date BETWEEN even when other filters are set' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_branch: ['001'] })
      expect(result).to include("tran_branch = '001'")
      expect(result).not_to include('tran_date BETWEEN')
    end

    it 'emits an explicit tran_date BETWEEN when the user populates the tran_date filter range' do
      result = service_with_conn.send(:explorer_where_clause,
        filters: { tran_date_from: '2024-02-01', tran_date_to: '2024-02-29' })
      expect(result).to include("tran_date BETWEEN '2024-02-01' AND '2024-02-29'")
    end
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # default_orderby — alias-form so the expansion step doesn't double-wrap aggregates
  # ─────────────────────────────────────────────────────────────────────────────
  describe 'default_orderby (Bug 2 — nested aggregate)' do
    # When the caller sends an empty orderby_clause, the service builds a default.
    # That default is then run through an alias→aggregate expansion (so SELECT-list
    # aliases resolve inside ROW_NUMBER() OVER(ORDER BY ...) where Postgres won't).
    # If the default already contained the aggregate form, the expansion would
    # double-wrap into SUM(SUM(tran_amt)) — Postgres rejects that with
    # "aggregate function calls cannot be nested". This test pins the alias form.
    it 'uses the measure ALIAS, not the SUM(...) aggregate, in the default ORDER BY' do
      svc = described_class.new(connection: ActiveRecord::Base.connection)
      stub_proc_call!(svc)
      svc.tran_summary_explorer(
        start_date: Date.new(2024, 1, 1),
        end_date:   Date.new(2024, 1, 31),
        dimensions: ['gam_province'],
        measures:   ['tran_amt'],
        filters:    {},
        orderby_clause: '',
        page: 1, page_size: 10,
      )
      orderby = $captured_proc_args[:orderby_clause]
      expect(orderby).not_to match(/SUM\s*\(\s*SUM\s*\(/i),
        "ORDER BY contained nested SUM(SUM(...)): #{orderby.inspect}"
      expect(orderby).to include('SUM(tran_amt)')
    end
  end

  # Helper: stub the bits of #tran_summary_explorer that hit the real DB so we can
  # assert on the SQL it would have built without actually running the procedure.
  def stub_proc_call!(svc)
    fake_conn = ActiveRecord::Base.connection
    allow(fake_conn).to receive(:execute).and_wrap_original do |orig, sql, *rest|
      if sql.is_a?(String) && sql.include?('CALL public.get_tran_summary')
        $captured_proc_args = {
          orderby_clause: sql[/orderby_clause\s*=>\s*'([^']*)'/, 1].to_s,
        }
        nil
      elsif sql.is_a?(String) && sql.start_with?('DROP TABLE')
        nil
      else
        orig.call(sql, *rest)
      end
    end
    allow(fake_conn).to receive(:exec_query).and_return(double('result', to_a: []))
    allow(svc).to receive(:with_connection).and_yield
    svc.instance_variable_set(:@connection, fake_conn)
  end

  # ─────────────────────────────────────────────────────────────────────────────
  # DIMENSIONS additions — scheme/tran subtype dims for pivot
  # ─────────────────────────────────────────────────────────────────────────────
  describe 'scheme and tran subtype dimensions' do
    %w[schm_type schm_sub_type tran_sub_type].each do |key|
      it "registers #{key} as an inner-join dimension" do
        meta = described_class::DIMENSIONS[key]
        expect(meta).not_to be_nil, "DIMENSIONS missing #{key}"
        expect(meta[:sql]).to eq(key)
        expect(meta[:eab_required]).to be_falsey
        expect(meta[:gam_required]).to be_falsey
        expect(meta[:outer_join_field]).to be_falsey
      end
    end
  end

end
