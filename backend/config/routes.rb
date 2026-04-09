Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth (public)
      post 'auth/signin', to: 'auth#signin'
      get  'auth/me',     to: 'auth#me'

      # User management (admin/superadmin only)
      resources :users, only: %i[index show create update destroy]

      # Dashboard endpoints
      get 'dashboards/executive',        to: 'dashboards#executive'
      get 'dashboards/branch_performance', to: 'dashboards#branch_performance'
      get 'dashboards/province_summary', to: 'dashboards#province_summary'
      get 'dashboards/channel_breakdown', to: 'dashboards#channel_breakdown'
      get 'dashboards/daily_trend',      to: 'dashboards#daily_trend'
      get 'dashboards/customers_top',    to: 'dashboards#customers_top'
      get 'dashboards/customer_profile', to: 'dashboards#customer_profile'
      get 'dashboards/financial_summary', to: 'dashboards#financial_summary'
      get 'dashboards/digital_channels', to: 'dashboards#digital_channels'
      get 'dashboards/risk_summary',     to: 'dashboards#risk_summary'
      get 'dashboards/kpi_summary',      to: 'dashboards#kpi_summary'
      get 'dashboards/employer_summary', to: 'dashboards#employer_summary'
      get 'dashboards/employee_detail',  to: 'dashboards#employee_detail'
      get 'dashboards/demographics',     to: 'dashboards#demographics'

      # Filter endpoints
      get 'filters/values',     to: 'filters#values'
      get 'filters/branches',   to: 'filters#branches'
      get 'filters/statistics', to: 'filters#statistics'

      # Production data explorer
      get 'production/catalog',  to: 'production#catalog'
      get 'production/table',    to: 'production#table'
      get 'production/lookup',   to: 'production#lookup'
      get 'production/explorer', to: 'production#explorer'
    end
  end
end
