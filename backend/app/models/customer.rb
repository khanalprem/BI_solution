class Customer < ApplicationRecord
  # customer_id (varchar) is the CIF ID — matches tran_summary.cif_id and gam.cif_id
  # Holds personal info imported from the banking system:
  # first_name, last_name, email, phone_number, address, date_of_birth, status
  scope :active, -> { where(status: 'A') }
end
