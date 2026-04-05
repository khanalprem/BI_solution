class CreateCustomers < ActiveRecord::Migration[7.2]
  def change
    create_table :customers do |t|
      t.string :customer_id
      t.string :full_name
      t.string :segment
      t.integer :kyc_risk_tier
      t.string :status

      t.timestamps
    end
    add_index :customers, :customer_id, unique: true
  end
end
