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
    it 'emits IN clause for tran_branch filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_branch: ['001', '002'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_branch IN ('001','002')")
    end

    it 'emits IN clause for tran_cluster filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_cluster: ['north'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_cluster IN ('north')")
    end

    it 'emits IN clause for tran_province filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_province: ['Bagmati'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_province IN ('Bagmati')")
    end
  end

end
