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

ActiveRecord::Schema[7.2].define(version: 2026_04_10_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "accounts", id: false, force: :cascade do |t|
    t.integer "account_id"
    t.integer "customer_id"
    t.string "account_type", limit: 50
    t.string "account_number", limit: 20
    t.decimal "balance", precision: 15, scale: 2
    t.string "currency", limit: 10
    t.string "account_status", limit: 20
    t.datetime "created_at", precision: nil
  end

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

  create_table "branch", primary_key: "sol_id", id: :integer, default: nil, force: :cascade do |t|
    t.string "branch_name", limit: 100, null: false
    t.string "province", limit: 20
    t.integer "cluster_id"
  end

  create_table "branch_cdc", primary_key: "sol_id", id: :integer, default: nil, force: :cascade do |t|
    t.string "branch_name", limit: 100, null: false
    t.string "province", limit: 20
    t.integer "cluster_id"
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

  create_table "cluster", id: false, force: :cascade do |t|
    t.string "cluster_name", limit: 10, null: false
    t.integer "cluster_id"
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

  create_table "data_dictionary", primary_key: "item_id", id: :serial, force: :cascade do |t|
    t.integer "related_itemid"
    t.string "item_name", limit: 100
    t.string "item_type", limit: 20
    t.string "sql", limit: 500
    t.string "procedure", limit: 200
    t.integer "parameter_ordinal"
  end

  create_table "dates", id: false, force: :cascade do |t|
    t.date "date"
    t.integer "year"
    t.string "quarter", limit: 2
    t.string "month", limit: 2
    t.string "year_quarter", limit: 7
    t.string "year_month", limit: 7
    t.date "month_startdate"
    t.date "month_enddate"
    t.date "quarter_startdate"
    t.date "quarter_enddate"
    t.date "year_startdate"
    t.date "year_enddate"
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
    t.date "eod_date"
    t.date "end_eod_date"
    t.decimal "tran_date_bal", precision: 18, scale: 2
    t.index ["acct_num"], name: "index_eab_on_acct_num"
    t.index ["acid"], name: "index_eab_on_acid"
    t.index ["eod_date"], name: "index_eab_on_eod_date"
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

  create_table "gam", primary_key: "acid", id: { type: :string, limit: 100 }, force: :cascade do |t|
    t.string "entity_cre_flg", limit: 100
    t.integer "sol_id"
    t.string "acct_prefix", limit: 100
    t.string "acct_num", limit: 100
    t.string "bacid", limit: 100
    t.string "foracid", limit: 100
    t.string "acct_name", limit: 100
    t.string "acct_short_name", limit: 100
    t.string "emp_id", limit: 100
    t.string "gl_sub_head_code", limit: 100
    t.string "acct_ownership", limit: 100
    t.string "schm_code", limit: 100
    t.string "dr_bal_lim", limit: 100
    t.string "acct_rpt_code", limit: 100
    t.string "frez_code", limit: 100
    t.string "frez_reason_code", limit: 100
    t.string "acct_opn_date", limit: 100
    t.string "acct_cls_flg", limit: 100
    t.string "acct_cls_date", limit: 100
    t.string "clr_bal_amt", limit: 100
    t.string "un_clr_bal_amt", limit: 100
    t.string "drwng_power", limit: 100
    t.string "sanct_lim", limit: 100
    t.string "adhoc_lim", limit: 100
    t.string "system_reserved_amt", limit: 100
    t.string "single_tran_lim", limit: 100
    t.string "clean_single_tran_lim", limit: 100
    t.string "system_gen_lim", limit: 100
    t.string "chq_alwd_flg", limit: 100
    t.string "cum_dr_amt", limit: 100
    t.string "cum_cr_amt", limit: 100
    t.string "acrd_cr_amt", limit: 100
    t.string "last_tran_date", limit: 100
    t.string "mode_of_oper_code", limit: 100
    t.string "pb_ps_code", limit: 100
    t.string "serv_chrg_coll_flg", limit: 100
    t.string "free_text", limit: 100
    t.string "acct_locn_code", limit: 100
    t.string "int_paid_flg", limit: 100
    t.string "int_coll_flg", limit: 100
    t.string "lchg_user_id", limit: 100
    t.datetime "lchg_time", precision: nil
    t.string "rcre_user_id", limit: 100
    t.string "rcre_time", limit: 100
    t.string "limit_b2kid", limit: 100
    t.string "drwng_power_ind", limit: 100
    t.string "drwng_power_pcnt", limit: 100
    t.string "micr_chq_chrg_coll_flg", limit: 100
    t.string "last_turnover_date", limit: 100
    t.string "fd_ref_num", limit: 100
    t.string "fx_cum_cr_amt", limit: 100
    t.string "crncy_code", limit: 100
    t.string "source_of_fund", limit: 100
    t.string "acct_crncy_code", limit: 100
    t.string "lien_amt", limit: 100
    t.string "acct_classification_flg", limit: 100
    t.string "system_only_acct_flg", limit: 100
    t.string "single_tran_flg", limit: 100
    t.string "utilised_amt", limit: 100
    t.string "acct_mgr_user_id", limit: 100
    t.string "schm_type", limit: 100
    t.string "last_frez_date", limit: 100
    t.string "last_unfrez_date", limit: 100
    t.string "bal_on_frez_date", limit: 100
    t.string "chrg_level_code", limit: 100
    t.string "acct_cls_chrg_pend_verf", limit: 100
    t.string "partitioned_flg", limit: 100
    t.string "partitioned_type", limit: 100
    t.string "wtax_flg", limit: 100
    t.string "wtax_amount_scope_flg", limit: 100
    t.string "int_adj_for_deduction_flg", limit: 100
    t.string "operative_acid", limit: 100
    t.string "phone_num", limit: 100
    t.string "native_lang_name", limit: 100
    t.string "nat_lang_title_code", limit: 100
    t.string "pool_id", limit: 100
    t.string "allow_sweeps", limit: 100
    t.string "wtax_pcnt", limit: 100
    t.string "product_group", limit: 100
    t.string "wtax_level_flg", limit: 100
    t.string "last_modified_date", limit: 100
    t.string "cif_id", limit: 50
    t.string "master_b2k_id", limit: 100
    t.string "bank_id", limit: 100
    t.string "last_tran_date_cr", limit: 100
    t.string "last_tran_date_dr", limit: 100
    t.string "last_tran_id_cr", limit: 100
    t.string "last_tran_id_dr", limit: 100
    t.string "dr_int_method", limit: 100
    t.string "cons_bal_flg", limit: 100
    t.string "schm_sub_type", limit: 100
    t.string "report_date", limit: 100
    t.string "report_clr_bal_amt", limit: 100
    t.string "cust_id", limit: 100
    t.decimal "eod_balance", precision: 18, scale: 2
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

  create_table "gsh", id: false, force: :cascade do |t|
    t.string "gl_sub_head_code", limit: 50
    t.string "gl_sub_head_desc", limit: 100
    t.string "gl_code", limit: 50
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

  create_table "htd", primary_key: "tran_id", id: :bigint, default: nil, force: :cascade do |t|
    t.datetime "tran_date", precision: nil
    t.string "part_tran_srl_num", limit: 50
    t.string "del_flg", limit: 5
    t.string "tran_type", limit: 5
    t.string "part_tran_type", limit: 5
    t.string "gl_sub_head_code", limit: 50
    t.string "acid", limit: 50
    t.string "value_date", limit: 50
    t.decimal "tran_amt"
    t.string "tran_particular", limit: 500
    t.integer "entry_user_id"
    t.string "pstd_user_id", limit: 50
    t.integer "vfd_user_id"
    t.string "rate_code", limit: 50
    t.string "tran_crncy_code", limit: 50
    t.string "ref_crncy_code", limit: 50
    t.string "ref_amt", limit: 50
    t.integer "sol_id"
    t.string "trea_rate", limit: 50
    t.string "dth_init_sol_id", limit: 50
    t.string "tran_sub_type", limit: 50
    t.datetime "entry_date", precision: nil
    t.datetime "pstd_date", precision: nil
    t.datetime "vfd_date", precision: nil
    t.string "ref_num", limit: 50
    t.string "tran_rmks", limit: 500
    t.string "tran_particular_2", limit: 500
    t.string "tran_particular_code", limit: 50
    t.datetime "lchg_time", precision: nil
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

  create_table "merchant", id: false, force: :cascade do |t|
    t.string "merchant", limit: 100
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

  create_table "product", id: false, force: :cascade do |t|
    t.string "product", limit: 100
  end

  create_table "profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "address"
    t.index ["user_id"], name: "index_profiles_on_user_id"
  end

  create_table "province", id: false, force: :cascade do |t|
    t.string "name", limit: 20
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

  create_table "service", id: false, force: :cascade do |t|
    t.string "service", limit: 100
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
    t.index ["cif_id", "tran_date"], name: "idx_tran_summary_cif_date"
    t.index ["cif_id"], name: "index_tran_summary_on_cif_id"
    t.index ["gam_branch"], name: "index_tran_summary_on_gam_branch"
    t.index ["gam_province"], name: "index_tran_summary_on_gam_province"
    t.index ["part_tran_type"], name: "idx_tran_summary_part_tran_type"
    t.index ["tran_branch"], name: "index_tran_summary_on_tran_branch"
    t.index ["tran_date", "cif_id"], name: "idx_tran_summary_date_cif"
    t.index ["tran_date", "gam_branch", "gam_province"], name: "idx_tran_summary_date_branch_province"
    t.index ["tran_date", "gam_branch"], name: "index_tran_summary_on_tran_date_and_gam_branch"
    t.index ["tran_date", "gam_province"], name: "index_tran_summary_on_tran_date_and_gam_province"
    t.index ["tran_date", "tran_source"], name: "idx_tran_summary_date_source"
    t.index ["tran_date"], name: "index_tran_summary_on_tran_date"
    t.index ["tran_province"], name: "index_tran_summary_on_tran_province"
    t.index ["tran_source"], name: "idx_tran_summary_tran_source"
    t.index ["tran_type"], name: "index_tran_summary_on_tran_type"
  end

  create_table "transactions", id: false, force: :cascade do |t|
    t.integer "transaction_id"
    t.integer "account_id"
    t.string "transaction_type", limit: 50
    t.decimal "amount", precision: 15, scale: 2
    t.datetime "transaction_date", precision: nil
    t.string "description", limit: 255
    t.string "merchant", limit: 100
    t.string "service", limit: 100
    t.string "product", limit: 100
    t.string "status", limit: 20
    t.integer "trace_id"
  end

  create_table "user_branch_cluster", id: false, force: :cascade do |t|
    t.integer "user_id"
    t.integer "sol_id"
    t.integer "cluster_id"
    t.string "access_level", limit: 5
  end

  create_table "user_master", id: false, force: :cascade do |t|
    t.integer "user_id"
    t.string "user_name", limit: 50, null: false
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
    t.string "role", default: "analyst", null: false
    t.text "assigned_branches", default: [], array: true
    t.text "assigned_provinces", default: [], array: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token"
    t.index ["role"], name: "index_users_on_role"
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
