class AddCompositeIndexesToTranSummary < ActiveRecord::Migration[7.2]
  def change
    add_index :tran_summary, [:tran_date, :tran_source],
              name: 'idx_tran_summary_date_source'

    add_index :tran_summary, [:tran_date, :cif_id],
              name: 'idx_tran_summary_date_cif'

    add_index :tran_summary, [:cif_id, :tran_date],
              name: 'idx_tran_summary_cif_date'

    add_index :tran_summary, [:tran_date, :gam_branch, :gam_province],
              name: 'idx_tran_summary_date_branch_province'

    add_index :tran_summary, :tran_source,
              name: 'idx_tran_summary_tran_source'

    add_index :tran_summary, :part_tran_type,
              name: 'idx_tran_summary_part_tran_type'
  end
end
