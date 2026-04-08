class Eab < ApplicationRecord
  self.table_name = 'eab'
  self.primary_key = nil

  # Production columns: acid, eod_date, end_eod_date, tran_date_bal,
  # tran_date_tot_tran, value_date_bal, value_date_tot_tran, eab_crncy_code, lchg_time

  scope :for_account, ->(acid) { where(acid: acid) }
  scope :on_date, ->(date) { where('eod_date <= ? AND end_eod_date >= ?', date, date) }

  def self.balance_for(acid, date)
    where(acid: acid)
      .where('eod_date <= ? AND end_eod_date >= ?', date, date)
      .pick(:tran_date_bal)&.to_f || 0
  end

  def self.balances_for_accounts(acids, date)
    where(acid: acids)
      .where('eod_date <= ? AND end_eod_date >= ?', date, date)
      .pluck(:acid, :tran_date_bal)
      .to_h
  end

  def self.balance_history(acid, start_date, end_date)
    where(acid: acid)
      .where('eod_date >= ? AND eod_date <= ?', start_date, end_date)
      .order(:eod_date)
      .pluck(:eod_date, :tran_date_bal)
      .map { |date, balance| { date: date, balance: balance.to_f } }
  end
end
