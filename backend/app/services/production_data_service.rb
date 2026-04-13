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
    'accounts' => {
      label: 'Accounts',
      description: 'Rails-managed account table linked to customers (20,000 rows).',
      category: 'master'
    },
    'transactions' => {
      label: 'Transactions',
      description: 'Rails-managed transaction table linked to accounts (14,000 rows).',
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

  LOOKUP_TYPES = %w[branch cluster gsh merchant product province service].freeze

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
    'cif_id'           => { label: 'CIF Id',             sql: 'cif_id' },
    # ── Transaction dimensions ────────────────────────────────────────────────
    'tran_source'      => { label: 'TRAN Source',        sql: 'tran_source' },
    'tran_branch'      => { label: 'TRAN Branch',        sql: 'tran_branch' },
    'tran_cluster'     => { label: 'TRAN Cluster',       sql: 'tran_cluster' },
    'tran_province'    => { label: 'TRAN Province',      sql: 'tran_province' },
    'tran_type'        => { label: 'TRAN Type',          sql: 'tran_type' },
    'part_tran_type'   => { label: 'PART Tran Type',     sql: 'part_tran_type' },
    'gl_sub_head_code' => { label: 'GL Sub Head',        sql: 'gl_sub_head_code' },
    'product'          => { label: 'Product',            sql: 'product' },
    'service'          => { label: 'Service',            sql: 'service' },
    'merchant'         => { label: 'Merchant',           sql: 'merchant' },
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
    'tran_date_bal'    => { label: 'TRAN Date Balance',  sql: 'e.tran_date_bal', eab_required: true, outer_join_field: true }
  }.freeze

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

  # Flat keys sent from the frontend — each encodes period + metric.
  # Multiple keys for the same period collapse to a single *_where param.
  TIME_COMPARISON_FIELDS = {
    'prevdate_amt'            => { period: 'prevdate',          metric: 'tran_amt',   label: 'Prev Date — Amount' },
    'prevdate_count'          => { period: 'prevdate',          metric: 'tran_count', label: 'Prev Date — Count' },
    'thismonth_amt'           => { period: 'thismonth',         metric: 'tran_amt',   label: 'This Month — Amount' },
    'thismonth_count'         => { period: 'thismonth',         metric: 'tran_count', label: 'This Month — Count' },
    'thisyear_amt'            => { period: 'thisyear',          metric: 'tran_amt',   label: 'This Year — Amount' },
    'thisyear_count'          => { period: 'thisyear',          metric: 'tran_count', label: 'This Year — Count' },
    'prevmonth_amt'           => { period: 'prevmonth',         metric: 'tran_amt',   label: 'Prev Month — Amount' },
    'prevmonth_count'         => { period: 'prevmonth',         metric: 'tran_count', label: 'Prev Month — Count' },
    'prevyear_amt'            => { period: 'prevyear',          metric: 'tran_amt',   label: 'Prev Year — Amount' },
    'prevyear_count'          => { period: 'prevyear',          metric: 'tran_count', label: 'Prev Year — Count' },
    'prevmonthmtd_amt'        => { period: 'prevmonthmtd',      metric: 'tran_amt',   label: 'Prev Month MTD — Amount' },
    'prevmonthmtd_count'      => { period: 'prevmonthmtd',      metric: 'tran_count', label: 'Prev Month MTD — Count' },
    'prevyearytd_amt'         => { period: 'prevyearytd',       metric: 'tran_amt',   label: 'Prev Year YTD — Amount' },
    'prevyearytd_count'       => { period: 'prevyearytd',       metric: 'tran_count', label: 'Prev Year YTD — Count' },
    'prevmonthsamedate_amt'   => { period: 'prevmonthsamedate', metric: 'tran_amt',   label: 'Prev Month Same Date — Amount' },
    'prevmonthsamedate_count' => { period: 'prevmonthsamedate', metric: 'tran_count', label: 'Prev Month Same Date — Count' },
    'prevyearsamedate_amt'    => { period: 'prevyearsamedate',  metric: 'tran_amt',   label: 'Prev Year Same Date — Amount' },
    'prevyearsamedate_count'  => { period: 'prevyearsamedate',  metric: 'tran_count', label: 'Prev Year Same Date — Count' }
  }.freeze

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

  def tran_summary_explorer(start_date: nil, end_date: nil, dimensions:, measures:, filters:, time_comparisons: [], partitionby_clause: '', orderby_clause: '', page: 1, page_size: 10)
    # Fallback dates used for internal calculations (EAB join, period comparisons).
    # start_date / end_date may be nil when frontend sends no date params (ALL period before
    # filter-stats loads) — in that case we skip the tran_date WHERE clause but still need
    # valid dates for everything else.
    calc_end_date = end_date || Date.today

    dimension_keys = Array(dimensions).filter_map do |d|
      key = d.to_s
      key if DIMENSIONS.key?(key)
    end
    dimension_keys = ['gam_branch'] if dimension_keys.empty?

    measure_keys = Array(measures).filter_map do |measure|
      value = measure.to_s
      value if MEASURES.key?(value)
    end
    raise ArgumentError, 'At least one valid measure is required' if measure_keys.empty?

    normalized_page = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, 100].min

    # Count active comparison periods early
    requested_periods_count = Array(time_comparisons).map(&:to_s).filter_map { |key|
      meta = TIME_COMPARISON_FIELDS[key]
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

    # Force EAB join when any selected dimension has eab_required: true (e.g. tran_date_bal)
    eab_dim_required = dimension_keys.any? { |k| DIMENSIONS.fetch(k)[:eab_required] }

    # Include acid in select/groupby whenever an EAB-sourced dimension is selected so the
    # outer query can join eab on acid.
    include_eab  = eab_dim_required
    acid_select  = include_eab ? ', acid' : ''
    acid_groupby = include_eab ? ', acid' : ''

    select_inner   = "SELECT #{dim_selects.join(', ')}#{acid_select}, #{selected_measures.map { |m| m[:select_sql] }.join(', ')}"
    where_clause   = explorer_where_clause(filters: filters, start_date: start_date, end_date: end_date)
    groupby_clause = "GROUP BY #{dim_sqls.join(', ')}#{acid_groupby}"
    having_clause  = ''
    # Use the user-supplied ORDER BY clause if provided; fall back to measure-based default.
    orderby_clause = orderby_clause.to_s.strip.presence ||
                     "ORDER BY #{selected_measures.first.fetch(:order_sql)}"

    # PARTITION BY: the procedure expects the FULL clause including the 'PARTITION BY' keyword.
    # Frontend sends '' (no pivot) or 'PARTITION BY field1, field2' (pivot mode).
    # Empty string = global ROW_NUMBER (standard pagination).
    # Non-empty = per-group ROW_NUMBER — the procedure uses it verbatim inside OVER(...).
    partitionby_clause = partitionby_clause.to_s.strip

    # EAB join: use >= eod_date AND < end_eod_date (end_eod_date is exclusive in production data)
    eab_join = if include_eab
      quoted_end = @connection.quote(calc_end_date.to_s)
      "LEFT JOIN eab e ON e.acid = tb2.acid AND #{quoted_end} >= e.eod_date::date AND #{quoted_end} < e.end_eod_date::date"
    else
      ''
    end

    # select_outer: always selects tb2.*, then appends any outer_join_field dimensions
    # (e.g. e.tran_date_bal AS tran_date_bal from the eab join).
    outer_dim_selects = outer_dim_keys.map { |k| "#{DIMENSIONS.fetch(k).fetch(:sql)} AS #{k}" }
    select_outer = if include_eab && outer_dim_selects.any?
      "SELECT tb2.*, #{outer_dim_selects.join(', ')}"
    else
      'SELECT tb2.*'
    end

    # Resolve reference date for period comparisons from user-selected filter values
    reference_date = resolve_reference_date(filters: filters, end_date: calc_end_date, dimension_keys: dimension_keys)

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
    # Multiple time_comparison keys (e.g. 'prevdate_amt', 'prevdate_count') sharing
    # the same period collapse to a single *_where value.
    requested_periods = Array(time_comparisons).map(&:to_s).filter_map do |key|
      meta = TIME_COMPARISON_FIELDS[key]
      meta[:period] if meta
    end.uniq

    period_wheres = PERIOD_COMPARISONS.each_with_object({}) do |(period_key, meta), acc|
      acc[meta[:param]] = if requested_periods.include?(period_key)
        build_period_where(period: period_key, end_date: reference_date, filters: filters, dimension: period_dimension)
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
        having_clause => '',
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
      r = row.except('rn', 'pivoted_totalrows', 'total_rows', 'RN')
      r['_period'] = 'main' if has_comparisons
      r
    end

    # ── CALL 2: Comparison periods — only if requested ────────────────────────
    # Fetch comparison data for the SAME dimension values as the paginated main rows.
    # This keeps memory bounded: only page_size * num_periods rows.
    comparison_sanitized = []
    if has_comparisons && main_sanitized.any?
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
        period_where = build_period_where(period: period_key, end_date: reference_date, filters: filters, dimension: period_dimension)
        next if period_where.blank?

        period_label = PERIOD_COMPARISONS[period_key][:label].downcase.gsub(' ', '_')

        # Compute the natural date label for this comparison period's column header.
        # e.g. "thismonth" → "2024-02", "prevyear" → "2023", "prevdate" → "2024-01-31"
        # Falls back to reference_date string when no date dimension is active.
        stamp_date = date_dim \
          ? period_stamp_date(period: period_key, reference_date: reference_date)
          : reference_date.to_s

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
            eab_join => #{conn.quote(eab_join)},
            user_id => '',
            page => 1,
            page_size => #{comparison_page_size}
          )
        SQL

        comp_rows = conn.exec_query('SELECT * FROM result').to_a
        if comp_rows.empty? || comp_rows.all? { |r| r.except('rn', 'pivoted_totalrows', 'total_rows', 'RN').values.all?(&:nil?) }
          # Period returned no data — record it so frontend can show "(no data)" instead of
          # silently missing columns
          empty_periods << period_label
          next
        end

        comp_rows.each do |row|
          sanitized = row.except('rn', 'pivoted_totalrows', 'total_rows', 'RN')
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
        period_wheres:      period_wheres.reject { |_, v| v.empty? }
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

  def explorer_where_clause(filters:, start_date: nil, end_date: nil)
    clauses = []
    conn = ActiveRecord::Base.connection

    # Global date range — applied as tran_date BETWEEN unless the user has already set
    # an explicit tran_date exact-match or range filter (which would be more specific).
    # start_date is nil only when the frontend sends no start_date param (ALL period before
    # filter-stats loads), in which case we skip the clause to avoid a 30-day default window.
    has_explicit_tran_date = filters[:tran_date].present? ||
                             filters[:tran_date_from].present? ||
                             filters[:tran_date_to].present?
    if start_date && end_date && !has_explicit_tran_date
      clauses << "tran_date BETWEEN #{conn.quote(start_date.to_s)} AND #{conn.quote(end_date.to_s)}"
    end

    # Categorical filters
    {
      'gam_branch'       => filters[:branch],
      'gam_province'     => filters[:province],
      'gam_cluster'      => filters[:cluster],
      'gam_solid'        => filters[:solid],
      'tran_source'      => filters[:tran_source],
      'part_tran_type'   => filters[:part_tran_type],
      'product'          => filters[:product],
      'service'          => filters[:service],
      'merchant'         => filters[:merchant],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      clauses << "#{column} IN (#{quoted_values(normalized)})"
    end

    # Date dimension filters — support single-value IN, from-to BETWEEN, or multi-value IN
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
        clauses << "#{column} IN (#{quoted_values(vals)})"
      end
    end

    if filters[:acct_num].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:acct_num].to_s.strip)}%"
      clauses << "acct_num::text ILIKE #{conn.quote(pattern)}"
    end

    if filters[:cif_id].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:cif_id].to_s.strip)}%"
      clauses << "cif_id::text ILIKE #{conn.quote(pattern)}"
    end

    clauses << "tran_amt >= #{conn.quote(filters[:min_amount])}" unless filters[:min_amount].nil?
    clauses << "tran_amt <= #{conn.quote(filters[:max_amount])}" unless filters[:max_amount].nil?

    return 'WHERE 1=1' if clauses.empty?

    "WHERE #{clauses.join(' AND ')}"
  end

  # Resolve the reference date for period comparisons.
  # Priority: selected date dimension filter → any date filter present → global end_date.
  # This ensures that setting tran_date = '2022-02-18' as a filter (even without selecting
  # tran_date as a GROUP BY dimension) correctly anchors period comparisons to 2022, not
  # to the global date-picker end_date.
  def resolve_reference_date(filters:, end_date:, dimension_keys:)
    # Prefer the active date dimension (selected for GROUP BY) first
    date_dim = dimension_keys.find { |k| %w[tran_date year_month year_quarter year].include?(k) }

    # If no date dimension is grouped on, fall back to whichever date filter the user has set
    date_dim ||= %w[tran_date year_month year_quarter year].find do |k|
      sym = k.to_sym
      from_sym = :"#{k.tr('_', '_')}_from" # e.g. :tran_date_from
      to_sym   = :"#{k.tr('_', '_')}_to"
      filters[sym].present? || filters[from_sym].present? || filters[to_sym].present?
    end

    case date_dim
    when 'tran_date'
      ref = filters[:tran_date_to].presence ||
            Array.wrap(filters[:tran_date]).filter_map { |v| Date.parse(v.to_s) rescue nil }.max
      ref.is_a?(Date) ? ref : (Date.parse(ref.to_s) rescue end_date)
    when 'year_month'
      ref_ym = filters[:year_month_to].presence || Array.wrap(filters[:year_month]).max
      if ref_ym
        year, month = ref_ym.to_s.split('-').map(&:to_i)
        Date.new(year, month, -1) rescue end_date
      else
        end_date
      end
    when 'year_quarter'
      ref_yq = filters[:year_quarter_to].presence || Array.wrap(filters[:year_quarter]).max
      if ref_yq && ref_yq.to_s.match(/(\d{4})-Q(\d)/)
        year, qtr = ::Regexp.last_match(1).to_i, ::Regexp.last_match(2).to_i
        last_month = qtr * 3
        Date.new(year, last_month, -1) rescue end_date
      else
        end_date
      end
    when 'year'
      ref_yr = filters[:year_to].presence || Array.wrap(filters[:year]).max
      ref_yr ? (Date.new(ref_yr.to_s.to_i, 12, 31) rescue end_date) : end_date
    else
      end_date
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
    "WHERE #{clauses.join(' AND ')}"
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

    case dimension
    # ── year_month comparisons ────────────────────────────────────────────────
    when 'year_month'
      case period
      when 'prevdate'
        "year_month = #{q.call(ym_str.call(prev_mo.year, prev_mo.month))}"
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
        "year_quarter = #{q.call(yq_str.call(prev_mo.year, qtr.call(prev_mo.month)))}"
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
      when 'prevdate', 'thismonth', 'thisyear'
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
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }

    mapping.filter_map do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?
      "#{column} IN (#{quoted_values(normalized)})"
    end
  end

  # Returns all non-date filter clauses: categorical + text search + amount.
  # Used by build_period_where so comparison periods share the same non-date filters
  # as the main query, without duplicating the date range that period_date_clause handles.
  def non_date_filter_clauses(filters)
    conn = @connection
    clauses = categorical_filter_clauses(filters)

    if filters[:acct_num].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:acct_num].to_s.strip)}%"
      clauses << "acct_num::text ILIKE #{conn.quote(pattern)}"
    end
    if filters[:cif_id].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:cif_id].to_s.strip)}%"
      clauses << "cif_id::text ILIKE #{conn.quote(pattern)}"
    end
    clauses << "tran_amt >= #{conn.quote(filters[:min_amount])}" unless filters[:min_amount].nil?
    clauses << "tran_amt <= #{conn.quote(filters[:max_amount])}" unless filters[:max_amount].nil?
    clauses
  end

  def quoted_values(values)
    Array(values).map { |value| @connection.quote(value) }.join(', ')
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
