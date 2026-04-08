class Gam < ApplicationRecord
  self.table_name = 'gam'
  self.primary_key = nil

  def self.table_available?
    connection.data_source_exists?(table_name)
  rescue StandardError
    false
  end
end
