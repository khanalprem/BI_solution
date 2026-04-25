# frozen_string_literal: true
#
# SECURITY (H-2, added 2026-04-25): rate-limits authentication and procedure
# endpoints to defeat credential stuffing and brute-force enumeration. Run
# `bundle install` (rack-attack is in the Gemfile) before this initializer
# loads — without the gem we silently no-op so dev boots don't break.

return unless defined?(Rack::Attack)

class Rack::Attack
  ### Throttle sign-in attempts
  # 5 attempts per IP per minute. After 5 in a row the IP gets a 429.
  throttle('signin/ip', limit: 5, period: 60) do |req|
    req.ip if req.path == '/api/v1/auth/signin' && req.post?
  end

  # 5 attempts per email per minute — defeats distributed brute force on a
  # single account. Falls back to IP if no email param present.
  throttle('signin/email', limit: 5, period: 60) do |req|
    if req.path == '/api/v1/auth/signin' && req.post?
      email = req.params['email'].to_s.downcase.strip
      email.presence || req.ip
    end
  end

  ### Generic API throttle (everything under /api/)
  # Generous default — 300 req/min/IP. Tune down per environment if needed.
  throttle('api/ip', limit: 300, period: 60) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  ### Procedure-backed endpoints — narrower limit because each call hits the
  ### production stored procedures (get_tran_summary, get_deposit, …) and
  ### eats DB CPU on cache miss.
  throttle('procs/ip', limit: 30, period: 60) do |req|
    if req.path.start_with?('/api/v1/production/') ||
       req.path.start_with?('/api/v1/dashboards/')
      req.ip
    end
  end

  ### Custom 429 response body
  self.throttled_responder = lambda do |request|
    match_data = request.env['rack.attack.match_data'] || {}
    retry_after = (match_data[:period] || 60).to_i
    [
      429,
      { 'Content-Type' => 'application/json', 'Retry-After' => retry_after.to_s },
      [{ error: 'Too many requests. Please slow down and try again later.' }.to_json]
    ]
  end
end

Rails.application.config.middleware.use Rack::Attack
