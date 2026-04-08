Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # Legacy localized dashboard endpoints removed in favor of generic production/explorer
      

      # Filter endpoints
      get 'filters/values', to: 'filters#values'
      get 'filters/branches', to: 'filters#branches'
      get 'filters/statistics', to: 'filters#statistics'

      # Production data explorer
      get 'production/catalog', to: 'production#catalog'
      get 'production/table', to: 'production#table'
      get 'production/lookup', to: 'production#lookup'
      get 'production/explorer', to: 'production#explorer'
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
