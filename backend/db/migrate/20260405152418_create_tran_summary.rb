class CreateTranSummary < ActiveRecord::Migration[7.2]
  def change
    # IMPORTANT: tran_summary is a production warehouse table.
    # Only create if it doesn't exist — never drop/recreate.
    return if table_exists?(:tran_summary)

    create_table :tran_summary, id: false do |t|
      # Account identifiers
      t.string :acct_num
      t.string :acid
      t.string :cif_id
      t.string :acct_name
      
      # Branch dimensions (GAM - Account's home branch)
      t.string :gam_solid
      t.string :gam_branch
      t.string :gam_province
      t.string :gam_cluster_id
      t.string :gam_cluster
      
      # Transaction branch dimensions
      t.string :tran_branch
      t.string :tran_cluster_id
      t.string :tran_cluster
      t.string :tran_province
      t.string :tran_solid
      
      # Time dimensions
      t.date :date
      t.integer :year
      t.integer :quarter
      t.integer :month
      t.string :year_quarter
      t.string :year_month
      t.date :month_startdate
      t.date :month_enddate
      t.date :quarter_startdate
      t.date :quarter_enddate
      t.date :year_startdate
      t.date :year_enddate
      t.date :tran_date
      
      # Transaction details
      t.string :tran_type
      t.string :part_tran_type
      t.decimal :tran_amt, precision: 18, scale: 2
      t.integer :tran_count
      t.decimal :signed_tranamt, precision: 18, scale: 2
      
      # GL and user tracking
      t.string :gl_sub_head_code
      t.string :entry_user
      t.string :entry_user_id
      t.string :vfd_user
      t.string :vfd_user_id
      
      # Balance
      t.decimal :eod_balance, precision: 18, scale: 2
      
      # Additional dimensions
      t.string :merchant
      t.string :service
      t.string :product
      t.string :tran_source
      
      # Row identifier (from CSV)
      t.string :row_id
      
      t.timestamps
    end
    
    # Add indexes for performance
    add_index :tran_summary, :tran_date
    add_index :tran_summary, :gam_branch
    add_index :tran_summary, :gam_province
    add_index :tran_summary, :tran_branch
    add_index :tran_summary, :tran_province
    add_index :tran_summary, :acct_num
    add_index :tran_summary, :cif_id
    add_index :tran_summary, :tran_type
    add_index :tran_summary, [:tran_date, :gam_branch]
    add_index :tran_summary, [:tran_date, :gam_province]
  end
end
