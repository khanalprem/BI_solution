class CreateBranches < ActiveRecord::Migration[7.2]
  def change
    create_table :branches do |t|
      t.string :branch_code
      t.string :name
      t.string :province
      t.string :district
      t.string :municipality
      t.string :cluster
      t.string :category
      t.boolean :active

      t.timestamps
    end
    add_index :branches, :branch_code, unique: true
  end
end
