class CreateEab < ActiveRecord::Migration[7.2]
  def change
    create_table :eab, id: false do |t|
      t.string :acct_num
      t.string :acid
      t.date :balance_date
      t.decimal :eod_balance, precision: 18, scale: 2
      t.string :currency, default: 'NPR'
      
      t.timestamps
    end
    
    # Indexes for efficient queries
    add_index :eab, :acct_num
    add_index :eab, :acid
    add_index :eab, :balance_date
    add_index :eab, [:acct_num, :balance_date]
  end
end
