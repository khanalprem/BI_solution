# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_04_05_152432) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "blogs", force: :cascade do |t|
    t.string "title"
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "branches", force: :cascade do |t|
    t.string "branch_code"
    t.string "name"
    t.string "province"
    t.string "district"
    t.string "municipality"
    t.string "cluster"
    t.string "category"
    t.boolean "active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["branch_code"], name: "index_branches_on_branch_code", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.integer "order"
    t.boolean "is_active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "image_path"
    t.index ["name"], name: "index_categories_on_name", unique: true
  end

  create_table "customers", force: :cascade do |t|
    t.string "customer_id"
    t.string "full_name"
    t.string "segment"
    t.integer "kyc_risk_tier"
    t.string "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_customers_on_customer_id", unique: true
  end

  create_table "disclaimers", force: :cascade do |t|
    t.string "title"
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "eab", id: false, force: :cascade do |t|
    t.string "acct_num"
    t.string "acid"
    t.date "balance_date"
    t.decimal "eod_balance", precision: 18, scale: 2
    t.string "currency", default: "NPR"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["acct_num", "balance_date"], name: "index_eab_on_acct_num_and_balance_date"
    t.index ["acct_num"], name: "index_eab_on_acct_num"
    t.index ["acid"], name: "index_eab_on_acid"
    t.index ["balance_date"], name: "index_eab_on_balance_date"
  end

  create_table "email_systems", force: :cascade do |t|
    t.string "host", null: false
    t.integer "port", default: 587, null: false
    t.boolean "use_tls", default: true, null: false
    t.boolean "use_ssl", default: false, null: false
    t.integer "timeout", default: 10, null: false
    t.string "host_user", null: false
    t.string "host_password", null: false
    t.string "default_from_email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "get_starteds", force: :cascade do |t|
    t.string "title"
    t.text "description"
    t.string "image_url"
    t.integer "order", default: 0
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "hero_sections", force: :cascade do |t|
    t.string "title"
    t.text "subtitle"
    t.string "image_url"
    t.integer "order", default: 0
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "instrument_feeds", force: :cascade do |t|
    t.bigint "instrument_id", null: false
    t.bigint "sub_instrument_id"
    t.bigint "user_id", null: false
    t.string "title"
    t.text "content"
    t.string "video"
    t.bigint "instrument_update_duration_id"
    t.text "trade_notes"
    t.string "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "is_free", default: false, null: false
    t.string "legacy_image_url"
    t.index ["instrument_id", "status"], name: "index_feeds_on_instrument_and_status"
    t.index ["instrument_id"], name: "index_instrument_feeds_on_instrument_id"
    t.index ["instrument_update_duration_id"], name: "index_instrument_feeds_on_instrument_update_duration_id"
    t.index ["status"], name: "index_instrument_feeds_on_status"
    t.index ["sub_instrument_id"], name: "index_instrument_feeds_on_sub_instrument_id"
    t.index ["user_id"], name: "index_instrument_feeds_on_user_id"
  end

  create_table "instrument_update_durations", force: :cascade do |t|
    t.string "duration"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "order", default: 0, null: false
  end

  create_table "instruments", force: :cascade do |t|
    t.string "name"
    t.bigint "category_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id"], name: "index_instruments_on_category_id"
    t.index ["name"], name: "index_instruments_on_name", unique: true
  end

  create_table "joining_us", force: :cascade do |t|
    t.string "title"
    t.text "description"
    t.string "image_url"
    t.integer "order", default: 0
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "knowledges", force: :cascade do |t|
    t.string "title"
    t.text "description"
    t.string "image_url"
    t.integer "order", default: 0
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "nepse_eod_bars", force: :cascade do |t|
    t.string "symbol", null: false
    t.date "date", null: false
    t.decimal "open", precision: 15, scale: 4
    t.decimal "high", precision: 15, scale: 4
    t.decimal "low", precision: 15, scale: 4
    t.decimal "close", precision: 15, scale: 4
    t.bigint "volume"
    t.datetime "scraped_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "is_adjusted", default: false, null: false
    t.index ["date"], name: "idx_nepse_eod_bars_date_brin", using: :brin
    t.index ["date"], name: "index_nepse_eod_bars_on_date"
    t.index ["scraped_at"], name: "index_nepse_eod_bars_on_scraped_at"
    t.index ["symbol", "date", "is_adjusted"], name: "idx_nepse_eod_bars_unique", unique: true
    t.index ["symbol", "date"], name: "index_nepse_eod_bars_on_symbol_and_date"
    t.index ["symbol", "is_adjusted", "date"], name: "idx_nepse_eod_bars_symbol_adjusted_date_desc", order: { date: :desc }
    t.index ["symbol", "scraped_at"], name: "idx_nepse_eod_bars_symbol_scraped_at", order: { scraped_at: :desc }
    t.index ["symbol"], name: "index_nepse_eod_bars_on_symbol"
  end

  create_table "nepse_quotes", force: :cascade do |t|
    t.string "symbol", null: false
    t.decimal "ltp", precision: 15, scale: 4
    t.bigint "volume"
    t.decimal "change_value", precision: 15, scale: 4
    t.datetime "scraped_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "turnover", precision: 18, scale: 2
    t.decimal "percent_change", precision: 8, scale: 2
    t.string "ticker_name"
    t.index ["scraped_at", "percent_change"], name: "index_nepse_quotes_on_scraped_at_and_percent_change"
    t.index ["scraped_at", "symbol"], name: "idx_nepse_quotes_scraped_at_symbol", order: { scraped_at: :desc }
    t.index ["scraped_at", "turnover"], name: "index_nepse_quotes_on_scraped_at_and_turnover"
    t.index ["scraped_at", "volume"], name: "index_nepse_quotes_on_scraped_at_and_volume"
    t.index ["scraped_at"], name: "index_nepse_quotes_on_scraped_at"
    t.index ["symbol", "scraped_at"], name: "index_nepse_quotes_on_symbol_and_scraped_at", unique: true
    t.index ["symbol"], name: "index_nepse_quotes_on_symbol"
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "title"
    t.text "message"
    t.string "notification_type"
    t.boolean "is_read"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.text "description"
    t.string "address"
    t.string "phone"
    t.string "facebook"
    t.string "instagram"
    t.string "twitter"
    t.string "linkedin"
    t.string "youtube"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "logo"
  end

  create_table "otps", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "otp", limit: 6, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_otps_on_expires_at"
    t.index ["otp"], name: "index_otps_on_otp"
    t.index ["user_id", "expires_at"], name: "index_otps_on_user_and_expiry"
    t.index ["user_id"], name: "index_otps_on_user_id"
  end

  create_table "payment_methods", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "payments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "pricing_plan_id", null: false
    t.date "payment_date"
    t.string "payment_method"
    t.boolean "approved"
    t.string "duration"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["approved"], name: "index_payments_on_approved"
    t.index ["pricing_plan_id"], name: "index_payments_on_pricing_plan_id"
    t.index ["user_id"], name: "index_payments_on_user_id"
  end

  create_table "pricing_plans", force: :cascade do |t|
    t.string "name"
    t.decimal "monthly_price"
    t.decimal "quarterly_price"
    t.decimal "yearly_price"
    t.text "description"
    t.text "features"
    t.integer "free_trials_days"
    t.boolean "is_free"
    t.string "pricing_duration"
    t.integer "order"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "pricing_plans_categories", id: false, force: :cascade do |t|
    t.bigint "pricing_plan_id", null: false
    t.bigint "category_id", null: false
    t.index ["category_id"], name: "index_pricing_plans_categories_on_category_id"
    t.index ["pricing_plan_id", "category_id"], name: "index_pricing_plans_categories_unique", unique: true
    t.index ["pricing_plan_id"], name: "index_pricing_plans_categories_on_pricing_plan_id"
  end

  create_table "privacy_policies", force: :cascade do |t|
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "address"
    t.index ["user_id"], name: "index_profiles_on_user_id"
  end

  create_table "saved_charts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", default: "Untitled", null: false
    t.string "symbol"
    t.string "timeframe"
    t.string "chart_type"
    t.jsonb "drawings", default: []
    t.jsonb "indicator_settings", default: {}
    t.jsonb "preferences", default: {}
    t.boolean "is_default", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "index_saved_charts_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_saved_charts_on_user_id"
  end

  create_table "sub_instruments", force: :cascade do |t|
    t.string "name"
    t.bigint "instrument_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["instrument_id"], name: "index_sub_instruments_on_instrument_id"
  end

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "pricing_plan_id", null: false
    t.date "start_date"
    t.date "end_date"
    t.boolean "active"
    t.boolean "is_free_subscription"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["end_date"], name: "index_subscriptions_on_end_date"
    t.index ["pricing_plan_id"], name: "index_subscriptions_on_pricing_plan_id"
    t.index ["user_id", "active"], name: "index_subscriptions_on_user_and_active"
    t.index ["user_id", "pricing_plan_id"], name: "index_subscriptions_on_user_and_plan"
    t.index ["user_id"], name: "index_subscriptions_on_user_id"
  end

  create_table "terms_and_conditions", force: :cascade do |t|
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "testimonials", force: :cascade do |t|
    t.string "name"
    t.string "role"
    t.text "content"
    t.string "image_url"
    t.integer "rating"
    t.integer "order", default: 0
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "tran_summary", id: false, force: :cascade do |t|
    t.string "acct_num"
    t.string "acid"
    t.string "cif_id"
    t.string "acct_name"
    t.string "gam_solid"
    t.string "gam_branch"
    t.string "gam_province"
    t.string "gam_cluster_id"
    t.string "gam_cluster"
    t.string "tran_branch"
    t.string "tran_cluster_id"
    t.string "tran_cluster"
    t.string "tran_province"
    t.string "tran_solid"
    t.date "date"
    t.integer "year"
    t.integer "quarter"
    t.integer "month"
    t.string "year_quarter"
    t.string "year_month"
    t.date "month_startdate"
    t.date "month_enddate"
    t.date "quarter_startdate"
    t.date "quarter_enddate"
    t.date "year_startdate"
    t.date "year_enddate"
    t.date "tran_date"
    t.string "tran_type"
    t.string "part_tran_type"
    t.decimal "tran_amt", precision: 18, scale: 2
    t.integer "tran_count"
    t.decimal "signed_tranamt", precision: 18, scale: 2
    t.string "gl_sub_head_code"
    t.string "entry_user"
    t.string "entry_user_id"
    t.string "vfd_user"
    t.string "vfd_user_id"
    t.decimal "eod_balance", precision: 18, scale: 2
    t.string "merchant"
    t.string "service"
    t.string "product"
    t.string "tran_source"
    t.string "row_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["acct_num"], name: "index_tran_summary_on_acct_num"
    t.index ["cif_id"], name: "index_tran_summary_on_cif_id"
    t.index ["gam_branch"], name: "index_tran_summary_on_gam_branch"
    t.index ["gam_province"], name: "index_tran_summary_on_gam_province"
    t.index ["tran_branch"], name: "index_tran_summary_on_tran_branch"
    t.index ["tran_date", "gam_branch"], name: "index_tran_summary_on_tran_date_and_gam_branch"
    t.index ["tran_date", "gam_province"], name: "index_tran_summary_on_tran_date_and_gam_province"
    t.index ["tran_date"], name: "index_tran_summary_on_tran_date"
    t.index ["tran_province"], name: "index_tran_summary_on_tran_province"
    t.index ["tran_type"], name: "index_tran_summary_on_tran_type"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.string "first_name"
    t.string "last_name"
    t.boolean "is_staff"
    t.boolean "is_superuser"
    t.boolean "is_active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.string "provider"
    t.string "uid"
    t.string "avatar_url"
    t.boolean "has_chart_access", default: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "instrument_feeds", "instrument_update_durations"
  add_foreign_key "instrument_feeds", "instruments"
  add_foreign_key "instrument_feeds", "sub_instruments"
  add_foreign_key "instrument_feeds", "users"
  add_foreign_key "instruments", "categories"
  add_foreign_key "notifications", "users"
  add_foreign_key "otps", "users"
  add_foreign_key "payments", "pricing_plans"
  add_foreign_key "payments", "users"
  add_foreign_key "profiles", "users"
  add_foreign_key "saved_charts", "users"
  add_foreign_key "sub_instruments", "instruments"
  add_foreign_key "subscriptions", "pricing_plans"
  add_foreign_key "subscriptions", "users"
end
