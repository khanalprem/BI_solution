class Branch < ApplicationRecord
  validates :branch_code, presence: true, uniqueness: true
  
  PROVINCES = ['Bagmati', 'Gandaki', 'Lumbini', 'Madhesh', 'Koshi', 'Karnali', 'Sudurpashchim']
  
  scope :active, -> { where(active: true) }
  scope :by_province, ->(province) { where(province: province) if province.present? }
  
  def transactions(start_date, end_date)
    TranSummary.where(
      gam_branch: branch_code,
      tran_date: start_date..end_date
    )
  end
  
  def transaction_summary(start_date, end_date)
    txns = transactions(start_date, end_date)
    
    {
      total_amount: txns.sum(:tran_amt) || 0,
      total_count: txns.sum(:tran_count) || 0,
      unique_accounts: txns.distinct.count(:acct_num),
      unique_customers: txns.distinct.count(:cif_id)
    }
  end
end
