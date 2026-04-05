#!/bin/bash

# Quick Start Script for BankBI
# Creates the backend and frontend projects from scratch

set -e

echo "🏦 BankBI Quick Start"
echo "===================="
echo ""

# Check if backend exists
if [ -d "backend/app" ]; then
    echo "✓ Backend already exists"
else
    echo "📁 Creating Rails API backend..."
    rails new backend --api --database=postgresql -T --skip-git
    
    echo "📦 Adding gems to backend..."
    cd backend
    
    # Add to Gemfile
    cat >> Gemfile << 'EOF'

# BankBI specific gems
gem 'jwt'
gem 'bcrypt'
gem 'rack-cors'
gem 'active_model_serializers'
gem 'kaminari'
gem 'sidekiq'
gem 'redis'
gem 'dotenv-rails'

group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
end
EOF
    
    bundle install
    cd ..
    
    echo "✓ Backend created"
fi

# Check if frontend exists
if [ -d "frontend/app" ]; then
    echo "✓ Frontend already exists"
else
    echo "📁 Creating Next.js frontend..."
    npx create-next-app@latest frontend --typescript --tailwind --app --use-npm --no-src-dir --yes
    
    cd frontend
    
    echo "📦 Adding frontend dependencies..."
    npm install @tanstack/react-query axios date-fns recharts
    
    cd ..
    
    echo "✓ Frontend created"
fi

# Copy environment files
if [ -f "backend.env.example" ] && [ ! -f "backend/.env" ]; then
    cp backend.env.example backend/.env
    echo "✓ Created backend/.env"
fi

if [ -f "frontend.env.example" ] && [ ! -f "frontend/.env.local" ]; then
    cp frontend.env.example frontend/.env.local
    echo "✓ Created frontend/.env.local"
fi

echo ""
echo "✅ Project structure created!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Configure database connection:"
echo "   Edit backend/config/database.yml to point to your existing database"
echo ""
echo "2. Create models for existing tables (NO migrations):"
echo "   cd backend"
echo "   # Create app/models/tran_summary.rb"
echo "   # Create app/models/eab.rb"
echo "   # See backend/README.md for examples"
echo ""
echo "3. Start development servers:"
echo "   Terminal 1: cd backend && rails s -p 3001"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "📚 Reference:"
echo "   - backend/README.md - Backend setup guide"
echo "   - frontend/README.md - Frontend setup guide"
echo "   - .cursor/skills/bankbi-data-integration - Database integration"
echo "   - .cursor/skills/bankbi-ui-styleguide - UI components"
echo ""
echo "🚀 Ready to build!"
