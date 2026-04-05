# Eab (End-of-day Account Balance) model for existing eab table
# DO NOT create migration - table already exists in your database
class Eab < ApplicationRecord
  self.table_name = 'eab'
  self.primary_key = nil
  
  # Find balance for a single account on specific date
  def self.balance_for(acid, date)
    where('? BETWEEN eod_date AND end_eod_date', date)
      .where(acid: acid)
      .first&.tran_date_bal || 0
  end
  
  # Get balances for multiple accounts at once
  def self.balances_for_accounts(acids, date)
    where('? BETWEEN eod_date AND end_eod_date', date)
      .where(acid: acids)
      .pluck(:acid, :tran_date_bal)
      .to_h
  end
  
  # Get balance history for an account
  def self.balance_history(acid, start_date, end_date)
    connection.execute(
      sanitize_sql_array([
        "SELECT DISTINCT ON (date_series.date) 
          date_series.date,
          COALESCE(e.tran_date_bal, 0) as balance
        FROM generate_series(?::date, ?::date, '1 day'::interval) as date_series(date)
        LEFT JOIN eab e ON e.acid = ? 
          AND date_series.date BETWEEN e.eod_date AND e.end_eod_date
        ORDER BY date_series.date, e.eod_date DESC",
        start_date, end_date, acid
      ])
    ).to_a
  end
end
