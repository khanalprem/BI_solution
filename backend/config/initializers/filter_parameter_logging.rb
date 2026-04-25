# Be sure to restart your server when you modify this file.

# Configure parameters to be partially matched (e.g. passw matches password) and filtered from the log file.
# Use this to limit dissemination of sensitive information.
# See the ActiveSupport::ParameterFilter documentation for supported notations and behaviors.
Rails.application.config.filter_parameters += [
  # SECURITY (L-1, fixed 2026-04-25): explicit `password*` patterns added
  # so future param renames are still filtered. PII patterns added too —
  # this is a banking platform; better to over-filter than leak in logs.
  :passw, :password, :password_confirmation, :password_digest,
  :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn,
  :phone_number, :date_of_birth, :address, :first_name, :last_name,
  :acct_num, :cif_id, :acid
]
