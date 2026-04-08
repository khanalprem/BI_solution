class ProductionDataService
  TABLES = {
    'tran_summary' => {
      label: 'Transaction Summary',
      description: 'Primary production fact table for BI dashboards.',
      category: 'fact'
    },
    'gam' => {
      label: 'General Account Master',
      description: 'Account master details, balances, and scheme types.',
      category: 'master'
    },
    'htd' => {
      label: 'Historical Transaction Detail',
      description: 'Raw ledger-level transaction history.',
      category: 'fact'
    },
    'dates' => {
      label: 'Date Dimension',
      description: 'Calendar, month, quarter, and year attributes.',
      category: 'dimension'
    },
    'data_dictionary' => {
      label: 'Data Dictionary',
      description: 'Dynamic query metadata and stored procedure references.',
      category: 'metadata'
    },
    'user_master' => {
      label: 'User Master',
      description: 'Production user list used by entry and verify flows.',
      category: 'security'
    },
    'branch' => {
      label: 'Branch Master',
      description: 'Primary branch metadata keyed by SOL ID.',
      category: 'dimension'
    },
    'branch_cdc' => {
      label: 'Branch CDC Replica',
      description: 'Change-data-capture copy of branch metadata.',
      category: 'dimension'
    },
    'gsh' => {
      label: 'GL Sub Head',
      description: 'GL sub-head descriptions and parent GL codes.',
      category: 'dimension'
    },
    'cluster' => {
      label: 'Cluster',
      description: 'Branch cluster hierarchy.',
      category: 'dimension'
    },
    'province' => {
      label: 'Province',
      description: 'Nepal province lookup in production numbering.',
      category: 'dimension'
    },
    'merchant' => {
      label: 'Merchant',
      description: 'Merchant lookup values.',
      category: 'lookup'
    },
    'product' => {
      label: 'Product',
      description: 'Product lookup values.',
      category: 'lookup'
    },
    'service' => {
      label: 'Service',
      description: 'Service lookup values.',
      category: 'lookup'
    },
    'user_branch_cluster' => {
      label: 'User Branch Cluster',
      description: 'Maps users to allowed branch and cluster scopes.',
      category: 'security'
    },
    'eab' => {
      label: 'End-of-Day Balance',
      description: 'Balance snapshots by ACID and effective date.',
      category: 'fact'
    }
  }.freeze

  LOOKUP_TYPES = %w[branch cluster gsh merchant product province service].freeze

  PROCEDURES = {
    'get_static_data' => 'Production lookup procedure used for static dimensions.',
    'get_tran_summary' => 'Production analytics procedure used for grouped BI queries.'
  }.freeze

  DIMENSIONS = {
    'gam_branch' => { label: 'Account Branch', sql: 'gam_branch' },
    'gam_province' => { label: 'Account Province', sql: 'gam_province' },
    'gam_cluster' => { label: 'Account Cluster', sql: 'gam_cluster' },
    'gam_solid' => { label: 'Account SOL ID', sql: 'gam_solid' },
    'tran_source' => { label: 'Channel', sql: 'tran_source' },
    'part_tran_type' => { label: 'CR / DR', sql: 'part_tran_type' },
    'product' => { label: 'Product', sql: 'product' },
    'service' => { label: 'Service', sql: 'service' },
    'merchant' => { label: 'Merchant', sql: 'merchant' },
    'gl_sub_head_code' => { label: 'GL Code', sql: 'gl_sub_head_code' },
    'entry_user' => { label: 'Entry User', sql: 'entry_user' },
    'vfd_user' => { label: 'Verified User', sql: 'vfd_user' },
    'acct_num' => { label: 'Account Number', sql: 'acct_num' },
    'cif_id' => { label: 'CIF ID', sql: 'cif_id' },
    'tran_date' => { label: 'Transaction Date', sql: 'tran_date' },
    'year_month' => { label: 'Year Month', sql: 'year_month' },
    'year_quarter' => { label: 'Year Quarter', sql: 'year_quarter' },
    'year' => { label: 'Year', sql: 'year' }
  }.freeze

  MEASURES = {
    'total_amount' => {
      label: 'Total Amount',
      select_sql: 'SUM(tran_amt) AS total_amount',
      order_sql: 'SUM(tran_amt) DESC'
    },
    'transaction_count' => {
      label: 'Transaction Count',
      select_sql: 'SUM(tran_count) AS transaction_count',
      order_sql: 'SUM(tran_count) DESC'
    },
    'unique_accounts' => {
      label: 'Unique Accounts',
      select_sql: 'COUNT(DISTINCT acct_num) AS unique_accounts',
      order_sql: 'COUNT(DISTINCT acct_num) DESC'
    },
    'unique_customers' => {
      label: 'Unique Customers',
      select_sql: 'COUNT(DISTINCT cif_id) AS unique_customers',
      order_sql: 'COUNT(DISTINCT cif_id) DESC'
    },
    'credit_amount' => {
      label: 'Credit Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) AS credit_amount",
      order_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE 0 END) DESC"
    },
    'debit_amount' => {
      label: 'Debit Amount',
      select_sql: "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) AS debit_amount",
      order_sql: "SUM(CASE WHEN part_tran_type = 'DR' THEN tran_amt ELSE 0 END) DESC"
    },
    'net_flow' => {
      label: 'Net Flow',
      select_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE -tran_amt END) AS net_flow",
      order_sql: "SUM(CASE WHEN part_tran_type = 'CR' THEN tran_amt ELSE -tran_amt END) DESC"
    }
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
      measure_options: MEASURES.map { |key, meta| { value: key, label: meta[:label] } }
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

  def tran_summary_explorer(start_date:, end_date:, dimension:, measures:, filters:, page: 1, page_size: 25)
    dimension_key = dimension.to_s
    measure_keys = Array(measures).filter_map do |measure|
      value = measure.to_s
      value if MEASURES.key?(value)
    end

    raise ArgumentError, "Unsupported dimension: #{dimension_key}" unless DIMENSIONS.key?(dimension_key)
    raise ArgumentError, 'At least one valid measure is required' if measure_keys.empty?

    normalized_page = [page.to_i, 1].max
    normalized_page_size = [[page_size.to_i, 1].max, 100].min
    dimension_sql = DIMENSIONS.fetch(dimension_key).fetch(:sql)
    selected_measures = measure_keys.map { |key| MEASURES.fetch(key) }
    select_inner = "SELECT #{dimension_sql} AS dimension, #{selected_measures.map { |meta| meta[:select_sql] }.join(', ')}"
    where_clause = explorer_where_clause(start_date: start_date, end_date: end_date, filters: filters)
    groupby_clause = "GROUP BY #{dimension_sql}"
    orderby_clause = "ORDER BY #{selected_measures.first.fetch(:order_sql)}"

    with_connection do
      @connection.execute(<<~SQL.squish)
        CALL public.get_tran_summary(
          select_outer => #{@connection.quote('SELECT tb2.*')},
          select_inner => #{@connection.quote(select_inner)},
          where_clause => #{@connection.quote(where_clause)},
          prevdate_where => '',
          thismonth_where => '',
          thisyear_where => '',
          prevmonth_where => '',
          prevyear_where => '',
          prevmonthmtd_where => '',
          prevyearytd_where => '',
          prevmonthsamedate_where => '',
          prevyearsamedate_where => '',
          groupby_clause => #{@connection.quote(groupby_clause)},
          having_clause => '',
          orderby_clause => #{@connection.quote(orderby_clause)},
          partitionby_clause => '',
          eab_join => '',
          user_id => '',
          page => #{normalized_page},
          page_size => #{normalized_page_size}
        )
      SQL

      rows = @connection.exec_query('SELECT * FROM result').to_a
      total_rows = rows.first&.fetch('pivoted_totalrows', rows.length).to_i
      sanitized_rows = rows.map { |row| row.except('rn', 'pivoted_totalrows', 'total_rows', 'RN') }
      columns = sanitized_rows.first&.keys || (['dimension'] + measure_keys)

      {
        dimension: dimension_key,
        measures: measure_keys,
        columns: columns,
        rows: sanitized_rows,
        total_rows: total_rows,
        page: normalized_page,
        page_size: normalized_page_size,
        sql_preview: {
          select_inner: select_inner,
          where_clause: where_clause,
          groupby_clause: groupby_clause,
          orderby_clause: orderby_clause
        }
      }
    end
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

  def explorer_where_clause(start_date:, end_date:, filters:)
    clauses = [
      "tran_date BETWEEN #{@connection.quote(start_date.to_s)} AND #{@connection.quote(end_date.to_s)}"
    ]

    {
      'gam_branch' => filters[:branch],
      'gam_province' => filters[:province],
      'gam_cluster' => filters[:cluster],
      'gam_solid' => filters[:solid],
      'tran_source' => filters[:tran_source],
      'part_tran_type' => filters[:part_tran_type],
      'product' => filters[:product],
      'service' => filters[:service],
      'merchant' => filters[:merchant],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user' => filters[:entry_user],
      'vfd_user' => filters[:vfd_user]
    }.each do |column, value|
      normalized = normalize_filter_values(value)
      next if normalized.empty?

      clauses << "#{column} IN (#{quoted_values(normalized)})"
    end

    if filters[:acct_num].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:acct_num].to_s.strip)}%"
      clauses << "acct_num::text ILIKE #{@connection.quote(pattern)}"
    end

    if filters[:cif_id].present?
      pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:cif_id].to_s.strip)}%"
      clauses << "cif_id::text ILIKE #{@connection.quote(pattern)}"
    end

    clauses << "tran_amt >= #{@connection.quote(filters[:min_amount])}" unless filters[:min_amount].nil?
    clauses << "tran_amt <= #{@connection.quote(filters[:max_amount])}" unless filters[:max_amount].nil?

    "WHERE #{clauses.join(' AND ')}"
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
      yield
    ensure
      @connection = previous
    end
  end
end
