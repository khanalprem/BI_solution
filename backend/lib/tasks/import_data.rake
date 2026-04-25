namespace :db do
  IMPORT_BATCH_SIZE = ENV.fetch('IMPORT_BATCH_SIZE', 2_000).to_i

  desc "Import sample data from CSV"
  task import_sample: :environment do
    require 'csv'
    
    csv_file = Rails.root.join('..', 'sample data.csv')
    
    unless File.exist?(csv_file)
      puts "❌ File not found: #{csv_file}"
      puts "Please ensure 'sample data.csv' is in the project root"
      exit 1
    end
    
    puts "📊 Importing sample data from #{File.basename(csv_file)}..."
    puts ""
    
    # Read CSV headers first
    headers = CSV.open(csv_file, &:readline)
    puts "Columns found: #{headers.join(', ')}"
    puts ""
    
    imported = 0
    errors = 0

    timestamp = Time.current
    batch = []

    flush_batch = lambda do
      next 0 if batch.empty?

      begin
        inserted = batch.size
        TranSummary.insert_all(batch)
        batch.clear
        inserted
      rescue StandardError => e
        puts "\nBatch insert failed (#{e.message}). Falling back to row-by-row insert..."

        inserted = 0
        batch.each do |attrs|
          begin
            TranSummary.create!(attrs)
            inserted += 1
          rescue StandardError => row_error
            errors += 1
            puts "  Row error: #{row_error.message}" if errors < 10
          end
        end
        batch.clear
        inserted
      end
    end

    CSV.foreach(csv_file, headers: true).with_index(2) do |row, line_number|
      begin
        batch << tran_summary_attributes_from_row(row, timestamp)
        imported += flush_batch.call if batch.size >= IMPORT_BATCH_SIZE
        print "\rImported #{imported} records..." if (imported % 1_000).zero? && imported.positive?
      rescue StandardError => e
        errors += 1
        puts "\nError on line #{line_number}: #{e.message}" if errors < 10
      end
    end

    imported += flush_batch.call

    puts "\n"
    puts "Import complete."
    puts "   - Successfully imported: #{imported} records"
    puts "   - Errors: #{errors} records" if errors.positive?
    puts ""
    puts "Test queries:"
    puts "  TranSummary.count"
    puts "  TranSummary.by_date_range(30.days.ago, Date.today).sum(:tran_amt)"
    puts "  TranSummary.apply_filters(start_date: 30.days.ago, end_date: Date.today).group(:gam_province).count"
  end
  
  desc "Create sample branches from tran_summary data"
  task create_sample_branches: :environment do
    puts "📍 Creating branch records from tran_summary..."
    
    branches_data = TranSummary.select('DISTINCT gam_branch, gam_province, gam_cluster')
                                .where.not(gam_branch: nil)
                                .limit(100)
    
    count = 0
    branches_data.each do |record|
      Branch.find_or_create_by(branch_code: record.gam_branch) do |branch|
        branch.name = record.gam_branch
        branch.province = record.gam_province
        branch.cluster = record.gam_cluster
        branch.active = true
        count += 1
      end
    end
    
    puts "✅ Created #{count} branch records"
  end
  
  desc "Create sample customers from tran_summary data"
  task create_sample_customers: :environment do
    puts "👥 Creating customer records from tran_summary..."
    
    customers_data = TranSummary.select('DISTINCT cif_id, acct_name')
                                 .where.not(cif_id: nil)
                                 .limit(100)
    
    count = 0
    customers_data.each do |record|
      Customer.find_or_create_by(customer_id: record.cif_id) do |customer|
        customer.full_name = record.acct_name
        customer.segment = ['Mass Retail', 'Affluent', 'SME'].sample
        customer.kyc_risk_tier = [1, 2, 3].sample
        customer.status = 'active'
        count += 1
      end
    end
    
    puts "✅ Created #{count} customer records"
  end
  
  desc "Import all sample data (transactions, branches, customers)"
  task import_all: :environment do
    Rake::Task['db:import_sample'].invoke
    Rake::Task['db:create_sample_branches'].invoke
    Rake::Task['db:create_sample_customers'].invoke
    
    puts ""
    puts "🎉 All sample data imported successfully!"
    puts ""
    puts "Statistics:"
    puts "  Transactions: #{TranSummary.count}"
    puts "  Branches: #{Branch.count}"
    puts "  Customers: #{Customer.count}"
  end

  def safe_date(value)
    return nil if value.blank?
    Date.parse(value)
  rescue ArgumentError
    nil
  end

  def safe_integer(value)
    return nil if value.blank?
    Integer(value)
  rescue ArgumentError, TypeError
    nil
  end

  def safe_decimal(value)
    return nil if value.blank?
    BigDecimal(value.to_s)
  rescue ArgumentError
    nil
  end

  def tran_summary_attributes_from_row(row, timestamp)
    {
      acct_num: row['acct_num'],
      acid: row['acid'],
      cif_id: row['cif_id'],
      acct_name: row['acct_name'],
      gam_solid: row['gam_solid'],
      gam_branch: row['gam_branch'],
      gam_province: row['gam_province'],
      gam_cluster_id: row['gam_cluster_id'],
      gam_cluster: row['gam_cluster'],
      tran_branch: row['tran_branch'],
      tran_cluster_id: row['tran_cluster_id'],
      tran_cluster: row['tran_cluster'],
      tran_province: row['tran_province'],
      tran_solid: row['tran_solid'],
      date: safe_date(row['date']),
      year: safe_integer(row['year']),
      quarter: safe_integer(row['quarter']),
      month: safe_integer(row['month']),
      year_quarter: row['year_quarter'],
      year_month: row['year_month'],
      month_startdate: safe_date(row['month_startdate']),
      month_enddate: safe_date(row['month_enddate']),
      quarter_startdate: safe_date(row['quarter_startdate']),
      quarter_enddate: safe_date(row['quarter_enddate']),
      year_startdate: safe_date(row['year_startdate']),
      year_enddate: safe_date(row['year_enddate']),
      tran_date: safe_date(row['tran_date']),
      tran_type: row['tran_type'],
      part_tran_type: row['part_tran_type'],
      tran_amt: safe_decimal(row['tran_amt']) || 0,
      tran_count: safe_integer(row['tran_count']) || 0,
      signed_tranamt: safe_decimal(row['signed_tranamt']),
      gl_sub_head_code: row['gl_sub_head_code'],
      entry_user: row['entry_user'],
      entry_user_id: row['entry_user_id'],
      vfd_user: row['vfd_user'],
      vfd_user_id: row['vfd_user_id'],
      eod_balance: safe_decimal(row['eod_balance']),
      merchant: row['merchant'],
      service: row['service'],
      product: row['product'],
      tran_source: row['tran_source'],
      created_at: timestamp,
      updated_at: timestamp
    }
  end
end
