class Customer < ApplicationRecord
  validates :customer_id, presence: true, uniqueness: true
  
  SEGMENTS = ['Mass Retail', 'Affluent', 'SME', 'Private Banking']
  KYC_TIERS = [1, 2, 3]
  
  scope :active, -> { where(status: 'active') }
  scope :by_segment, ->(segment) { where(segment: segment) if segment.present? }
  
  def transactions(start_date, end_date)
    TranSummary.where(
      cif_id: customer_id,
      tran_date: start_date..end_date
    )
  end
  
  def transaction_summary(start_date, end_date)
    txns = transactions(start_date, end_date)
    
    {
      total_amount: txns.sum(:tran_amt) || 0,
      total_count: txns.sum(:tran_count) || 0,
      accounts_used: txns.distinct.pluck(:acct_num).count
    }
  end
end
