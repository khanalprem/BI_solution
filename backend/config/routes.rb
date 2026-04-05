Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # Dashboard endpoints
      get 'dashboards/executive', to: 'dashboards#executive'
      get 'dashboards/branch_performance', to: 'dashboards#branch_performance'
      get 'dashboards/province_summary', to: 'dashboards#province_summary'
      get 'dashboards/channel_breakdown', to: 'dashboards#channel_breakdown'
      get 'dashboards/daily_trend', to: 'dashboards#daily_trend'
      get 'dashboards/customers_top', to: 'dashboards#customers_top'
      get 'dashboards/customer_profile', to: 'dashboards#customer_profile'
      
      # Filter endpoints
      get 'filters/values', to: 'filters#values'
      get 'filters/branches', to: 'filters#branches'
      get 'filters/statistics', to: 'filters#statistics'
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
