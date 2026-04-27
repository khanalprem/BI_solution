# frozen_string_literal: true
#
# SECURITY (M-2, fixed 2026-04-27): pin bcrypt work factor. Rails default is
# 12 in production and 4 in test. For a banking workload where the threat is
# offline cracking after a DB compromise, 13 is a reasonable target — roughly
# 2× slower than 12 on the same hardware, still well under 1s per hash on a
# typical app server. Tune up (14+) once we benchmark sign-in latency under
# production load. Test/dev stay low so the suite remains fast.

if defined?(BCrypt::Engine)
  BCrypt::Engine.cost =
    if Rails.env.production?
      ENV.fetch('BCRYPT_COST', 13).to_i
    else
      4
    end
end
