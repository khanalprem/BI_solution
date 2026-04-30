class ProductionDataService
  # All 19 production tables in the nifi database (public schema)
  TABLES = {
    'tran_summary' => {
      label: 'Transaction Summary',
      description: 'Primary partitioned fact table (164K rows). Partitions: tran_summary_2021–2025.',
      category: 'fact'
    },
    'gam' => {
      label: 'General Account Master',
      description: 'Account master details, balances, and scheme types (50,003 rows).',
      category: 'master'
    },
    'htd' => {
      label: 'Historical Transaction Detail',
      description: 'Raw ledger-level transaction history (20M+ rows). Always filter by tran_date.',
      category: 'fact'
    },
    'eab' => {
      label: 'End-of-Day Balance',
      description: 'Balance snapshots by ACID and effective date range (150,000 rows).',
      category: 'fact'
    },
    'dates' => {
      label: 'Date Dimension',
      description: 'Calendar, month, quarter, and year attributes (7,306 rows).',
      category: 'dimension'
    },
    'branch' => {
      label: 'Branch Master',
      description: 'Primary branch metadata keyed by SOL ID (100 rows).',
      category: 'dimension'
    },
    'branch_cdc' => {
      label: 'Branch CDC Replica',
      description: 'Change-data-capture copy of branch metadata (100 rows).',
      category: 'dimension'
    },
    'cluster' => {
      label: 'Cluster',
      description: 'Branch cluster hierarchy (10 rows).',
      category: 'dimension'
    },
    'province' => {
      label: 'Province',
      description: 'Nepal province lookup — "province 1"–"province 7" (7 rows).',
      category: 'dimension'
    },
    'gsh' => {
      label: 'GL Sub Head',
      description: 'GL sub-head descriptions and parent GL codes (101 rows).',
      category: 'dimension'
    },
    'data_dictionary' => {
      label: 'Data Dictionary',
      description: 'Dynamic query metadata and stored procedure references (98 rows).',
      category: 'metadata'
    },
    'user_master' => {
      label: 'User Master',
      description: 'Production user list used by entry and verify flows (104 rows).',
      category: 'security'
    },
    'user_branch_cluster' => {
      label: 'User Branch Cluster',
      description: 'Maps users to allowed branch and cluster scopes (107 rows).',
      category: 'security'
    },
    'merchant' => {
      label: 'Merchant',
      description: 'Merchant lookup values (1 row).',
      category: 'lookup'
    },
    'product' => {
      label: 'Product',
      description: 'Product lookup values (1 row).',
      category: 'lookup'
    },
    'service' => {
      label: 'Service',
      description: 'Service lookup values (1 row).',
      category: 'lookup'
    },
    'tran_summary_2021' => {
      label: 'Tran Summary 2021',
      description: 'Yearly partition of tran_summary for 2021.',
      category: 'partition'
    },
    'tran_summary_2022' => {
      label: 'Tran Summary 2022',
      description: 'Yearly partition of tran_summary for 2022.',
      category: 'partition'
    },
    'tran_summary_2023' => {
      label: 'Tran Summary 2023',
      description: 'Yearly partition of tran_summary for 2023.',
      category: 'partition'
    },
    'tran_summary_2024' => {
      label: 'Tran Summary 2024',
      description: 'Yearly partition of tran_summary for 2024.',
      category: 'partition'
    },
    'tran_summary_2025' => {
      label: 'Tran Summary 2025',
      description: 'Yearly partition of tran_summary for 2025.',
      category: 'partition'
    }
  }.freeze

  LOOKUP_TYPES = %w[branch cluster gsh merchant product province service acctnum acid cifid user].freeze

  PROCEDURES = {
    'get_static_data' => 'Production lookup procedure used for static dimensions.',
    'get_tran_summary' => 'Production analytics procedure used for grouped BI queries.'
  }.freeze

  DIMENSIONS = {
    # ── Account / customer dimensions ─────────────────────────────────────────
    'gam_branch'       => { label: 'GAM Branch',        sql: 'gam_branch' },
    'gam_province'     => { label: 'GAM Province',       sql: 'gam_province' },
    'gam_cluster'      => { label: 'GAM Cluster',        sql: 'gam_cluster' },
    'gam_solid'        => { label: 'Account SOL ID',     sql: 'gam_solid' },
    'acct_num'         => { label: 'ACCT Num',           sql: 'acct_num' },
    'acct_name'        => { label: 'ACCT Name',          sql: 'acct_name' },
    'acid'             => { label: 'ACID',               sql: 'acid' },
    'cif_id'           => { label: 'CIF Id',             sql: 'cif_id' },
    # ── Transaction dimensions ────────────────────────────────────────────────
    'tran_source'      => { label: 'TRAN Source',        sql: 'tran_source' },
    'tran_branch'      => { label: 'TRAN Branch',        sql: 'tran_branch' },
    'tran_cluster'     => { label: 'TRAN Cluster',       sql: 'tran_cluster' },
    'tran_province'    => { label: 'TRAN Province',      sql: 'tran_province' },
    'tran_type'        => { label: 'TRAN Type',          sql: 'tran_type' },
    'tran_sub_type'    => { label: 'TRAN Subtype',       sql: 'tran_sub_type' },
    'part_tran_type'   => { label: 'PART Tran Type',     sql: 'part_tran_type' },
    'gl_sub_head_code' => { label: 'GL Sub Head',        sql: 'gl_sub_head_code' },
    'product'          => { label: 'Product',            sql: 'product' },
    'service'          => { label: 'Service',            sql: 'service' },
    'merchant'         => { label: 'Merchant',           sql: 'merchant' },
    'schm_type'        => { label: 'Scheme Type',        sql: 'schm_type' },
    'schm_sub_type'    => { label: 'Scheme Subtype',     sql: 'schm_sub_type' },
    # ── User dimensions ───────────────────────────────────────────────────────
    'entry_user'       => { label: 'ENTRY User',         sql: 'entry_user' },
    'vfd_user'         => { label: 'VFD User',           sql: 'vfd_user' },
    # ── Date dimensions ───────────────────────────────────────────────────────
    'tran_date'        => { label: 'Tran Date',          sql: 'tran_date' },
    'year_month'       => { label: 'Year Month',         sql: 'year_month' },
    'year_quarter'     => { label: 'Year Quarter',       sql: 'year_quarter' },
    'year'             => { label: 'Year',               sql: 'year' },
    # ── EAB outer-join dimension ──────────────────────────────────────────────
    # tran_date_bal comes from the eab table via the outer LEFT JOIN.
    # outer_join_field: true means it cannot be in the inner GROUP BY; it is injected
    # into select_outer so the column is available in the final result set.
    'tran_date_bal'    => { label: 'TRAN Date Balance',  sql: 'e.tran_date_bal', eab_required: true, outer_join_field: true },
    # eod_balance lives directly in tran_summary (confirmed via information_schema).
    # No GAM join required — treated as a regular inner dimension.
    'eod_balance'      => { label: 'GAM Balance',        sql: 'eod_balance' },
    # schm_code lives only on `gam` (account scheme code: saving / minor / woman /
    # fixed / current). Pulled in via the GAM LEFT JOIN — same outer_join_field
    # pattern as tran_date_bal, but routed through the gam join (not eab). The
    # frontend gates this dim on an account-identifier prerequisite so the GAM
    # join row is unique per account.
    'schm_code'        => { label: 'Scheme Code',        sql: 'g.schm_code',     gam_required: true, outer_join_field: true }
  }.freeze

  # Dimensions available to the Deposit Portfolio report (driven by `public.get_deposit`).
  # The procedure joins gam g → eab e → dates d → branch b → province p → cluster c,
  # so every dim's sql references one of those aliases. date_join is the ON-clause
  # fragment that restricts `dates` rows to the matching period-end row (empty for
  # daily tran_date — the caller's date_where already pins a single day there).
  DEPOSIT_DIMENSIONS = {
    'gam_branch'   => { label: 'GAM Branch',   sql: 'b.branch_name' },
    'gam_province' => { label: 'GAM Province', sql: 'p.name' },
    'gam_cluster'  => { label: 'GAM Cluster',  sql: 'c.cluster_name' },
    'acct_num'     => { label: 'ACCT Num',     sql: 'g.acct_num' },
    'acct_name'    => { label: 'ACCT Name',    sql: 'g.acct_name' },
    'acid'         => { label: 'ACID',         sql: 'g.acid' },
    'cif_id'       => { label: 'CIF Id',       sql: 'g.cif_id' },
    'schm_code'    => { label: 'Scheme Code',  sql: 'g.schm_code' },
    'tran_date'    => { label: 'Date',         sql: 'd.date',         date_join: '' },
    'year_month'   => { label: 'Year Month',   sql: 'd.year_month',   date_join: 'AND d.date = d.month_enddate' },
    'year_quarter' => { label: 'Year Quarter', sql: 'd.year_quarter', date_join: 'AND d.date = d.quarter_enddate' },
    'year'         => { label: 'Year',         sql: 'd.year',         date_join: 'AND d.date = d.year_enddate' }
  }.freeze

  # Priority when multiple date dims are selected — finest grain wins.
  DEPOSIT_DATE_DIM_PRIORITY = %w[tran_date year_month year_quarter year].freeze

  # When one of these coarse date dimensions is in the GROUP BY, we inject the
  # matching period-end column into the inner SELECT + GROUP BY so the EAB outer
  # join can reference tb2.<enddate> as its as-of date. This makes the balance
  # snapshot align with each row's own period (e.g. a monthly pivot row shows the
  # balance as of that month's last day) instead of a fixed global end date.
  #
  # Priority (finest → coarsest): month wins over quarter wins over year.
  # The enddate columns themselves are stripped from the response rows before
  # returning to the frontend — they are an internal implementation detail.
  DATE_DIM_ENDDATE_MAP = {
    'year_month'   => 'month_enddate',
    'year_quarter' => 'quarter_enddate',
    'year'         => 'year_enddate'
  }.freeze
  DATE_DIM_ENDDATE_PRIORITY = %w[year_month year_quarter year].freeze
  SUPPRESSED_OUTER_COLUMNS  = DATE_DIM_ENDDATE_MAP.values.freeze

  MEASURES = {
    # ── Data-dictionary measures (canonical keys, match tran_summary columns) ──
    'tran_amt' => {
      label: 'TRAN Amount',
      select_sql: 'SUM(tran_amt) AS tran_amt',
      order_sql:  'SUM(tran_amt) DESC'
    },
    'tran_count' => {
      label: 'TRAN Count',
      select_sql: 'SUM(tran_count) AS tran_count',
      order_sql:  'SUM(tran_count) DESC'
    },
    'signed_tranamt' => {
      label: 'Signed TRAN Amount',
      select_sql: 'SUM(signed_tranamt) AS signed_tranamt',
      order_sql:  'SUM(signed_tranamt) DESC'
    },
    'cr_amt' => {
      label: 'CR Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) AS cr_amt",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) DESC"
    },
    'cr_count' => {
      label: 'CR Count',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_count ELSE 0 END) AS cr_count",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_count ELSE 0 END) DESC"
    },
    'dr_amt' => {
      label: 'DR Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) AS dr_amt",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) DESC"
    },
    'dr_count' => {
      label: 'DR Count',
      select_sql: "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_count ELSE 0 END) AS dr_count",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_count ELSE 0 END) DESC"
    },
    'tran_acct_count' => {
      label: 'TRAN Acct Count',
      select_sql: 'COUNT(DISTINCT acct_num) AS tran_acct_count',
      order_sql:  'COUNT(DISTINCT acct_num) DESC'
    },
    'tran_maxdate' => {
      label: 'TRAN Max Date',
      select_sql: 'MAX(tran_date) AS tran_maxdate',
      order_sql:  'MAX(tran_date) DESC'
    },
    # RFM (Recency-Frequency-Monetary) composite score — higher is better.
    #   Frequency: SUM(tran_count) × 0.001
    #   Monetary:  SUM(tran_amt)   × 0.0001
    #   Recency:   (CURRENT_DATE − MAX(tran_date)) × −0.001  (more recent → less negative)
    # Formula sourced from `data dictionary.xlsx`.
    # tran_date is cast to varchar(15) in the procedure's inner CTE, so MAX(tran_date) is text.
    # We cast back to date before subtracting from CURRENT_DATE, otherwise Postgres errors with
    # "operator does not exist: date - text".
    'rfm_score' => {
      label: 'RFM Score',
      select_sql: 'SUM(tran_count) * 0.001 + SUM(tran_amt) * 0.0001 + (CURRENT_DATE - MAX(tran_date)::date) * (-0.001) AS rfm_score',
      order_sql:  'SUM(tran_count) * 0.001 + SUM(tran_amt) * 0.0001 + (CURRENT_DATE - MAX(tran_date)::date) * (-0.001) DESC'
    },
    # ── Legacy aliases — kept for backwards compatibility ──────────────────────
    'total_amount' => {
      label: 'Total Amount',
      select_sql: 'SUM(tran_amt) AS total_amount',
      order_sql:  'SUM(tran_amt) DESC'
    },
    'transaction_count' => {
      label: 'Transaction Count',
      select_sql: 'SUM(tran_count) AS transaction_count',
      order_sql:  'SUM(tran_count) DESC'
    },
    'unique_accounts' => {
      label: 'Unique Accounts',
      select_sql: 'COUNT(DISTINCT acct_num) AS unique_accounts',
      order_sql:  'COUNT(DISTINCT acct_num) DESC'
    },
    'unique_customers' => {
      label: 'Unique Customers',
      select_sql: 'COUNT(DISTINCT cif_id) AS unique_customers',
      order_sql:  'COUNT(DISTINCT cif_id) DESC'
    },
    'credit_amount' => {
      label: 'Credit Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) AS credit_amount",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) DESC"
    },
    'debit_amount' => {
      label: 'Debit Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) AS debit_amount",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) DESC"
    },
    'net_flow' => {
      label: 'Net Flow',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE -tran_amt END) AS net_flow",
      order_sql:  "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE -tran_amt END) DESC"
    }
  }.freeze

  # Nine period-comparison windows accepted by get_tran_summary's *_where params.
  # Each key maps to the procedure parameter name and a human label.
  PERIOD_COMPARISONS = {
    'prevdate'          => { param: 'prevdate_where',          label: 'Previous Date',          description: '1 day before end date' },
    'thismonth'         => { param: 'thismonth_where',         label: 'This Month',             description: 'Full calendar month of the reference date' },
    'thisyear'          => { param: 'thisyear_where',          label: 'This Year',              description: 'Full calendar year of the reference date (Jan 1 → Dec 31)' },
    'prevmonth'         => { param: 'prevmonth_where',         label: 'Previous Month',         description: 'Full calendar month before current month' },
    'prevyear'          => { param: 'prevyear_where',          label: 'Previous Year',          description: 'Full calendar year before current year' },
    'prevmonthmtd'      => { param: 'prevmonthmtd_where',      label: 'Prev Month MTD',         description: 'Previous month day 1 → same day-of-month as end date' },
    'prevyearytd'       => { param: 'prevyearytd_where',       label: 'Prev Year YTD',          description: 'Previous year Jan 1 → same calendar date' },
    'prevmonthsamedate' => { param: 'prevmonthsamedate_where', label: 'Prev Month Same Date',   description: 'Same day in the previous calendar month' },
    'prevyearsamedate'  => { param: 'prevyearsamedate_where',  label: 'Prev Year Same Date',    description: 'Same day in the previous calendar year' }
  }.freeze

  # Standard measures that can be tagged with a period comparison.
  COMPARISON_TARGET_MEASURES = %w[
    tran_amt tran_count signed_tranamt
    cr_amt cr_count dr_amt dr_count
    tran_acct_count tran_maxdate
  ].freeze

  # (period, measure) pairs that don't make sense and are dropped from the
  # cross-product. tran_maxdate is a MAX(tran_date) — pairing it with prevdate
  # (a single prior day) would just return that day and tell the analyst nothing.
  EXCLUDED_COMPARISON_PAIRS = {
    'prevdate' => %w[tran_maxdate].freeze
  }.freeze

  # Flat keys sent from the frontend — each encodes (period, measure) and is used
  # both to resolve the *_where param to populate AND to gate which (period × measure)
  # comparison cells the pivot renders. Key format: "{period}__{measure}" (double
  # underscore separator avoids ambiguity with measure keys that contain underscores
  # like prev_month_mtd_tran_acct_count).
  #
  # Multiple keys for the same period collapse to a single *_where param at query
  # time; the per-measure granularity is enforced by the frontend's render filter.
  TIME_COMPARISON_FIELDS = PERIOD_COMPARISONS.each_with_object({}) do |(period_key, period_meta), acc|
    excluded = EXCLUDED_COMPARISON_PAIRS[period_key] || []
    COMPARISON_TARGET_MEASURES.each do |measure_key|
      next if excluded.include?(measure_key)
      key   = "#{period_key}__#{measure_key}"
      label = "#{period_meta[:label]} — #{MEASURES.fetch(measure_key)[:label]}"
      acc[key] = { period: period_key, metric: measure_key, label: label }
    end
  end.freeze

  # Legacy single-suffix keys kept so saved URLs from the previous (tran_amt /
  # tran_count only) implementation continue to resolve. Mapped to the canonical
  # double-underscore key on intake.
  LEGACY_TIME_COMPARISON_ALIASES = PERIOD_COMPARISONS.keys.each_with_object({}) do |period_key, acc|
    acc["#{period_key}_amt"]   = "#{period_key}__tran_amt"
    acc["#{period_key}_count"] = "#{period_key}__tran_count"
  end.freeze

  def initialize(connection: ActiveRecord::Base.connection)
    @connection = connection
  end

  def catalog
    summaries = table_summaries
    procedure_signatures = procedure_signatures_by_name

    {
      tables: TABLES.map do |table_name, meta|
        summary = summaries[table_name] || {}
        {
          table_name: table_name,
          label: meta[:label],
          description: meta[:description],
          category: meta[:category],
          estimated_rows: summary[:estimated_rows].to_i,
          column_count: summary[:column_count].to_i
        }
      end,
      procedures: PROCEDURES.map do |name, description|
        {
          name: name,
          description: description,
          signature: procedure_signatures[name]
        }
      end,
      lookup_types: LOOKUP_TYPES,
      dimension_options: DIMENSIONS.map { |key, meta| { value: key, label: meta[:label] } },
      measure_options: MEASURES.map { |key, meta| { value: key, label: meta[:label] } },
      period_comparison_options: PERIOD_COMPARISONS.map do |key, meta|
        { value: key, label: meta[:label], description: meta[:description] }
      end,
      time_comparison_field_options: TIME_COMPARISON_FIELDS.map do |key, meta|
        { value: key, label: meta[:label], period: meta[:period], metric: meta[:metric] }
      end
    }
  end

  def table_detail(table_name:, page: 1, page_size: 25)
    validate_table_name!(table_name)

    normalized_page = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, 100].min
    offset = (normalized_page - 1) * normalized_page_size
    quoted_table_name = @connection.quote_table_name(table_name)
    columns = column_metadata(table_name)
    order_column = preferred_order_column(columns.map { |column| column[:name] })

    sql = +"SELECT * FROM #{quoted_table_name}"
    sql << " ORDER BY #{@connection.quote_column_name(order_column)} DESC NULLS LAST" if order_column
    sql << " LIMIT #{normalized_page_size} OFFSET #{offset}"

    rows = @connection.exec_query(sql).to_a
    summary = table_summaries[table_name] || {}
    meta = TABLES.fetch(table_name)

    {
      table_name: table_name,
      label: meta[:label],
      description: meta[:description],
      category: meta[:category],
      estimated_rows: summary[:estimated_rows].to_i,
      columns: columns,
      rows: rows,
      page: normalized_page,
      page_size: normalized_page_size
    }
  end

  def lookup_preview(data_type:, limit: 100)
    type = data_type.to_s
    raise ArgumentError, "Unsupported lookup type: #{type}" unless LOOKUP_TYPES.include?(type)

    normalized_limit = [[limit.to_i, 1].max, 200].min

    with_connection do
      @connection.execute("CALL public.get_static_data(#{@connection.quote(type)})")
      rows = @connection.exec_query("SELECT * FROM static_data LIMIT #{normalized_limit}").to_a

      {
        data_type: type,
        rows: rows
      }
    end
  end

  # Fetch a name/value lookup list from the `get_static_data` procedure.
  # Returns [{ 'name' => ..., 'value' => ... }, ...]. Used by the shared
  # filter_values endpoint to populate UI dropdowns with canonical labels.
  def static_lookup(type)
    type = type.to_s
    raise ArgumentError, "Unsupported lookup type: #{type}" unless LOOKUP_TYPES.include?(type)

    with_connection do
      @connection.execute("CALL public.get_static_data(#{@connection.quote(type)})")
      rows = @connection.exec_query('SELECT name, value FROM static_data').to_a
      seen = {}
      rows.each do |r|
        value = r['value'].to_s.strip
        next if value.empty? || seen.key?(value)
        name = r['name'].to_s.strip
        seen[value] = { 'name' => name.empty? ? value : name, 'value' => value }
      end
      seen.values
    end
  end

  # Fetch raw HTD (ledger detail) rows for a pivot row drill-down.
  # Delegates to the `public.get_tran_detail(join_clause, page, page_size)` stored procedure,
  # which builds the HTD↔GAM↔EAB join, applies ROW_NUMBER() pagination, and drops results
  # into a TEMP TABLE `tran_detail` (also includes a `total_rows` column for pagination).
  HTD_DETAIL_COLUMNS = %w[cif_id acid acct_num acct_name tran_date tran_type part_tran_type tran_branch gl_sub_head_code entry_user vfd_user tran_amt opening_bal running_bal].freeze
  HTD_MAX_ROWS = 50

  # Maps tran_summary dimension keys → HTD/GAM column references (for the procedure's join_clause).
  HTD_DIM_MAP = {
    'acct_num'         => 'g.acct_num',
    'cif_id'           => 'g.cif_id',
    'gam_branch'       => 'g.sol_id',
    'gam_solid'        => 'g.sol_id',
    'gl_sub_head_code' => 'h.gl_sub_head_code',
    'part_tran_type'   => 'h.part_tran_type',
    'tran_type'        => 'h.tran_type',
    'tran_date'        => 'h.tran_date',
    'entry_user'       => 'h.entry_user_id',
    'vfd_user'         => 'h.vfd_user_id',
    'tran_branch'      => 'h.sol_id',
  }.freeze

  # Maps filter keys → HTD/GAM column references.
  HTD_FILTER_MAP = {
    branch:          'g.sol_id',
    solid:           'g.sol_id',
    gl_sub_head_code: 'h.gl_sub_head_code',
    part_tran_type:  'h.part_tran_type',
    entry_user:      'h.entry_user_id',
    vfd_user:        'h.vfd_user_id',
  }.freeze

  def htd_detail(start_date: nil, end_date: nil, filters:, row_dims: {}, page: 1, page_size: 50)
    normalized_page = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, HTD_MAX_ROWS].min

    # Build the boolean expression that the procedure appends after `on g.acid=h.acid and ...`
    # (no leading WHERE/AND — the procedure adds it).
    join_clause = build_htd_join_clause(start_date: start_date, end_date: end_date, filters: filters, row_dims: row_dims)

    with_connection do
      conn = @connection
      conn.execute('DROP TABLE IF EXISTS tran_detail')
      conn.execute(<<~SQL.squish)
        CALL public.get_tran_detail(
          #{conn.quote(join_clause)},
          #{normalized_page},
          #{normalized_page_size}
        )
      SQL

      raw_rows = conn.exec_query('SELECT * FROM tran_detail').to_a
      total_rows = raw_rows.first ? raw_rows.first['total_rows'].to_i : 0

      rows = raw_rows.map do |r|
        {
          'cif_id'           => r['cif_id'],
          'acid'             => r['acid'],
          'acct_num'         => r['acct_num'],
          'acct_name'        => r['acct_name'],
          'tran_date'        => r['tran_date'],
          'tran_type'        => r['tran_type'],
          'part_tran_type'   => r['part_tran_type'],
          'tran_branch'      => r['sol_id'],
          'gl_sub_head_code' => r['gl_sub_head_code'],
          'entry_user'       => r['entry_user_id'],
          'vfd_user'         => r['vfd_user_id'],
          'tran_amt'         => r['tran_amt'],
          'opening_bal'      => r['opening_bal'],
          'running_bal'      => r['running_bal']
        }
      end

      {
        columns: HTD_DETAIL_COLUMNS,
        rows: rows,
        total_rows: total_rows,
        page: normalized_page,
        page_size: normalized_page_size,
        sql_preview: {
          join_clause: join_clause,
          page: normalized_page,
          page_size: normalized_page_size
        }
      }
    end
  end

  private

  # Build the boolean expression passed to `public.get_tran_detail(join_clause, ...)`.
  # Only includes the clicked row's dimension values — the global date range and other
  # filters are intentionally NOT added, because the row already carries the specific
  # dimension values that scope the detail query. Keeping only row_dims produces a
  # minimal, predictable clause (e.g. "g.acct_num::text = '100011' AND h.tran_date::date = '2024-02-19'").
  #
  # Date handling: `tran_date` is a timestamp in HTD, so comparing `::text` to 'YYYY-MM-DD'
  # fails (it would need to match 'YYYY-MM-DD 00:00:00'). For date-valued dims, cast to `::date`.
  HTD_DATE_DIMS = %w[tran_date].freeze

  def build_htd_join_clause(start_date:, end_date:, filters:, row_dims:)
    conn = @connection
    clauses = []

    row_dims.each do |dim_key, dim_value|
      key = dim_key.to_s
      htd_col = HTD_DIM_MAP[key]
      next unless htd_col
      if HTD_DATE_DIMS.include?(key)
        clauses << "#{htd_col}::date = #{conn.quote(dim_value.to_s)}::date"
      else
        clauses << "#{htd_col}::text = #{conn.quote(dim_value.to_s)}"
      end
    end

    # Procedure appends this after `and`, so must be at least 1=1 when no filters.
    clauses.any? ? clauses.join(' AND ') : '1=1'
  end

  public

  def tran_summary_explorer(start_date: nil, end_date: nil, dimensions:, measures:, filters:, time_comparisons: [], partitionby_clause: '', orderby_clause: '', having_clause: '', page: 1, page_size: 10, disable_tiebreaker: false)
    # Fallback dates used for internal calculations (EAB join, period comparisons).
    # start_date / end_date may be nil when frontend sends no date params (ALL period before
    # filter-stats loads) — in that case we skip the tran_date WHERE clause but still need
    # valid dates for everything else.
    calc_end_date   = end_date   || Date.today
    calc_start_date = start_date || calc_end_date

    dimension_keys = Array(dimensions).filter_map do |d|
      key = d.to_s
      key if DIMENSIONS.key?(key)
    end

    measure_keys = Array(measures).filter_map do |measure|
      value = measure.to_s
      value if MEASURES.key?(value)
    end
    # Both empty would produce an unbounded "SELECT * FROM tran_summary" — fall back
    # to gam_branch as a sensible default. Otherwise either side may be empty:
    #   • Measure-less = "SELECT <dims> GROUP BY <dims>" (distinct combinations).
    #   • Dim-less     = "SELECT <aggs>" (single scalar row across the filter scope).
    dimension_keys = ['gam_branch'] if dimension_keys.empty? && measure_keys.empty?

    normalized_page = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, 100].min

    # Count active comparison periods early
    requested_periods_count = Array(time_comparisons).map(&:to_s).filter_map { |key|
      resolved = LEGACY_TIME_COMPARISON_ALIASES[key] || key
      meta = TIME_COMPARISON_FIELDS[resolved]
      meta[:period] if meta
    }.uniq.length
    has_comparisons = requested_periods_count > 0

    selected_measures = measure_keys.map { |key| MEASURES.fetch(key) }

    # Split dimensions into:
    #   inner_dim_keys — go into the inner subquery (GROUP BY inside the stored procedure)
    #   outer_dim_keys — come from the EAB outer join; cannot be in the inner GROUP BY,
    #                    so they are injected into select_outer instead.
    inner_dim_keys = dimension_keys.reject { |k| DIMENSIONS.fetch(k)[:outer_join_field] }
    outer_dim_keys = dimension_keys.select { |k| DIMENSIONS.fetch(k)[:outer_join_field] }

    dim_sqls    = inner_dim_keys.map { |k| DIMENSIONS.fetch(k).fetch(:sql) }
    dim_selects = inner_dim_keys.map { |k| "#{DIMENSIONS.fetch(k).fetch(:sql)} AS #{k}" }

    # Force outer join when any selected dimension requires it.
    # tran_date_bal → LEFT JOIN eab; eod_balance → LEFT JOIN gam.
    include_eab = dimension_keys.any? { |k| DIMENSIONS.fetch(k)[:eab_required] }
    include_gam = dimension_keys.any? { |k| DIMENSIONS.fetch(k)[:gam_required] }

    # Include acid in inner select/groupby whenever ANY outer join is needed, so the
    # outer query can join on acid.
    include_acid = include_eab || include_gam
    acid_select  = include_acid ? ', acid' : ''
    acid_groupby = include_acid ? ', acid' : ''

    # If the user selected a coarse date dim (year_month / year_quarter / year),
    # pull its matching *_enddate column through the inner query so the EAB join
    # can use it as the as-of reference date. Only the finest-grained selection
    # is materialised (month beats quarter beats year). Columns are stripped from
    # the response later — they are not meant to be shown in the report.
    active_enddate_dim = DATE_DIM_ENDDATE_PRIORITY.find { |k| inner_dim_keys.include?(k) }
    active_enddate_col = active_enddate_dim ? DATE_DIM_ENDDATE_MAP[active_enddate_dim] : nil
    enddate_select     = active_enddate_col ? ", #{active_enddate_col}" : ''
    enddate_groupby    = active_enddate_col ? ", #{active_enddate_col}" : ''

    measure_select_sql = selected_measures.map { |m| m[:select_sql] }.join(', ')

    # Build SELECT and GROUP BY as parts-lists — empty pieces (no dims / no acid /
    # no enddate / no measures) are dropped instead of leaving dangling commas.
    # Dim-less measure queries collapse to "SELECT <agg>" with an empty groupby_clause,
    # which the proc handles (it concatenates groupby_clause directly into the inner CTE).
    inner_parts = []
    inner_parts.concat(dim_selects)
    inner_parts << 'acid' if include_acid
    inner_parts << active_enddate_col if active_enddate_col
    inner_parts << measure_select_sql if selected_measures.any?
    select_inner = "SELECT #{inner_parts.join(', ')}"

    where_clause = explorer_where_clause(filters: filters)

    groupby_parts = []
    groupby_parts.concat(dim_sqls)
    groupby_parts << 'acid' if include_acid
    groupby_parts << active_enddate_col if active_enddate_col
    groupby_clause = groupby_parts.any? ? "GROUP BY #{groupby_parts.join(', ')}" : ''
    # HAVING is opt-in: caller builds the validated expression (see ProductionController#build_having_clause).
    # Pass empty string when absent so the procedure's placeholder remains harmless.
    having_clause  = having_clause.to_s.strip
    # ORDER BY fallback: use the first measure when any, else fall back to the first
    # dimension alias (so measure-less "select dims / group by dims" queries still
    # paginate deterministically). Use the measure's ALIAS form here (not its full
    # aggregate `order_sql`) — the expansion step below substitutes alias→aggregate
    # exactly once. Inlining the aggregate here would double-wrap into SUM(SUM(...)),
    # which Postgres rejects with "aggregate function calls cannot be nested".
    default_orderby = if selected_measures.any?
      "ORDER BY #{measure_keys.first} DESC"
    elsif inner_dim_keys.any?
      "ORDER BY #{inner_dim_keys.first} ASC"
    else
      ''
    end
    orderby_clause = orderby_clause.to_s.strip.presence || default_orderby
    # Expand measure aliases (e.g. "rfm_score") to their aggregate expression
    # (e.g. "SUM(tran_count)*0.001 + ..."). The stored procedure applies ORDER BY
    # inside a window function (ROW_NUMBER() OVER(ORDER BY ...)) in the SAME SELECT
    # list where the alias is defined — Postgres does NOT resolve SELECT-list aliases
    # in that position, so we must substitute the full expression. Only expand
    # measures the caller actually selected (they're guaranteed to be in the SELECT).
    if orderby_clause.present? && measure_keys.any?
      measure_keys.each do |key|
        agg = MEASURES.fetch(key).fetch(:order_sql).sub(/\s+(?:ASC|DESC)\s*\z/i, '')
        orderby_clause = orderby_clause.gsub(/\b#{Regexp.escape(key)}\b/, agg)
      end
    end
    # Strip outer_join_field dim keys (e.g. eod_balance, tran_date_bal) from the ORDER BY.
    # The procedure applies this clause inside ROW_NUMBER() OVER(...) in the inner CTE,
    # where outer-join columns are not yet available — they only resolve after the LEFT JOINs
    # at the outer SELECT level. Leaving them in produces "column does not exist" at runtime.
    if outer_dim_keys.any? && orderby_clause.present?
      stripped = orderby_clause.sub(/\AORDER BY\s+/i, '').split(',').map(&:strip).reject do |tok|
        outer_dim_keys.include?(tok.split(/\s+/).first.to_s)
      end
      orderby_clause = stripped.any? ? "ORDER BY #{stripped.join(', ')}" : default_orderby
    end
    # Add tiebreaker for deterministic pagination (prevents duplicate/missing rows on tied values).
    # Only add acct_num when it's actually in the GROUP BY (selected dimensions), otherwise
    # the tiebreaker would break grouped queries with a "must appear in GROUP BY" error.
    # Callers (e.g. /dashboard/segmentation) can opt out via disable_tiebreaker when they
    # want the ORDER BY to appear exactly as the user specified (no extra sort columns).
    has_acct_num_dim = inner_dim_keys.include?('acct_num')
    if !disable_tiebreaker && has_acct_num_dim && !orderby_clause.downcase.include?('acct_num')
      orderby_clause = "#{orderby_clause}, acct_num ASC"
    end

    # PARTITION BY: the procedure expects the FULL clause including the 'PARTITION BY' keyword.
    # Frontend sends '' (no pivot) or 'PARTITION BY field1, field2' (pivot mode).
    # Empty string = global ROW_NUMBER (standard pagination).
    # Non-empty = per-group ROW_NUMBER — the procedure uses it verbatim inside OVER(...).
    partitionby_clause = partitionby_clause.to_s.strip

    # Outer joins — concatenated and passed to the procedure as a single clause.
    # EAB: use >= eod_date AND < end_eod_date (end_eod_date is exclusive in production data)
    #   Main query: if a coarse date dim was selected, use that row's period-end column
    #               (tb2.month_enddate / quarter_enddate / year_enddate) as the as-of date,
    #               so every pivot row shows the balance at the end of ITS own period.
    #   Otherwise: fall back to the global filter end date (calc_end_date) — unchanged.
    #   Comparison query always uses calc_end_date because its GROUP BY excludes the date
    #   dim, so tb2 won't contain the *_enddate column.
    # GAM: simple join on acid — g.eod_balance is a static per-account value.
    quoted_end_date = @connection.quote(calc_end_date.to_s)
    eab_join_main = if include_eab
      reference = active_enddate_col ? "tb2.#{active_enddate_col}" : quoted_end_date
      "LEFT JOIN eab e ON e.acid = tb2.acid AND #{reference} >= e.eod_date::date AND #{reference} < e.end_eod_date::date"
    else
      ''
    end
    eab_join_comparison = if include_eab
      "LEFT JOIN eab e ON e.acid = tb2.acid AND #{quoted_end_date} >= e.eod_date::date AND #{quoted_end_date} < e.end_eod_date::date"
    else
      ''
    end
    gam_join = include_gam ? 'LEFT JOIN gam g ON g.acid = tb2.acid' : ''

    eab_join            = [eab_join_main, gam_join].reject(&:blank?).join(' ')
    comparison_eab_join = [eab_join_comparison, gam_join].reject(&:blank?).join(' ')

    # select_outer: always selects tb2.*, then appends any outer_join_field dimensions
    # (e.g. e.tran_date_bal AS tran_date_bal from the eab join).
    outer_dim_selects = outer_dim_keys.map { |k| "#{DIMENSIONS.fetch(k).fetch(:sql)} AS #{k}" }
    select_outer = if (include_eab || include_gam) && outer_dim_selects.any?
      "SELECT tb2.*, #{outer_dim_selects.join(', ')}"
    else
      'SELECT tb2.*'
    end

    # Primary date dimension drives period clause SQL.
    # First check selected GROUP BY dimensions, then fall back to whichever date filter is active,
    # then default to tran_date. This ensures that setting tran_date as a filter (not a dimension)
    # still produces correct SQL (e.g. BETWEEN clauses on tran_date, not year_month).
    period_dimension = dimension_keys.find { |k| %w[tran_date year_month year_quarter year].include?(k) }
    period_dimension ||= %w[tran_date year_month year_quarter year].find do |k|
      sym = k.to_sym
      filters[sym].present? || filters[:"#{k}_from"].present? || filters[:"#{k}_to"].present?
    end
    period_dimension ||= 'tran_date'

    # Resolve which period-comparison params to populate.
    # Multiple time_comparison keys (e.g. 'prevdate__tran_amt', 'prevdate__cr_amt')
    # sharing the same period collapse to a single *_where value.
    requested_periods = Array(time_comparisons).map(&:to_s).filter_map do |key|
      resolved = LEGACY_TIME_COMPARISON_ALIASES[key] || key
      meta = TIME_COMPARISON_FIELDS[resolved]
      meta[:period] if meta
    end.uniq

    # "THIS" periods use max of range (end_date) as reference.
    # "PREV" periods use min of range (start_date) as reference.
    # This ensures: "This Month" = month of latest date in analysis window,
    #               "Prev Date"  = day before the start of analysis window.
    this_periods = %w[thismonth thisyear].freeze
    ref_for_this = resolve_reference_date(filters: filters, end_date: calc_end_date, dimension_keys: dimension_keys)
    # For PREV periods, resolve the MIN (earliest) date from dimension filters or start_date.
    # This ensures: tran_date range 2024-02-02→2024-02-03 with global ALL period
    # correctly uses 2024-02-02 (not 2021-02-18 from ALL) as the PREV reference.
    ref_for_prev = resolve_min_reference_date(filters: filters, start_date: calc_start_date, dimension_keys: dimension_keys)

    period_wheres = PERIOD_COMPARISONS.each_with_object({}) do |(period_key, meta), acc|
      acc[meta[:param]] = if requested_periods.include?(period_key)
        ref = this_periods.include?(period_key) ? ref_for_this : ref_for_prev
        build_period_where(period: period_key, end_date: ref, filters: filters, dimension: period_dimension)
      else
        ''
      end
    end

    # CRITICAL: Use ActiveRecord::Base.connection directly.
    # The procedure creates a temp table `result` which is connection-scoped.
    conn = ActiveRecord::Base.connection

    # ── CALL 1: Main query — paginated by the procedure ──────────────────────
    empty_period_wheres = PERIOD_COMPARISONS.transform_values { '' }
    conn.execute('DROP TABLE IF EXISTS result')
    conn.execute(<<~SQL.squish)
      CALL public.get_tran_summary(
        select_outer => #{conn.quote(select_outer)},
        select_inner => #{conn.quote(select_inner)},
        where_clause => #{conn.quote(where_clause)},
        prevdate_where => '',
        thismonth_where => '',
        thisyear_where => '',
        prevmonth_where => '',
        prevyear_where => '',
        prevmonthmtd_where => '',
        prevyearytd_where => '',
        prevmonthsamedate_where => '',
        prevyearsamedate_where => '',
        groupby_clause => #{conn.quote(groupby_clause)},
        having_clause => #{conn.quote(having_clause)},
        orderby_clause => #{conn.quote(orderby_clause)},
        partitionby_clause => #{conn.quote(partitionby_clause)},
        eab_join => #{conn.quote(eab_join)},
        user_id => '',
        page => #{normalized_page},
        page_size => #{normalized_page_size}
      )
    SQL

    main_rows = conn.exec_query('SELECT * FROM result').to_a
    # Prefer 'total_rows' (actual unpaginated count set by the SP) over 'pivoted_totalrows'
    # (which reflects the SP's own pivot output count — often 1 — not the data row count).
    first = main_rows.first
    total_rows = (first&.[]('total_rows') || first&.[]('pivoted_totalrows') || main_rows.length).to_i
    # Sanity: if SP returned more rows than total_rows claims, trust the actual row count
    total_rows = [total_rows, main_rows.length + (normalized_page - 1) * normalized_page_size].max
    # Add _period marker so comparison rows are always distinguishable from main rows.
    # When has_comparisons is true we tag all main rows 'main'; comparison rows get their period label.
    main_sanitized = main_rows.map do |row|
      r = row.except('rn', 'pivoted_totalrows', 'total_rows', 'RN', *SUPPRESSED_OUTER_COLUMNS)
      r['_period'] = 'main' if has_comparisons
      r
    end

    # ── CALL 2: Comparison periods — only if requested ────────────────────────
    # Fetch comparison data for the SAME dimension values as the paginated main rows.
    # This keeps memory bounded: only page_size * num_periods rows.
    # Comparisons require at least one aggregation measure in the main query — otherwise
    # there is nothing to compare period-over-period.
    comparison_sanitized = []
    if has_comparisons && main_sanitized.any? && selected_measures.any?
      date_dim_keys = %w[tran_date year_month year_quarter year]
      non_date_dims = dimension_keys.reject { |k| date_dim_keys.include?(k) }

      # Restrict the comparison query to EXACTLY the non-date dimension values visible on
      # the current main page. This is safe for ALL cardinalities because:
      #   • The comparison GROUP BY no longer includes the date dim, so one row is returned
      #     per (acct_num, …) combination — never a "per-date" explosion.
      #   • If an account had zero transactions in the comparison period the column
      #     correctly shows "—" rather than silently carrying the wrong account's data.
      # Without this restriction the comparison would return the top-N accounts globally
      # (by amount) for the comparison period — completely different accounts from those
      # on the current page — making every comparison column show "—".
      dim_value_clauses = non_date_dims.filter_map do |dim_key|
        values = main_sanitized.map { |r| r[dim_key] }.compact.uniq
        next if values.empty?
        "#{DIMENSIONS.fetch(dim_key).fetch(:sql)} IN (#{values.map { |v| conn.quote(v) }.join(', ')})"
      end

      # When PARTITION BY is active (e.g. PARTITION BY tran_date), the main query returns
      # up to page_size rows PER partition. Across N date partitions that's up to
      # page_size × N unique non-date dimension combinations (e.g. accounts). The comparison
      # must return ALL of them, not just the top page_size. Compute how many unique
      # combinations exist and use that as the comparison page_size, capped at 1000.
      comparison_page_size = if dim_value_clauses.any? && non_date_dims.any?
        unique_combos = main_sanitized.map { |r|
          non_date_dims.map { |k| r[k].to_s }.join("\x00")
        }.uniq.length
        unique_combos.clamp(normalized_page_size, 1000)
      else
        normalized_page_size
      end

      # ── Comparison SELECT / GROUP BY / ORDER BY ────────────────────────────────
      # The comparison call must NOT group by the date dimension.
      # Reason: if we keep "GROUP BY acct_num, tran_date" the comparison returns one row
      # per (account, date) combination inside the period — e.g. 28 daily rows for
      # "this month". The first of these rows often has the same date as the main query
      # (e.g. 2024-02-01), making the comparison column display identical values to the
      # main column. Removing the date dim collapses all period days into a SINGLE row
      # per account with the true full-period total.
      date_dim = dimension_keys.find { |k| date_dim_keys.include?(k) }
      comparison_inner_dim_keys = inner_dim_keys.reject { |k| date_dim_keys.include?(k) }
      comparison_dim_sqls       = comparison_inner_dim_keys.map { |k| DIMENSIONS.fetch(k).fetch(:sql) }
      comparison_dim_selects    = comparison_inner_dim_keys.map { |k| "#{DIMENSIONS.fetch(k).fetch(:sql)} AS #{k}" }

      comparison_select_inner = if comparison_dim_selects.any?
        "SELECT #{comparison_dim_selects.join(', ')}#{acid_select}, #{selected_measures.map { |m| m[:select_sql] }.join(', ')}"
      else
        # Only measures, no non-date dims — returns one total row for the period
        "SELECT #{selected_measures.map { |m| m[:select_sql] }.join(', ')}"
      end

      comparison_groupby_clause = begin
        parts = [comparison_dim_sqls.join(', '), acid_groupby.strip].reject(&:empty?).join(', ')
        parts.present? ? "GROUP BY #{parts}" : ''
      end

      # ORDER BY must not reference the date dim (no longer in SELECT/GROUP BY for comparison)
      comparison_orderby_clause = "ORDER BY #{selected_measures.first.fetch(:order_sql)}"

      empty_periods = []

      requested_periods.each do |period_key|
        # "THIS" periods use max of range, "PREV" periods use min of range
        period_ref = this_periods.include?(period_key) ? ref_for_this : ref_for_prev
        period_where = build_period_where(period: period_key, end_date: period_ref, filters: filters, dimension: period_dimension)
        next if period_where.blank?

        period_label = PERIOD_COMPARISONS[period_key][:label].downcase.gsub(' ', '_')

        # Compute the natural date label for this comparison period's column header.
        # e.g. "thismonth" → "2024-02", "prevyear" → "2023", "prevdate" → "2024-01-31"
        # Falls back to period_ref string when no date dimension is active.
        stamp_date = date_dim \
          ? period_stamp_date(period: period_key, reference_date: period_ref)
          : period_ref.to_s

        # Restrict to the dimension values visible on this page (non-date dims only —
        # date dim gets a new time range from period_where, that's the point)
        restricted_where = if dim_value_clauses.any?
          period_where.sub('WHERE ', "WHERE #{dim_value_clauses.join(' AND ')} AND ")
        else
          period_where
        end

        conn.execute('DROP TABLE IF EXISTS result')
        conn.execute(<<~SQL.squish)
          CALL public.get_tran_summary(
            select_outer => #{conn.quote(select_outer)},
            select_inner => #{conn.quote(comparison_select_inner)},
            where_clause => #{conn.quote(restricted_where)},
            prevdate_where => '',
            thismonth_where => '',
            thisyear_where => '',
            prevmonth_where => '',
            prevyear_where => '',
            prevmonthmtd_where => '',
            prevyearytd_where => '',
            prevmonthsamedate_where => '',
            prevyearsamedate_where => '',
            groupby_clause => #{conn.quote(comparison_groupby_clause)},
            having_clause => '',
            orderby_clause => #{conn.quote(comparison_orderby_clause)},
            partitionby_clause => '',
            eab_join => #{conn.quote(comparison_eab_join)},
            user_id => '',
            page => 1,
            page_size => #{comparison_page_size}
          )
        SQL

        comp_rows = conn.exec_query('SELECT * FROM result').to_a
        if comp_rows.empty? || comp_rows.all? { |r| r.except('rn', 'pivoted_totalrows', 'total_rows', 'RN').values.all?(&:nil?) }
          # Period returned no data — still add a placeholder row so the column appears
          # in the pivot table (with '—' values) instead of silently disappearing.
          placeholder = {}
          non_date_dims.each { |k| placeholder[k] = main_sanitized.first&.[](k) }
          placeholder['_period'] = period_label
          placeholder[date_dim] = "#{period_label}:#{stamp_date}" if date_dim
          comparison_sanitized << placeholder
          next
        end

        comp_rows.each do |row|
          sanitized = row.except('rn', 'pivoted_totalrows', 'total_rows', 'RN', *SUPPRESSED_OUTER_COLUMNS)
          sanitized['_period'] = period_label
          # Stamp the date dimension so the frontend pivot creates exactly ONE distinct
          # column per comparison period. The date portion is the natural period label
          # (e.g. "2024-02" for thismonth, "2023" for prevyear) so column headers read
          # naturally: "THIS MONTH / 2024-02", "PREV YEAR / 2023", etc.
          sanitized[date_dim] = "#{period_label}:#{stamp_date}" if date_dim
          comparison_sanitized << sanitized
        end
      end
    end

    sanitized_rows = main_sanitized + comparison_sanitized
    columns = sanitized_rows.first&.keys || (dimension_keys + measure_keys)

    {
      dimensions:      dimension_keys,
      measures:        measure_keys,
      time_comparisons: requested_periods,
      empty_periods:   has_comparisons ? (empty_periods || []) : [],
      columns:         columns,
      rows:            sanitized_rows,
      total_rows:      total_rows,
      page:            normalized_page,
      page_size:       normalized_page_size,
      sql_preview: {
        select_outer:       select_outer,
        select_inner:       select_inner,
        where_clause:       where_clause,
        groupby_clause:     groupby_clause,
        having_clause:      having_clause,
        orderby_clause:     orderby_clause,
        partitionby_clause: partitionby_clause,
        eab_join:           eab_join,
        include_eab:        include_eab,
        page:               normalized_page,
        page_size:          normalized_page_size,
        # Note: period comparisons run as SEPARATE CALL 2 (not combined with CALL 1).
        # CALL 1 uses all period_wheres = '' (empty). CALL 2 uses restricted_where
        # with acct_num IN (...) from current page + the period date clause.
        period_wheres:      period_wheres.reject { |_, v| v.empty? },
        comparison_note:    has_comparisons ? 'Comparisons run as separate restricted calls (not combined with main query)' : nil
      }.compact
    }
  end

  # Deposit Portfolio report — wraps `public.get_deposit(...)`.
  #
  # The procedure sums `eab.tran_date_bal` across a gam → eab → dates → branch → province → cluster
  # join. The caller supplies the SELECT/GROUP BY/PARTITION BY/ORDER BY clauses plus five ON-clause
  # fragments (one per joined table). Only date-related filters may remain unset — every other
  # filter becomes an optional AND-prefixed fragment. date_where MUST always produce a non-empty
  # string (the procedure's ON clause has no fallback), so we default to the full start→end range.
  def deposit_explorer(start_date: nil, end_date: nil, dimensions:, filters:, partitionby_clause: '', orderby_clause: '', page: 1, page_size: 10)
    calc_end_date   = end_date   || Date.today
    calc_start_date = start_date || calc_end_date

    dim_keys = Array(dimensions).filter_map { |d| d.to_s if DEPOSIT_DIMENSIONS.key?(d.to_s) }
    dim_keys = ['gam_branch'] if dim_keys.empty?

    dim_selects = dim_keys.map { |k| "#{DEPOSIT_DIMENSIONS.fetch(k).fetch(:sql)} AS #{k}" }
    dim_sqls    = dim_keys.map { |k| DEPOSIT_DIMENSIONS.fetch(k).fetch(:sql) }

    select_clause      = "SELECT #{dim_selects.join(', ')}"
    groupby_clause     = "GROUP BY #{dim_sqls.join(', ')}"
    partitionby_clause = substitute_deposit_aliases(partitionby_clause.to_s.strip)
    default_orderby    = 'ORDER BY sum(e.tran_date_bal) DESC'
    # Frontend-provided orderby_clause uses dim KEYS as tokens (e.g.
    # "ORDER BY year_month, gam_branch"), but the procedure applies ORDER BY
    # inside a window function in the SAME SELECT list where the alias is
    # defined — Postgres does NOT resolve SELECT-list aliases in that position
    # (PG ERROR: column "year_month" does not exist). Substitute each dim key
    # with its underlying SQL expression (`d.year_month`, `b.branch_name`, …)
    # so the proc receives a valid clause regardless of pivot/sort mode. Same
    # treatment for partitionby_clause above — it lives in the same OVER()
    # context and hits the same alias-resolution issue.
    orderby_clause     = orderby_clause.to_s.strip.presence || default_orderby
    orderby_clause     = substitute_deposit_aliases(orderby_clause)

    # Finest-grained date dim in the selection controls `date_join`. tran_date pins a
    # specific day (date_join empty); coarse dims (year_month/quarter/year) rejoin on
    # the matching period-end column so we get one balance snapshot per period.
    active_date_dim = DEPOSIT_DATE_DIM_PRIORITY.find { |k| dim_keys.include?(k) }
    date_join = active_date_dim ? DEPOSIT_DIMENSIONS.fetch(active_date_dim).fetch(:date_join, '') : ''

    date_where     = build_deposit_date_where(filters: filters, start_date: calc_start_date, end_date: calc_end_date)
    gam_where      = build_deposit_gam_where(filters: filters)
    branch_where   = build_deposit_branch_where(filters: filters)
    province_where = build_deposit_province_where(filters: filters)
    cluster_where  = build_deposit_cluster_where(filters: filters)

    normalized_page      = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, 200].min

    conn = ActiveRecord::Base.connection
    conn.execute('DROP TABLE IF EXISTS deposit')
    conn.execute(<<~SQL.squish)
      CALL public.get_deposit(
        #{conn.quote(select_clause)},
        #{conn.quote(groupby_clause)},
        #{conn.quote(partitionby_clause)},
        #{conn.quote(orderby_clause)},
        #{conn.quote(gam_where)},
        #{conn.quote(date_where)},
        #{conn.quote(date_join)},
        #{conn.quote(branch_where)},
        #{conn.quote(province_where)},
        #{conn.quote(cluster_where)},
        #{normalized_page},
        #{normalized_page_size}
      )
    SQL

    rows = conn.exec_query('SELECT * FROM deposit').to_a
    first = rows.first
    total_rows = (first&.[]('pivoted_totalrows') || first&.[]('total_rows') || rows.length).to_i
    sanitized_rows = rows.map { |r| r.except('rn', 'RN', 'total_rows', 'pivoted_totalrows') }

    {
      dimensions: dim_keys,
      rows: sanitized_rows,
      page: normalized_page,
      page_size: normalized_page_size,
      total_rows: total_rows,
      sql_preview: {
        select_clause:      select_clause,
        groupby_clause:     groupby_clause,
        partitionby_clause: partitionby_clause,
        orderby_clause:     orderby_clause,
        gam_where:          gam_where,
        date_where:         date_where,
        date_join:          date_join,
        branch_where:       branch_where,
        province_where:     province_where,
        cluster_where:      cluster_where
      }
    }
  end

  private

  def table_summaries
    result = @connection.exec_query(<<~SQL.squish)
      SELECT
        t.table_name,
        COUNT(c.column_name) AS column_count,
        COALESCE(MAX(s.n_live_tup), 0)::bigint AS estimated_rows
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
       AND c.table_name = t.table_name
      LEFT JOIN pg_stat_user_tables s
        ON s.schemaname = t.table_schema
       AND s.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_name IN (#{quoted_values(TABLES.keys)})
      GROUP BY t.table_name
      ORDER BY t.table_name
    SQL

    result.each_with_object({}) do |row, memo|
      memo[row['table_name']] = {
        column_count: row['column_count'],
        estimated_rows: row['estimated_rows']
      }
    end
  end

  def column_metadata(table_name)
    result = @connection.exec_query(<<~SQL.squish)
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = #{@connection.quote(table_name)}
      ORDER BY ordinal_position
    SQL

    result.map do |row|
      {
        name: row['column_name'],
        data_type: row['data_type']
      }
    end
  end

  def procedure_signatures_by_name
    result = @connection.exec_query(<<~SQL.squish)
      SELECT p.proname AS name,
             pg_get_function_identity_arguments(p.oid) AS signature
      FROM pg_proc p
      JOIN pg_namespace n
        ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (#{quoted_values(PROCEDURES.keys)})
    SQL

    result.each_with_object({}) do |row, memo|
      memo[row['name']] = row['signature']
    end
  end

  def preferred_order_column(column_names)
    %w[tran_date entry_date lchg_time eod_date last_modified_date row_id sol_id cluster_id user_id].find do |name|
      column_names.include?(name)
    end
  end

  def explorer_where_clause(filters:)
    clauses = []
    conn = ActiveRecord::Base.connection

    # The where_clause is built strictly from user-set filter fields. The TopBar
    # period selector's start_date / end_date are NOT auto-injected as a global
    # tran_date BETWEEN — to filter by date, the user must populate the tran_date
    # (or year_month / year_quarter / year) filter fields explicitly. start_date
    # / end_date are still consumed elsewhere in the service (period-comparison
    # anchors, EAB as-of date), just not pasted into where_clause as a default.

    # Categorical filters — each key is a real tran_summary column whose IN-clause
    # is generated when the corresponding filter has any value.
    {
      'gam_branch'       => filters[:branch],
      'gam_province'     => filters[:province],
      'gam_cluster'      => filters[:cluster],
      'gam_solid'        => filters[:solid],
      'tran_branch'      => filters[:tran_branch],
      'tran_cluster'     => filters[:tran_cluster],
      'tran_province'    => filters[:tran_province],
      'tran_source'      => filters[:tran_source],
      'tran_type'        => filters[:tran_type],
      'tran_sub_type'    => filters[:tran_sub_type],
      'part_tran_type'   => filters[:part_tran_type],
      'product'          => filters[:product],
      'service'          => filters[:service],
      'merchant'         => filters[:merchant],
      'schm_type'        => filters[:schm_type],
      'schm_sub_type'    => filters[:schm_sub_type],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      clauses << equals_or_in(column, normalized)
    end

    # Date dimension filters — support single-value =/IN, from-to BETWEEN, or multi-value IN
    {
      'tran_date'    => { exact: filters[:tran_date],    from: filters[:tran_date_from],    to: filters[:tran_date_to] },
      'year_month'   => { exact: filters[:year_month],   from: filters[:year_month_from],   to: filters[:year_month_to] },
      'year_quarter' => { exact: filters[:year_quarter], from: filters[:year_quarter_from], to: filters[:year_quarter_to] },
      'year'         => { exact: filters[:year],         from: filters[:year_from],         to: filters[:year_to] }
    }.each do |column, opts|
      from = opts[:from].presence
      to   = opts[:to].presence
      vals = normalize_filter_values(opts[:exact])

      if from && to
        clauses << "#{column} BETWEEN #{conn.quote(from)} AND #{conn.quote(to)}"
      elsif vals.any?
        clauses << equals_or_in(column, vals)
      end
    end

    # Multi-value IDENTITY filters: exact match via =/IN, supports single-string legacy callers.
    { 'acct_num' => filters[:acct_num], 'acid' => filters[:acid] }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      clauses << equals_or_in("#{column}::text", normalized)
    end

    # Multi-value NAME filters: partial match via ILIKE, OR-joined when multiple values.
    { 'cif_id' => filters[:cif_id], 'acct_name' => filters[:acct_name] }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      patterns = normalized.map { |v| "%#{ActiveRecord::Base.sanitize_sql_like(v)}%" }
      ors      = patterns.map { |p| "#{column}::text ILIKE #{conn.quote(p)}" }
      clauses << (ors.length == 1 ? ors.first : "(#{ors.join(' OR ')})")
    end

    # schm_code filter: scheme code lives only on `gam`, not on `tran_summary`.
    # The procedure's inner CTE references tran_summary alone, so we cannot
    # filter `schm_code IN (...)` directly. Push it down via a subquery on
    # `acid` instead — gam.acid is the PK so this is just an index lookup.
    schm_code = normalize_filter_values(filters[:schm_code])
    if schm_code.any?
      # Outer stays IN (subquery may return multiple acids); inner uses =/IN.
      clauses << "acid IN (SELECT acid FROM gam WHERE #{equals_or_in('schm_code', schm_code)})"
    end

    clauses << "tran_amt >= #{conn.quote(filters[:min_amount])}" unless filters[:min_amount].nil?
    clauses << "tran_amt <= #{conn.quote(filters[:max_amount])}" unless filters[:max_amount].nil?

    # Trailing space: the stored procedure concatenates this directly with "union all" in
    # its internal SQL template (no space between). Postgres 16+ rejects patterns like
    # "1=1union" as "trailing junk after numeric literal". Always end with a space so the
    # procedure's template renders valid SQL regardless of the last token.
    return 'WHERE 1=1 ' if clauses.empty?

    "WHERE #{clauses.join(' AND ')} "
  end

  # ─── Period-comparison reference-date resolution ────────────────────────────
  #
  # `resolve_reference_date`     → picks the LATEST date from filters (used for
  #                                "THIS …" period comparisons whose reference
  #                                should anchor to the end of the window).
  # `resolve_min_reference_date` → picks the EARLIEST date from filters (used
  #                                for "PREV …" period comparisons whose ref
  #                                should anchor to the start of the window).
  #
  # Both share the same lookup priority and the same dim-aware parsing — only
  # the side they pick (max vs min) and the period anchor (end-of-period vs
  # start-of-period) differ. Phase 1 R-5 collapsed them onto a single helper
  # `resolve_date_for_dim` to avoid drift between max/min variants.
  DATE_DIMS_FOR_RESOLVE = %w[tran_date year_month year_quarter year].freeze

  def resolve_reference_date(filters:, end_date:, dimension_keys:)
    resolve_date_for_dim(
      filters:        filters,
      fallback:       end_date,
      dimension_keys: dimension_keys,
      direction:      :max
    )
  end

  def resolve_min_reference_date(filters:, start_date:, dimension_keys:)
    resolve_date_for_dim(
      filters:        filters,
      fallback:       start_date,
      dimension_keys: dimension_keys,
      direction:      :min
    )
  end

  # Internal helper used by both resolve_*_reference_date methods.
  # `direction` is :max (use *_to / max() / end-of-period) or :min (use
  # *_from / min() / start-of-period).
  def resolve_date_for_dim(filters:, fallback:, dimension_keys:, direction:)
    date_dim = dimension_keys.find { |k| DATE_DIMS_FOR_RESOLVE.include?(k) }
    date_dim ||= DATE_DIMS_FOR_RESOLVE.find do |k|
      filters[k.to_sym].present? || filters[:"#{k}_from"].present? || filters[:"#{k}_to"].present?
    end

    range_key   = direction == :max ? :"#{date_dim}_to" : :"#{date_dim}_from"
    pick_method = direction == :max ? :max : :min

    case date_dim
    when 'tran_date'
      ref = filters[range_key].presence ||
            Array.wrap(filters[:tran_date])
                 .filter_map { |v| Date.parse(v.to_s) rescue nil }
                 .public_send(pick_method)
      ref.is_a?(Date) ? ref : (Date.parse(ref.to_s) rescue fallback)
    when 'year_month'
      ref_ym = filters[range_key].presence || Array.wrap(filters[:year_month]).public_send(pick_method)
      if ref_ym
        year, month = ref_ym.to_s.split('-').map(&:to_i)
        anchor_day  = direction == :max ? -1 : 1   # -1 = end-of-month, 1 = start-of-month
        Date.new(year, month, anchor_day) rescue fallback
      else
        fallback
      end
    when 'year_quarter'
      ref_yq = filters[range_key].presence || Array.wrap(filters[:year_quarter]).public_send(pick_method)
      if ref_yq && ref_yq.to_s.match(/(\d{4})-Q(\d)/)
        year = ::Regexp.last_match(1).to_i
        qtr  = ::Regexp.last_match(2).to_i
        if direction == :max
          last_month = qtr * 3
          Date.new(year, last_month, -1) rescue fallback     # end of last month of qtr
        else
          first_month = (qtr - 1) * 3 + 1
          Date.new(year, first_month, 1) rescue fallback     # start of first month of qtr
        end
      else
        fallback
      end
    when 'year'
      ref_yr = filters[range_key].presence || Array.wrap(filters[:year]).public_send(pick_method)
      if ref_yr
        anchor = direction == :max ? Date.new(ref_yr.to_s.to_i, 12, 31) : Date.new(ref_yr.to_s.to_i, 1, 1)
        anchor rescue fallback
      else
        fallback
      end
    else
      fallback
    end
  end

  # ─── Period-comparison WHERE builders ────────────────────────────────────────

  # Build a complete WHERE clause for a single comparison period.
  # Returns the natural date label for a comparison period, used as the date portion
  # of comparison pivot column headers (e.g. "this_month:2024-02").
  #
  # Period    | Label format      | Example (ref = 2024-02-15)
  # ----------|-------------------|---------------------------
  # thismonth | YYYY-MM           | 2024-02
  # thisyear  | YYYY              | 2024
  # prevdate  | YYYY-MM-DD        | 2024-02-14
  # prevmonth | YYYY-MM           | 2024-01
  # prevyear  | YYYY              | 2023
  # prevmonthmtd     | YYYY-MM   | 2024-01
  # prevyearytd      | YYYY      | 2023
  # prevmonthsamedate| YYYY-MM-DD| 2024-01-15
  # prevyearsamedate | YYYY-MM-DD| 2023-02-15
  def period_stamp_date(period:, reference_date:)
    ref = reference_date.to_date rescue reference_date
    case period.to_s
    when 'prevdate'           then (ref - 1).to_s
    when 'thismonth'          then ref.strftime('%Y-%m')
    when 'thisyear'           then ref.year.to_s
    when 'prevmonth'          then ref.prev_month.strftime('%Y-%m')
    when 'prevyear'           then (ref.year - 1).to_s
    when 'prevmonthmtd'       then ref.prev_month.strftime('%Y-%m')
    when 'prevyearytd'        then (ref.year - 1).to_s
    when 'prevmonthsamedate'  then ref.prev_month.to_s
    when 'prevyearsamedate'   then Date.new(ref.year - 1, ref.month, ref.day).to_s rescue ref.to_s
    else ref.to_s
    end
  end

  # Uses the same categorical filters as the main query and a period-specific
  # date clause that is dimension-aware (tran_date / year_month / year_quarter / year).
  def build_period_where(period:, end_date:, filters:, dimension: 'tran_date')
    date_clause = period_date_clause(period: period, end_date: end_date, dimension: dimension)
    return '' unless date_clause

    clauses = [date_clause] + non_date_filter_clauses(filters)
    # Trailing space — see rationale in explorer_where_clause. The procedure pastes
    # these period WHEREs into its internal SQL without space padding.
    "WHERE #{clauses.join(' AND ')} "
  end

  # Returns the date portion of a comparison WHERE clause.
  # The exact SQL depends on which date column the dimension uses.
  #
  # Supported dimensions:
  #   tran_date   → daily comparisons on tran_date column
  #   year_month  → monthly comparisons on year_month column (format: 'YYYY-MM')
  #   year_quarter→ quarterly comparisons on year_quarter column (format: 'YYYY-Qn')
  #   year        → annual comparisons on year column
  #   (any other) → falls back to tran_date
  #
  # rubocop:disable Metrics/MethodLength, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
  def period_date_clause(period:, end_date:, dimension: 'tran_date')
    q        = ->(d) { @connection.quote(d.to_s) }
    yr       = end_date.year
    mo       = end_date.month
    prev_yr  = yr - 1
    prev_mo  = end_date.beginning_of_month - 1   # last day of previous month
    qtr      = ->(m) { ((m - 1) / 3) + 1 }
    ym_str   = ->(y, m) { format('%04d-%02d', y, m) }
    yq_str   = ->(y, q) { "#{y}-Q#{q}" }

    prev_day = end_date - 1 # actual previous day (for prevdate period)

    case dimension
    # ── year_month comparisons ────────────────────────────────────────────────
    when 'year_month'
      case period
      when 'prevdate'
        "year_month = #{q.call(ym_str.call(prev_day.year, prev_day.month))}"
      when 'thismonth'
        "year_month = #{q.call(ym_str.call(yr, mo))}"
      when 'thisyear'
        # Full year: Jan → Dec of reference year
        "year_month BETWEEN #{q.call(ym_str.call(yr, 1))} AND #{q.call(ym_str.call(yr, 12))}"
      when 'prevmonth'
        "year_month = #{q.call(ym_str.call(prev_mo.year, prev_mo.month))}"
      when 'prevyear'
        "year_month BETWEEN #{q.call(ym_str.call(prev_yr, 1))} AND #{q.call(ym_str.call(prev_yr, 12))}"
      when 'prevmonthmtd'
        "year_month = #{q.call(ym_str.call(prev_mo.year, prev_mo.month))}"
      when 'prevyearytd'
        "year_month BETWEEN #{q.call(ym_str.call(prev_yr, 1))} AND #{q.call(ym_str.call(prev_yr, mo))}"
      when 'prevmonthsamedate'
        "year_month = #{q.call(ym_str.call(prev_mo.year, prev_mo.month))}"
      when 'prevyearsamedate'
        "year_month = #{q.call(ym_str.call(prev_yr, mo))}"
      end

    # ── year_quarter comparisons ──────────────────────────────────────────────
    when 'year_quarter'
      qn      = qtr.call(mo)
      prev_qn = qtr.call(prev_mo.month)
      case period
      when 'prevdate'
        "year_quarter = #{q.call(yq_str.call(prev_day.year, qtr.call(prev_day.month)))}"
      when 'thismonth'
        "year_quarter = #{q.call(yq_str.call(yr, qn))}"
      when 'thisyear'
        # All 4 quarters of the reference year (full calendar year)
        "year_quarter BETWEEN #{q.call(yq_str.call(yr, 1))} AND #{q.call(yq_str.call(yr, 4))}"
      when 'prevmonth', 'prevmonthmtd', 'prevmonthsamedate'
        "year_quarter = #{q.call(yq_str.call(prev_mo.year, qtr.call(prev_mo.month)))}"
      when 'prevyear'
        "year_quarter BETWEEN #{q.call(yq_str.call(prev_yr, 1))} AND #{q.call(yq_str.call(prev_yr, 4))}"
      when 'prevyearytd', 'prevyearsamedate'
        "year_quarter BETWEEN #{q.call(yq_str.call(prev_yr, 1))} AND #{q.call(yq_str.call(prev_yr, qn))}"
      end

    # ── year comparisons ──────────────────────────────────────────────────────
    when 'year'
      case period
      when 'prevdate'
        "year = #{q.call(prev_day.year.to_s)}"
      when 'thismonth', 'thisyear'
        "year = #{q.call(yr.to_s)}"
      when 'prevmonth', 'prevmonthmtd', 'prevmonthsamedate'
        "year = #{q.call(prev_mo.year.to_s)}"
      when 'prevyear', 'prevyearytd', 'prevyearsamedate'
        "year = #{q.call(prev_yr.to_s)}"
      end

    # ── tran_date (default) comparisons ──────────────────────────────────────
    else
      case period
      when 'prevdate'
        "tran_date = #{q.call(end_date - 1)}"
      when 'thismonth'
        "tran_date BETWEEN #{q.call(end_date.beginning_of_month)} AND #{q.call(end_date.end_of_month)}"
      when 'thisyear'
        # Full calendar year: Jan 1 → Dec 31 of the reference year
        "tran_date BETWEEN #{q.call(Date.new(yr, 1, 1))} AND #{q.call(Date.new(yr, 12, 31))}"
      when 'prevmonth'
        "tran_date BETWEEN #{q.call(prev_mo.beginning_of_month)} AND #{q.call(prev_mo)}"
      when 'prevyear'
        "tran_date BETWEEN #{q.call(Date.new(prev_yr, 1, 1))} AND #{q.call(Date.new(prev_yr, 12, 31))}"
      when 'prevmonthmtd'
        pm_start = prev_mo.beginning_of_month
        pm_end   = [pm_start + (end_date.day - 1), prev_mo].min
        "tran_date BETWEEN #{q.call(pm_start)} AND #{q.call(pm_end)}"
      when 'prevyearytd'
        "tran_date BETWEEN #{q.call(Date.new(prev_yr, 1, 1))} AND #{q.call(safe_date(prev_yr, mo, end_date.day))}"
      when 'prevmonthsamedate'
        "tran_date = #{q.call(safe_date(prev_mo.year, prev_mo.month, end_date.day))}"
      when 'prevyearsamedate'
        "tran_date = #{q.call(safe_date(prev_yr, mo, end_date.day))}"
      end
    end
  end
  # rubocop:enable Metrics/MethodLength, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

  # Clamp day to the actual number of days in the given month/year.
  def safe_date(year, month, day)
    max_day = Date.new(year, month, -1).day
    Date.new(year, month, [day, max_day].min)
  end

  # Build IN-list clauses for the categorical filters shared across all queries.
  def categorical_filter_clauses(filters)
    mapping = {
      'gam_branch'       => filters[:branch],
      'gam_province'     => filters[:province],
      'gam_cluster'      => filters[:cluster],
      'gam_solid'        => filters[:solid],
      'tran_source'      => filters[:tran_source],
      'part_tran_type'   => filters[:part_tran_type],
      'product'          => filters[:product],
      'service'          => filters[:service],
      'merchant'         => filters[:merchant],
      'schm_type'        => filters[:schm_type],
      'schm_sub_type'    => filters[:schm_sub_type],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }

    mapping.filter_map do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      equals_or_in(column, normalized)
    end
  end

  # Returns all non-date filter clauses: categorical + text search + amount.
  # Used by build_period_where so comparison periods share the same non-date filters
  # as the main query, without duplicating the date range that period_date_clause handles.
  def non_date_filter_clauses(filters)
    conn = @connection
    clauses = categorical_filter_clauses(filters)

    { 'acct_num' => filters[:acct_num], 'acid' => filters[:acid] }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      clauses << equals_or_in("#{column}::text", normalized)
    end
    { 'cif_id' => filters[:cif_id], 'acct_name' => filters[:acct_name] }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      patterns = normalized.map { |v| "%#{ActiveRecord::Base.sanitize_sql_like(v)}%" }
      ors      = patterns.map { |p| "#{column}::text ILIKE #{conn.quote(p)}" }
      clauses << (ors.length == 1 ? ors.first : "(#{ors.join(' OR ')})")
    end
    # schm_code: subquery against gam (column does not live on tran_summary).
    # Outer stays IN (subquery may return multiple acids); inner uses =/IN.
    schm_code = normalize_filter_values(filters[:schm_code])
    if schm_code.any?
      clauses << "acid IN (SELECT acid FROM gam WHERE #{equals_or_in('schm_code', schm_code)})"
    end
    clauses << "tran_amt >= #{conn.quote(filters[:min_amount])}" unless filters[:min_amount].nil?
    clauses << "tran_amt <= #{conn.quote(filters[:max_amount])}" unless filters[:max_amount].nil?
    clauses
  end

  def quoted_values(values)
    Array(values).map { |value| @connection.quote(value) }.join(', ')
  end

  # Build either "<column> = <value>" or "<column> IN (<values>)" depending on
  # cardinality. Single-value form keeps the user-visible SQL preview readable
  # and lets Postgres pick equality plans without the planner first having to
  # unfold a one-element list.
  def equals_or_in(column, values)
    list = Array(values)
    return "#{column} = #{@connection.quote(list.first)}" if list.length == 1
    "#{column} IN (#{quoted_values(list)})"
  end

  # Substitute deposit dim aliases (e.g. `year_month`, `gam_branch`) with their
  # underlying SQL expressions (`d.year_month`, `b.branch_name`) inside a clause
  # string. Required for ORDER BY / PARTITION BY because the procedure applies
  # them inside ROW_NUMBER() OVER(...) in the same SELECT list where the alias
  # is defined — Postgres can't resolve SELECT-list aliases in that position,
  # so we must hand it the raw expression.
  #
  # Uses word-boundary matching so we don't accidentally rewrite tokens inside
  # already-qualified expressions like `d.year_month` (no leading word
  # boundary after the dot, so `d.year_month` is left alone).
  def substitute_deposit_aliases(clause)
    return clause if clause.blank?
    result = clause.dup
    DEPOSIT_DIMENSIONS.each do |key, meta|
      sql_expr = meta[:sql]
      next if sql_expr.blank? || sql_expr == key
      result = result.gsub(/(?<![.\w])#{Regexp.escape(key)}(?![\w])/, sql_expr)
    end
    result
  end

  # ── Deposit explorer clause builders ─────────────────────────────────────
  # Each returns a string ready to splice into the stored procedure's ON-clause
  # slot. Branch/province/cluster/gam slots expect an "AND ..." prefix (or empty
  # string); date_where is the primary predicate and must never be empty.

  # date_where for the Deposit Portfolio. Combines all date-dim filters with AND
  # so users can stack e.g. year=2024 + year_month BETWEEN 2024-02 AND 2024-04.
  # Each clause references the matching column on `dates` (d.date / d.year /
  # d.year_month / d.year_quarter). When no clauses are set we fall back to the
  # period-selector window so date_where is never empty (the procedure template
  # concatenates it directly without a leading AND).
  DEPOSIT_DATE_FILTER_COLS = {
    'd.date'         => { exact: :tran_date,    from: :tran_date_from,    to: :tran_date_to },
    'd.year'         => { exact: :year,         from: :year_from,         to: :year_to },
    'd.year_month'   => { exact: :year_month,   from: :year_month_from,   to: :year_month_to },
    'd.year_quarter' => { exact: :year_quarter, from: :year_quarter_from, to: :year_quarter_to }
  }.freeze

  # Format the user-supplied value must match before we splice it into the
  # WHERE clause. Catches cases like a year-month string ("2024-01") landing
  # in a tran_date input — Postgres can't cast that to DATE and errors out
  # with `invalid input syntax for type date`. Anything that doesn't match
  # is treated as "not set" so we never feed Postgres a malformed literal.
  DEPOSIT_DATE_VALUE_FORMAT = {
    'd.date'         => /\A\d{4}-\d{2}-\d{2}\z/,
    'd.year'         => /\A\d{4}\z/,
    'd.year_month'   => /\A\d{4}-\d{2}\z/,
    'd.year_quarter' => /\A\d{4}-Q[1-4]\z/i
  }.freeze

  def build_deposit_date_where(filters:, start_date:, end_date:)
    clauses = DEPOSIT_DATE_FILTER_COLS.filter_map do |column, keys|
      fmt   = DEPOSIT_DATE_VALUE_FORMAT[column]
      valid = ->(v) { v.is_a?(String) && (!fmt || v.match?(fmt)) }

      vals = normalize_filter_values(filters[keys[:exact]]).select(&valid)
      raw_from = filters[keys[:from]].to_s.strip.presence
      raw_to   = filters[keys[:to]].to_s.strip.presence
      from     = valid.call(raw_from) ? raw_from : nil
      to       = valid.call(raw_to)   ? raw_to   : nil

      if from && to
        "#{column} BETWEEN #{@connection.quote(from)} AND #{@connection.quote(to)}"
      elsif from
        "#{column} >= #{@connection.quote(from)}"
      elsif to
        "#{column} <= #{@connection.quote(to)}"
      elsif vals.any?
        equals_or_in(column, vals)
      end
    end

    return clauses.join(' AND ') if clauses.any?

    # Fallback: period-selector window. date_where must never be empty — the
    # procedure splices it directly into its WHERE template.
    "d.date BETWEEN #{@connection.quote(start_date.to_s)} AND #{@connection.quote(end_date.to_s)}"
  end

  def build_deposit_gam_where(filters:)
    clauses = []

    acct_num = normalize_filter_values(filters[:acct_num])
    clauses << equals_or_in('g.acct_num::text', acct_num) if acct_num.any?

    acid = normalize_filter_values(filters[:acid])
    clauses << equals_or_in('g.acid::text', acid) if acid.any?

    cif_id = normalize_filter_values(filters[:cif_id])
    if cif_id.any?
      patterns = cif_id.map { |v| "%#{ActiveRecord::Base.sanitize_sql_like(v)}%" }
      ors = patterns.map { |p| "g.cif_id::text ILIKE #{@connection.quote(p)}" }
      clauses << (ors.length == 1 ? ors.first : "(#{ors.join(' OR ')})")
    end

    acct_name = normalize_filter_values(filters[:acct_name])
    if acct_name.any?
      patterns = acct_name.map { |v| "%#{ActiveRecord::Base.sanitize_sql_like(v)}%" }
      ors = patterns.map { |p| "g.acct_name ILIKE #{@connection.quote(p)}" }
      clauses << (ors.length == 1 ? ors.first : "(#{ors.join(' OR ')})")
    end

    # schm_code: account scheme code (saving / minor / woman / fixed / current).
    # gam is already joined as `g` in the deposit procedure, so a direct =/IN
    # works here (no subquery needed unlike the pivot path).
    schm_code = normalize_filter_values(filters[:schm_code])
    clauses << equals_or_in('g.schm_code', schm_code) if schm_code.any?

    clauses.any? ? "AND #{clauses.join(' AND ')}" : ''
  end

  def build_deposit_branch_where(filters:)
    clauses = []

    # filters[:branch] uses sol_id values (from static_data type='branch').
    branch = normalize_filter_values(filters[:branch])
    clauses << equals_or_in('g.sol_id::text', branch) if branch.any?

    # filters[:solid] is a legacy alias; union with branch when present.
    solid = normalize_filter_values(filters[:solid])
    clauses << equals_or_in('g.sol_id::text', solid) if solid.any?

    clauses.any? ? "AND #{clauses.join(' AND ')}" : ''
  end

  def build_deposit_province_where(filters:)
    values = normalize_filter_values(filters[:province])
    return '' if values.empty?
    "AND #{equals_or_in('p.name', values)}"
  end

  def build_deposit_cluster_where(filters:)
    values = normalize_filter_values(filters[:cluster])
    return '' if values.empty?
    # filters[:cluster] uses cluster_id values (from static_data type='cluster').
    "AND #{equals_or_in('b.cluster_id::text', values)}"
  end

  def normalize_filter_values(value)
    Array.wrap(value).filter_map do |item|
      text = item.to_s.strip
      text.presence
    end
  end

  def validate_table_name!(table_name)
    raise ArgumentError, "Unsupported table: #{table_name}" unless TABLES.key?(table_name.to_s)
  end

  def with_connection
    ActiveRecord::Base.connection_pool.with_connection do |connection|
      previous = @connection
      @connection = connection
      # Use a transaction to ensure CALL and SELECT * FROM result
      # execute on the same DB connection (temp tables are connection-scoped)
      @connection.transaction do
        yield
      end
    ensure
      @connection = previous
    end
  end
end
