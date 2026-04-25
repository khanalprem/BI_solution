# Be sure to restart your server when you modify this file.
#
# SECURITY (H-4, fixed 2026-04-25):
# - Production fails fast if FRONTEND_URL is unset (no localhost fallback).
# - Production also requires an HTTPS origin.
# - `credentials: true` removed: the API authenticates via the Authorization
#   bearer header (see frontend/lib/api.ts). Cookies are not used for the
#   API, so credentials must NOT be allowed cross-origin — that prevents a
#   compromised origin from reading authenticated responses with cookies.
# - `headers: :any` narrowed to the specific headers the frontend sends.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.production?
      url = ENV['FRONTEND_URL'] || raise('FRONTEND_URL must be set in production')
      raise 'FRONTEND_URL must be HTTPS in production' unless url.start_with?('https://')
      origins url
    else
      origins ENV.fetch('FRONTEND_URL', 'http://localhost:3000')
    end

    resource '/api/*',
      headers: %w[Authorization Content-Type Accept X-Requested-With],
      methods: %i[get post put patch delete options head],
      expose:  %w[Authorization],
      max_age: 600
      # credentials: false (default) — bearer-token auth, no cookies needed.
  end
end
