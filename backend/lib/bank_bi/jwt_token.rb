# frozen_string_literal: true

# Single source of truth for JWT encode/decode in BankBI.
# Was previously duplicated across ApplicationController and AuthController.
# See CLAUDE.md "Authentication & Authorization" for the full contract.
#
# Claims:
#   user_id, email — minimum needed for `authenticate_user!` to find the User.
#                    Role is intentionally NOT embedded so role changes take
#                    effect immediately without waiting for token expiry.
#   iss, aud       — pinned constants; decode rejects tokens minted by other
#                    services that happen to share our secret.
#   iat, nbf, exp  — standard time claims; verified on decode.
module BankBi
  module JwtToken
    ALGORITHM = 'HS256'
    ISSUER    = 'bankbi'
    AUDIENCE  = 'bankbi-frontend'
    TTL       = 8.hours

    module_function

    def encode(user)
      now = Time.current
      payload = {
        user_id: user.id,
        email:   user.email,
        iss:     ISSUER,
        aud:     AUDIENCE,
        iat:     now.to_i,
        nbf:     now.to_i,
        exp:     (now + TTL).to_i
      }
      JWT.encode(payload, secret, ALGORITHM)
    end

    # Returns the decoded payload hash on success, nil on any decode failure
    # (bad signature, expired, wrong iss/aud, malformed). Callers must check.
    def decode(token)
      JWT.decode(
        token,
        secret,
        true,
        algorithm:  ALGORITHM,
        iss:        ISSUER,
        aud:        AUDIENCE,
        verify_iss: true,
        verify_aud: true,
        verify_iat: true
      ).first
    rescue JWT::DecodeError
      nil
    end

    def secret
      if Rails.env.production?
        ENV.fetch('JWT_SECRET_KEY') do
          raise 'JWT_SECRET_KEY env var must be set in production'
        end
      else
        ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
      end
    end
  end
end
