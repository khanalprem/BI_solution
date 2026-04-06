class Eab < ApplicationRecord
  self.table_name = 'eab'
  self.primary_key = nil

  scope :for_account, ->(acid) { where(acid: acid) }
  scope :on_date, ->(date) { where(balance_date: date) }

  def self.balance_for(acid, date)
    where(acid: acid)
      .where(balance_date: date)
      .pick(:eod_balance)&.to_f || 0
  end

  def self.balances_for_accounts(acids, date)
    where(acid: acids, balance_date: date)
      .pluck(:acid, :eod_balance)
      .to_h
  end

  def self.balance_history(acid, start_date, end_date)
    where(acid: acid, balance_date: start_date..end_date)
      .order(:balance_date)
      .pluck(:balance_date, :eod_balance)
      .map { |date, balance| { date: date, balance: balance.to_f } }
  end
end
