# BankBI — Security Review

**Reviewer:** Senior Security Engineer (audit)
**Date:** 2026-04-25
**Scope:** Rails 7 API (`backend/`) + Next.js 15 frontend (`frontend/`)
**Methodology:** Manual code review of every controller, service, model, config initializer, frontend auth surface, and middleware. No DAST, no dependency CVE scan (run `bundle exec brakeman` and `npm audit` separately — the gem is already in the Gemfile).

> **Bottom line:** This is a banking BI platform that today serves PII (DOB, address, phone, account-level transaction history) over an unauthenticated API. **Anyone on the network can `curl` the entire customer book.** Several other "defined-but-never-called" controls (PII gate, branch scoping, role hierarchy) compound the impact. Items C-1 through C-5 must be fixed before this is exposed beyond a closed network.

---

## Severity Legend

- **CRITICAL** — Direct path to data exfiltration, account takeover, or full bypass. Fix immediately.
- **HIGH** — Material increase in attack surface or exploitability; fix before any external pilot.
- **MEDIUM** — Defense-in-depth weakness, fragile pattern, or compliance gap.
- **LOW** — Cosmetic, informational, or low-impact hardening opportunity.

---

## Executive summary

| # | ID | Severity | Title |
|---|----|----------|-------|
| 1 | C-1 | **CRITICAL** | All dashboard / production / customer endpoints are publicly accessible (auth bypass via `BaseController#skip_before_action`) |
| 2 | C-2 | **CRITICAL** | Customer PII (DOB, email, phone, address) returned without role check; `can_see_pii?` defined but never enforced |
| 3 | C-3 | **CRITICAL** | Branch scoping (`scoped_branch_filter`) defined but never invoked — `branch_staff` users see every branch |
| 4 | C-4 | **CRITICAL** | Privilege escalation: any admin can create or promote a user to `superadmin` via `UsersController` |
| 5 | C-5 | **CRITICAL** | Frontend ships hard-coded demo credentials and a fake client-side `/signup` that stores plaintext passwords in `localStorage` |
| 6 | H-1 | HIGH | JWT secret falls back to `secret_key_base`; no `iss`/`aud`; 24h expiry without rotation/revocation |
| 7 | H-2 | HIGH | No rate limiting on `/auth/signin` — credential stuffing is unbounded |
| 8 | H-3 | HIGH | `bankbi-auth=1` cookie is the only thing the Next.js middleware checks — can be set client-side; no real auth gate |
| 9 | H-4 | HIGH | CORS allows full credentials from `FRONTEND_URL` with a `localhost:3000` fallback if the env var is missing |
| 10 | H-5 | HIGH | JWT stored in `localStorage` — any XSS exfiltrates the bearer token for the full 24h window |
| 11 | H-6 | HIGH | `/production/deposits` returns raw PostgreSQL error messages to the client (DB schema disclosure) |
| 12 | H-7 | HIGH | `config.hosts` not set in production — Host-header / DNS-rebinding attacks possible |
| 13 | H-8 | HIGH | No security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) |
| 14 | M-1 | MEDIUM | `User` password validation has no length / complexity rule beyond bcrypt's defaults |
| 15 | M-2 | MEDIUM | `production_branch_access` cached for 15 min with no invalidation on user update — branch-revocation lag |
| 16 | M-3 | MEDIUM | `ApplicationController#decode_jwt` and `AuthController#decode_jwt` are duplicated — single source of truth needed |
| 17 | M-4 | MEDIUM | `params[:row_dims].to_unsafe_h` bypasses strong params (filtered later, but pattern is risky) |
| 18 | M-5 | MEDIUM | `/dashboards/demographics`, `/dashboards/employee_detail`, `/filters/values` leak customer / employee identifiers without role checks |
| 19 | L-1 | LOW | `parameter_filter_logging.rb` filters `:passw` but should add `:password` and `:password_digest` explicitly |
| 20 | L-2 | LOW | `production_data_service.rb#htd_detail` uses `DROP TABLE IF EXISTS` outside an explicit transaction — race risk under concurrent calls on the same connection |

---

# Critical findings

## C-1 — Auth bypass on every dashboard / production / customer endpoint

**Severity:** CRITICAL
**Files:** `backend/app/controllers/api/v1/base_controller.rb:5-8`, `backend/app/controllers/application_controller.rb:2`

### Vulnerability

`ApplicationController` correctly enforces `before_action :authenticate_user!`, but `BaseController` (which every dashboard/production/filters controller inherits from) **skips it** and substitutes optional auth:

```ruby
class BaseController < ApplicationController
  # Dashboard/filter/production endpoints use optional auth for now.
  # TODO: Switch to required auth once all frontend flows include the token.
  skip_before_action :authenticate_user!
  before_action :authenticate_user_optional!
```

`authenticate_user_optional!` only sets `@current_user` if a token exists — it does not block anonymous traffic. Net effect: **every** route under `/api/v1/dashboards/*`, `/api/v1/production/*`, `/api/v1/filters/*` is callable with no token at all.

### Risk: CRITICAL

Returns customer PII, account-level balances, transaction history, GL aggregates, branch financials, employee productivity stats — the entire BI surface — to anyone who can reach the API.

### Exploit

```bash
# No token, no cookie, no anything — full executive dashboard:
curl https://bankbi.example.com/api/v1/dashboards/executive

# Customer profile with DOB, email, phone, address:
curl 'https://bankbi.example.com/api/v1/dashboards/customer_profile?cif_id=10042'

# Top 100 customers' names + amounts:
curl 'https://bankbi.example.com/api/v1/dashboards/customers_top?limit=100'

# Drilldown to raw ledger lines for any account:
curl 'https://bankbi.example.com/api/v1/production/htd_detail?row_dims[acct_num]=100011'
```

The Next.js middleware (`frontend/middleware.ts`) only checks a client-set cookie `bankbi-auth=1` — see H-3 — so it provides no defense at the API layer.

### Fix

`BaseController` must require auth by default and **allow-list** only the truly public routes (currently just `auth/signin`). Optional auth should be removed from the codebase to avoid relapse.

```ruby
# backend/app/controllers/api/v1/base_controller.rb
class BaseController < ApplicationController
  # Inherit required-auth from ApplicationController. Each subclass that needs
  # public access (e.g. AuthController) must `skip_before_action :authenticate_user!`
  # explicitly with a justification comment.
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  # ...
end
```

`AuthController` already lives at `ActionController::API`, so signin remains public. `auth/me` reads its token directly and is fine to leave as-is.

A regression test must pin the contract:

```ruby
# spec/controllers/api/v1/base_controller_auth_spec.rb
it 'returns 401 without a token' do
  get '/api/v1/dashboards/executive'
  expect(response).to have_http_status(:unauthorized)
end
```

---

## C-2 — Customer PII returned without `can_see_pii?` enforcement

**Severity:** CRITICAL
**Files:** `backend/app/controllers/api/v1/dashboards_controller.rb:108-177` (`customer_profile`), `:580-623` (`demographics`), `backend/app/models/user.rb:29-31`

### Vulnerability

`User#can_see_pii?` returns `true` only for `superadmin / admin / manager` (constants in `User.PII_ROLES`). It is **never called anywhere in the codebase** (`grep -r can_see_pii backend/app/controllers` → zero hits). `customer_profile` returns:

```ruby
first_name:    personal_info[:first_name],
last_name:     personal_info[:last_name],
email:         personal_info[:email],
phone_number:  personal_info[:phone_number],
address:       personal_info[:address],
date_of_birth: personal_info[:date_of_birth],
```

…to whatever `current_user` happens to be — which, after C-1, is `nil`.

`demographics` runs an unscoped query over `customers` joined to `tran_summary`, returning age-bucketed counts and amounts. No filters, no auth, no role check.

### Risk: CRITICAL

Privacy/compliance breach (GDPR Art. 32, NRB Customer Information & Confidentiality, KYC obligations). One leaked DOB + address tuple on every customer is a regulatory incident in itself.

### Exploit

```bash
# Combine C-1 + C-2 — full PII dump:
for cif in $(curl -s '.../customers_top?limit=500' | jq -r '.[].cif_id'); do
  curl -s ".../customer_profile?cif_id=$cif" | jq '{cif_id, first_name, last_name, email, phone_number, address, date_of_birth}'
done
```

### Fix

Add a `require_pii!` filter and call it from any endpoint that returns PII:

```ruby
# application_controller.rb
def require_pii!
  unless current_user&.can_see_pii?
    render json: { error: 'PII access not permitted for your role' }, status: :forbidden
  end
end
```

In `DashboardsController`:

```ruby
before_action :require_pii!, only: %i[customer_profile demographics]
```

For non-PII roles, scrub the personal-info payload before render (return `customer_name` only, omit DOB/email/phone/address). The patch in this commit redacts these fields when `current_user.can_see_pii?` is false rather than 403'ing the whole endpoint, so analysts can still see aggregates.

---

## C-3 — `branch_staff` scoping defined but never invoked

**Severity:** CRITICAL
**Files:** `backend/app/controllers/application_controller.rb:46-53`

### Vulnerability

`scoped_branch_filter(filters)` knows how to restrict a `branch_staff` user to their allowed branches via `User#allowed_branch_names`. Grep for usage: zero hits in any controller. The result: `branch_staff` users see every branch's data instead of only their own.

### Risk: CRITICAL

Internal need-to-know breach. A teller in Branch A can pull the executive dashboard, full customer book, and transaction detail for Branch B. This also undermines the regulatory expectation of role separation between branches.

### Fix

Wrap every dashboard / production endpoint's `filter_params.merge(...)` call with `scoped_branch_filter`. The patch in this commit moves it into a single helper method `scoped_filter_params` that every action uses, and adds a `before_action` that fails closed if `branch_scoped?` users have an empty allow-list.

```ruby
# application_controller.rb
def scoped_filter_params
  scoped_branch_filter(filter_params)
end
```

```ruby
# every dashboard action:
filters = scoped_filter_params.merge(start_date: start_date, end_date: end_date)
```

Add a regression test:

```ruby
it 'restricts branch_staff to their allowed branches' do
  user = create(:user, role: 'branch_staff')
  allow(user).to receive(:allowed_branch_names).and_return(['BRANCH-A'])
  sign_in(user)
  get '/api/v1/dashboards/executive', params: { branch: 'BRANCH-Z' }
  expect(assigns_filter[:branch]).to eq(['BRANCH-A'])
end
```

---

## C-4 — Privilege escalation in `UsersController`

**Severity:** CRITICAL
**Files:** `backend/app/controllers/api/v1/users_controller.rb:18-58, 84-92`

### Vulnerability

`UsersController#create` and `#update` both accept `params[:role]` directly:

```ruby
def user_params
  params.permit(:email, :password, :first_name, :last_name, :role,
                assigned_branches: [], assigned_provinces: [])
end
```

`require_admin!` allows `superadmin` and `admin`. So an `admin` can:

1. Create a brand-new `superadmin` account.
2. Promote any existing user (including themselves) to `superadmin`.
3. The "Cannot demote the last superadmin" check exists but there is no symmetric "admin cannot create or promote to a role above their own" check.

### Risk: CRITICAL

Persistent admin → root escalation. Combined with the `:all` permissions of `superadmin`, this is full backend compromise.

### Exploit

```bash
# Logged in as an admin token:
curl -X POST .../api/v1/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email":"attacker@example.com","password":"x","role":"superadmin"}'
```

### Fix

Enforce role-hierarchy: a user may only create/modify roles strictly *below* their own role level, except `superadmin` who can manage anyone. The `User::ROLE_LEVEL` map already exists and gives this for free.

```ruby
def authorize_role_assignment!(target_role)
  return if current_user.role == 'superadmin'
  return if target_role.blank?
  if User::ROLE_LEVEL[target_role].to_i <= User::ROLE_LEVEL[current_user.role].to_i
    render json: { error: "You cannot assign role '#{target_role}' (equal or higher than your own)" },
           status: :forbidden
  end
end
```

Call it in `create` (with `params[:role]`) and `update` (with `attrs[:role]` if present), and in `update` also block edits where `@user.role_level <= current_user.role_level` unless they are the same user editing their own non-role fields.

---

## C-5 — Demo credentials in production UI + insecure client-side signup

**Severity:** CRITICAL
**Files:** `frontend/app/signin/page.tsx:136-138`, `frontend/app/signup/page.tsx:54-77`

### Vulnerability A — Demo credentials shipped in the UI

```tsx
<div className="mt-4 p-3 rounded-lg bg-bg-input border border-border text-[11px] text-text-muted">
  Demo: <span className="text-text-primary font-medium">demo@gmail.com</span> /
        <span className="text-text-primary font-medium">demo</span>
</div>
```

This is rendered unconditionally on every signin page load — including in production builds. If a real `demo@gmail.com` user is provisioned (and based on the seed data pattern it likely is), anyone who finds the URL has admin or analyst-level access immediately.

### Vulnerability B — Fake registration

`/signup` does not call the backend. It writes the new account into `localStorage` under `bankbi-demo-users` as `[{email, password}]` in plaintext. Two problems:

1. The user thinks they have signed up but cannot log in — their credentials live nowhere the API knows about.
2. `localStorage` is shared across tabs and persisted indefinitely — any XSS exfiltrates a list of plaintext (email, password) pairs that the user almost certainly reused on other sites.

### Risk: CRITICAL

Trivial unauthorized access (Vuln A) plus credential theft / phishing chain (Vuln B).

### Fix

- Delete the demo-credentials hint card from `signin/page.tsx` (or gate it behind `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'` so production builds suppress it).
- Replace `signup/page.tsx` with either:
  - a real `POST /api/v1/users` flow gated behind admin token (treat signup as admin-driven onboarding — appropriate for an internal banking tool), or
  - a hard 404 that disables the route until backend signup is built.

The patch in this commit removes the hint card and rewrites `signup/page.tsx` to a "signup-by-invitation" placeholder that does not touch `localStorage`.

---

# High findings

## H-1 — JWT weaknesses

**Severity:** HIGH
**Files:** `backend/app/controllers/api/v1/auth_controller.rb:58-67`, `application_controller.rb:59-64`

```ruby
secret = ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
payload = { user_id: user.id, email: user.email, role: user.role, exp: 24.hours.from_now.to_i }
JWT.encode(payload, secret, 'HS256')
```

Issues:

1. **Silent fallback** to `secret_key_base` if `JWT_SECRET_KEY` is unset — encryption mixed with auth keying.
2. **24-hour expiry** with no refresh, no `jti`, no revocation list — a stolen token is good for a full day.
3. **No `iss` / `aud` / `nbf` / `iat`** claims; decode does not assert any of these.
4. **Role is embedded** in the payload — if you demote a user, their old role survives until `exp`.
5. The decode helper is duplicated in two files (drift risk).

### Fix

- Require `JWT_SECRET_KEY` in production (raise on boot if missing).
- Add `iat`, `nbf`, `iss: 'bankbi'`, `aud: 'bankbi-frontend'`; verify all of them in decode.
- Drop expiry to 8 hours and add a refresh endpoint, or move to an opaque session table with revocation.
- Re-fetch the user's role from the DB on every authenticate (already partially done — keep it that way; do not trust `payload['role']`).
- Centralize JWT encode/decode in `lib/jwt_helper.rb` and have both controllers `include` it.

The patch in this commit applies the production-secret guard, the iss/aud claims, drops expiry to 8h, and centralizes the helper.

## H-2 — No rate limiting

**Severity:** HIGH
**File:** none — Rack::Attack not installed

`/auth/signin` accepts unlimited POSTs. An attacker can brute-force any account. There is also no per-IP throttle on the expensive procedure-backed endpoints (`/production/explorer`, `/dashboards/executive` — see the cache TTL in `cached(...)` is 15 min, so the per-key cache shields the DB but not from initial cache-miss DoS).

### Fix

Add `gem 'rack-attack'` to the Gemfile and an initializer:

```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  throttle('signin/ip', limit: 5,  period: 1.minute) { |r| r.ip if r.path == '/api/v1/auth/signin' && r.post? }
  throttle('signin/email', limit: 5, period: 1.minute) do |r|
    if r.path == '/api/v1/auth/signin' && r.post?
      (r.params['email'] || '').to_s.downcase.strip.presence
    end
  end
  throttle('api/ip', limit: 300, period: 1.minute) { |r| r.ip if r.path.start_with?('/api/') }
  throttle('procs/ip', limit: 30, period: 1.minute) do |r|
    r.ip if r.path.start_with?('/api/v1/production/') || r.path.start_with?('/api/v1/dashboards/')
  end
end

Rails.application.config.middleware.use Rack::Attack
```

The patch in this commit adds the gem (you will need to `bundle install`) and the initializer.

## H-3 — `bankbi-auth=1` cookie is the only frontend gate

**Severity:** HIGH
**File:** `frontend/middleware.ts:14`

```ts
const hasAuthSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
```

The cookie is set client-side after signin (`document.cookie = 'bankbi-auth=1'`) — it is **not signed**, **not HttpOnly**, **not the JWT**. Setting `document.cookie='bankbi-auth=1'` from the browser console (or DevTools → Application → Cookies → Add row) bypasses the middleware redirect entirely. After that, the dashboard pages load and call the API directly with whatever Authorization header is in `localStorage` — and per C-1 the API does not require one.

### Fix

Stop pretending this is auth. Either:
1. Move the JWT into an HttpOnly, Secure, SameSite=Lax cookie set by the backend on signin, and have the middleware verify it server-side via `next/jose`.
2. Or accept that the frontend gate is purely UX and rely entirely on the backend (after C-1 is fixed) to enforce authentication.

This audit recommends (2) for now — the patch keeps the cookie as a UX hint, and the backend fix in C-1 is the actual control. The cookie should be renamed `bankbi-ui-session` to make its non-security role obvious.

## H-4 — Permissive CORS with credentials

**Severity:** HIGH
**File:** `backend/config/initializers/cors.rb`

```ruby
origins ENV.fetch('FRONTEND_URL', 'http://localhost:3000')
resource '*', headers: :any, methods: [:get, :post, :put, :patch, :delete, :options, :head], credentials: true
```

`credentials: true` means a malicious origin that gets past the origin check can read responses with cookies attached. The fallback to `localhost:3000` if `FRONTEND_URL` is unset means a misconfigured production deploy silently accepts cross-origin requests from `http://localhost:3000` — a foothold an attacker on `localhost` (e.g. an internal proxy, a reverse-tunneled dev server) can use.

### Fix

In production, fail loudly if `FRONTEND_URL` is missing. Require HTTPS origins. Drop `credentials: true` if you move to bearer-token auth (which you should — the Authorization header is enough; cookies are not used for the API).

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.production?
      url = ENV['FRONTEND_URL'] or raise 'FRONTEND_URL must be set in production'
      raise 'FRONTEND_URL must be HTTPS' unless url.start_with?('https://')
      origins url
    else
      origins ENV.fetch('FRONTEND_URL', 'http://localhost:3000')
    end
    resource '/api/*',
      headers: %w[Authorization Content-Type Accept],
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose:  %w[Authorization],
      max_age: 600
      # credentials: false — Authorization header in api.ts is the only auth carrier
  end
end
```

The patch applies this.

## H-5 — JWT in localStorage (XSS-stealable)

**Severity:** HIGH
**File:** `frontend/lib/api.ts:19`, `frontend/lib/auth.ts:71-76`

`localStorage.setItem('token', token)` makes the JWT readable from any JavaScript on the same origin. The current codebase has only one `dangerouslySetInnerHTML` usage (the theme bootstrap script in `app/layout.tsx:50` — content is a hardcoded string, not user-controlled, so safe), but adding any user-rendered HTML in the future would immediately become a token-exfiltration sink.

### Fix

Move JWT to an HttpOnly, Secure, SameSite=Lax cookie issued by the backend. Frontend never sees the token. `api.ts` becomes:

```ts
const apiClient = axios.create({
  baseURL: ...,
  withCredentials: true, // browser sends the HttpOnly cookie
});
```

This is a multi-day refactor (backend signin must `Set-Cookie`; CORS must allow credentials with a precise origin; existing `localStorage.getItem('token')` call sites must be removed). Logged as follow-up — the patch in this commit does NOT change this, but adds a CSP that mitigates XSS as an interim control (H-8).

## H-6 — Raw PostgreSQL error message returned to client

**Severity:** HIGH
**File:** `backend/app/controllers/api/v1/production_controller.rb:92-106`

```ruby
rescue ActiveRecord::StatementInvalid, PG::Error => e
  render json: { error: e.message.to_s.lines.first.to_s.strip }, status: :internal_server_error
end
```

PG error messages routinely include column names, table names, and the offending SQL fragment. An attacker can send malformed inputs and map the schema from the responses.

### Fix

Log the full error server-side (already done) but return a generic message to the client. The patch returns `{ error: 'Deposit query failed', request_id: request.request_id }`.

## H-7 — `config.hosts` not set

**Severity:** HIGH
**File:** `backend/config/environments/production.rb:78-83`

The block that would add allowed hosts is commented out. Rails' default in production is to allow any Host header, opening DNS-rebinding and host-header injection.

### Fix

```ruby
config.hosts = [ENV.fetch('APP_HOST'), /\A[\w-]+\.#{Regexp.escape(ENV.fetch('APP_HOST'))}\z/]
config.host_authorization = { exclude: ->(req) { req.path == '/up' } }
```

The patch sets this with a sensible default and a fail-loudly behavior in production.

## H-8 — No security headers

**Severity:** HIGH
**Files:** none — never set

No `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS comes for free with `force_ssl = true`, good). API responses also lack `X-Frame-Options: DENY` (less critical for an API but an instructive default).

### Fix

Add `config/initializers/secure_headers.rb` (or set inline in production.rb):

```ruby
Rails.application.config.action_dispatch.default_headers.merge!(
  'X-Content-Type-Options' => 'nosniff',
  'X-Frame-Options'        => 'DENY',
  'Referrer-Policy'        => 'strict-origin-when-cross-origin',
  'Permissions-Policy'     => 'camera=(), microphone=(), geolocation=()'
)
```

For the Next.js frontend, add headers in `next.config.{js,ts}`:

```ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + "; img-src 'self' data:; frame-ancestors 'none'" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' }
    ]
  }];
}
```

Patch applies the backend headers; frontend `next.config` headers are noted as TODO since the project has no current `next.config.{js,ts,mjs}` (created during patch).

---

# Medium findings

## M-1 — No password length / complexity validation

`User` declares `has_secure_password` but does not validate length or complexity. A 1-character password is accepted. Add:

```ruby
validates :password, length: { minimum: 12 }, format: {
  with: /\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+\z/, message: 'must include upper, lower, digit'
}, if: -> { new_record? || password.present? }
```

## M-2 — Branch-access cache invalidation

`production_branch_access` is cached for 15 min keyed on user id. There is no `Rails.cache.delete("user_branch_access_#{id}")` after `User#update`. After C-3 is fixed, a revoked branch_staff continues to see their old branches for up to 15 minutes.

Fix: add an `after_update_commit` hook on `User` to delete the cache key, or include the user's `updated_at` in the cache key.

## M-3 — Duplicated `decode_jwt`

Same logic in `application_controller.rb` and `auth_controller.rb`. Extract to `lib/jwt_helper.rb` and `include` in both.

## M-4 — `params[:row_dims].to_unsafe_h`

`production_controller.rb#htd_detail` calls `to_unsafe_h` on `row_dims`. Subsequent `build_htd_join_clause` only uses keys present in `HTD_DIM_MAP`, so unknown keys are dropped — but the pattern is risky and a future contributor could pass the same hash unfiltered into raw SQL. Replace with `params.require(:row_dims).permit(*HTD_DIM_MAP.keys.map(&:to_sym))` (or `params.fetch(:row_dims, {}).permit!.slice(*HTD_DIM_MAP.keys)`).

## M-5 — Demographic / employee / filter-values endpoints leak identifiers

`/dashboards/demographics` returns full age-bucketed counts. `/dashboards/employee_detail` returns per-user transaction productivity for any production user_id. `/filters/values` returns CIF IDs, ACIDs, account numbers in dropdown payloads.

Fix: gate `demographics` and `employee_detail` behind `can_see_pii?` (or a more specific `can_see_employees?`), and require auth on `/filters/values` (after C-1 it's at least authenticated; consider role-gating it for `analyst`+ only).

---

# Low findings

## L-1 — `filter_parameter_logging.rb` patterns

```ruby
Rails.application.config.filter_parameters += [:passw, :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn]
```

`:passw` does match `:password`, but adding `:password`, `:password_confirmation`, `:password_digest` explicitly is clearer and protects against future param-name changes.

## L-2 — `htd_detail` `DROP TABLE IF EXISTS` race

The procedure creates a connection-scoped TEMP TABLE `tran_detail`. Two concurrent calls on the same connection (rare, but possible if Puma re-checks out the same connection mid-request) could race. Wrap in `ActiveRecord::Base.transaction do ... end` so the temp table lives only for the transaction.

---

# Areas that look OK (defenders' notes)

- `apply_partial_text_filter` correctly uses `sanitize_sql_like` + parameterized `where(?, ?, ...)`.
- `production_controller#sanitize_sql_clause` and `sanitize_deposit_clause` are token-whitelisted against the `DIMENSIONS` / `MEASURES` / `DEPOSIT_DIMENSIONS` keys — anything outside the allowlist rejects the entire clause. This is the right shape; **do not** loosen it.
- `production_controller#build_having_clause` validates op against a whitelist and value against a strict regex (`\A-?\d+(\.\d+)?\z` for numeric, `\A\d{4}-\d{2}-\d{2}\z` for date). Value substitution is safe.
- `User#production_branch_access` interpolates the user id but wraps with `conn.quote("user #{id}")` — safe (and the id is an integer PK).
- Bcrypt via `has_secure_password` is correct.
- `force_ssl = true` is on in production (HSTS comes free).
- Rails param filter list covers `:passw`, `:secret`, `:token` (good baseline).
- `Brakeman` is in the Gemfile (run `bundle exec brakeman` regularly — no current report on disk).

---

# Remediation roadmap

| Phase | Items | Effort |
|-------|-------|--------|
| **0 — emergency, before any external pilot** | C-1, C-2, C-5 (strip demo creds), H-6 | < 1 day |
| **1 — internal pilot ready** | C-3, C-4, H-1, H-2, H-4 | 2-3 days |
| **2 — production hardening** | H-3 → cookie auth refactor, H-5, H-7, H-8 | 1-2 weeks |
| **3 — defense in depth** | M-1..M-5, L-1, L-2, brakeman + npm audit in CI | 2-3 days |

---

# Patches applied in this commit

The companion code changes (in this same diff) implement the highest-leverage subset:

1. `BaseController` switched to required auth (C-1).
2. `application_controller.rb` adds `require_pii!` and applies it to `customer_profile` / `demographics` (C-2).
3. `application_controller.rb` adds `scoped_filter_params` helper used by every dashboard / production action (C-3).
4. `users_controller.rb` adds `authorize_role_assignment!` (C-4).
5. `signin/page.tsx` removes the demo-credentials hint card (C-5a).
6. `signup/page.tsx` rewritten to "signup-by-invitation" placeholder, no `localStorage` writes (C-5b).
7. `auth_controller.rb` requires `JWT_SECRET_KEY` in production, adds `iss/aud/iat`, drops exp to 8h (H-1, partial).
8. `Gemfile` + `config/initializers/rack_attack.rb` adds rate limiting (H-2).
9. `cors.rb` fails loudly in production, drops `credentials: true` (H-4).
10. `production_controller.rb#deposits` returns generic error (H-6).
11. `production.rb` sets `config.hosts` (H-7).
12. `production.rb` adds default security headers (H-8 backend).

Items not patched (require larger refactor or external decisions): H-3 cookie-auth migration, H-5 token storage refactor, frontend `next.config` CSP file, M-1 password validation hardening (impacts existing seed data), M-2..M-5.

---

# Verification

| Check | Result | Notes |
|---|---|---|
| `ruby -c` on every modified .rb file | ✅ Syntax OK (12/12 files) | Run from this audit's sandbox |
| `npx tsc --noEmit` (whole frontend) | ✅ 0 errors | Passes per CLAUDE.md golden rule |
| `bundle exec rspec` | ⚠ Not run in sandbox | Sandbox lacks Rails/Bundler. **Run locally:** `cd backend && bundle exec rspec`. New spec `spec/requests/api_v1_auth_gate_spec.rb` will fail-fast if any new route forgets to require auth. |
| `npm test` (vitest) | ⚠ Not run in sandbox | `node_modules` was installed on macOS — Linux sandbox can't load the rollup native binary. **Run locally:** `cd frontend && npm test`. |
| `bundle exec brakeman` | ⚠ Not run in sandbox | Already in Gemfile. Run before merging — it should now flag substantially fewer issues. |

# Required follow-up actions for the operator

1. **Set `JWT_SECRET_KEY` in production env** before deploying — the new code raises on boot if it's missing (intended).
2. **Set `APP_HOST` in production env** so `config.hosts` activates and DNS-rebinding protection turns on.
3. **Set `FRONTEND_URL` to your HTTPS frontend origin** — production CORS now refuses to boot without it.
4. **Run `bundle install`** to pick up the `rack-attack` gem before the new initializer loads.
5. **Verify your production user list** — if `demo@gmail.com / demo` exists in seed data, delete it.
6. **Rotate any JWTs in flight** — the `iss` / `aud` claims are now required, so old tokens will be rejected after deploy. Users will need to sign in again.
7. **Run `bundle exec rspec spec/requests/api_v1_auth_gate_spec.rb`** to confirm every protected endpoint returns 401 without a token.

*Generated 2026-04-25 by automated security review pass.*
