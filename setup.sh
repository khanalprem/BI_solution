#!/bin/bash

# BankBI Development Setup Script
# This script helps you get started with the BankBI project

set -e

echo "🏦 BankBI - Nepal Banking Intelligence Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Ruby
    if command -v ruby &> /dev/null; then
        RUBY_VERSION=$(ruby -v | cut -d ' ' -f2)
        echo -e "${GREEN}✓${NC} Ruby $RUBY_VERSION found"
    else
        echo -e "${RED}✗${NC} Ruby not found. Please install Ruby 3.2+"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION found"
    else
        echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 20+"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | cut -d ' ' -f3)
        echo -e "${GREEN}✓${NC} PostgreSQL $PG_VERSION found"
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL not found locally (will use Docker)"
    fi
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis found"
    else
        echo -e "${YELLOW}⚠${NC} Redis not found locally (will use Docker)"
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker found"
    else
        echo -e "${YELLOW}⚠${NC} Docker not found. Install for containerized setup"
    fi
    
    echo ""
}

# Setup choice
setup_choice() {
    echo "Choose setup method:"
    echo "1) Docker (Recommended - Easiest setup)"
    echo "2) Local (Manual - More control)"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    echo ""
    
    case $choice in
        1)
            setup_docker
            ;;
        2)
            setup_local
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
}

# Docker setup
setup_docker() {
    echo "🐳 Setting up with Docker..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker not found. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Check if directories exist
    if [ ! -d "backend" ]; then
        echo "📁 Creating Rails backend..."
        docker run --rm -v "$PWD:/app" -w /app ruby:3.2-alpine sh -c "
            apk add --no-cache build-base postgresql-dev tzdata git && \
            gem install rails && \
            rails new backend --api --database=postgresql --skip-test
        "
    else
        echo -e "${YELLOW}Backend directory exists, skipping creation${NC}"
    fi
    
    if [ ! -d "frontend" ]; then
        echo "📁 Creating Next.js frontend..."
        docker run --rm -v "$PWD:/app" -w /app node:20-alpine sh -c "
            npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
        "
    else
        echo -e "${YELLOW}Frontend directory exists, skipping creation${NC}"
    fi
    
    # Copy Dockerfile templates
    if [ -f "backend.Dockerfile.template" ]; then
        cp backend.Dockerfile.template backend/Dockerfile
        echo -e "${GREEN}✓${NC} Created backend/Dockerfile"
    fi
    
    if [ -f "frontend.Dockerfile.template" ]; then
        cp frontend.Dockerfile.template frontend/Dockerfile
        echo -e "${GREEN}✓${NC} Created frontend/Dockerfile"
    fi
    
    # Start services
    echo "🚀 Starting Docker services..."
    docker-compose up -d postgres redis
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Setup database
    echo "🗄️ Setting up database..."
    docker-compose run --rm backend rails db:create db:migrate
    
    echo ""
    echo -e "${GREEN}✓ Docker setup complete!${NC}"
    echo ""
    echo "To start all services:"
    echo "  docker-compose up"
    echo ""
    echo "Access:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001/api/v1"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis: localhost:6379"
}

# Local setup
setup_local() {
    echo "💻 Setting up locally..."
    
    # Backend setup
    if [ ! -d "backend" ]; then
        echo "📁 Creating Rails backend..."
        gem install rails
        rails new backend --api --database=postgresql --skip-test
    fi
    
    cd backend
    
    echo "📦 Installing backend dependencies..."
    bundle install
    
    echo "🗄️ Setting up database..."
    rails db:create
    rails db:migrate
    
    cd ..
    
    # Frontend setup
    if [ ! -d "frontend" ]; then
        echo "📁 Creating Next.js frontend..."
        npx create-next-app@latest frontend --typescript --tailwind --app
    fi
    
    cd frontend
    
    echo "📦 Installing frontend dependencies..."
    npm install
    
    cd ..
    
    echo ""
    echo -e "${GREEN}✓ Local setup complete!${NC}"
    echo ""
    echo "To start development:"
    echo ""
    echo "Terminal 1 - Backend:"
    echo "  cd backend"
    echo "  rails server -p 3001"
    echo ""
    echo "Terminal 2 - Frontend:"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    echo "Terminal 3 - Sidekiq:"
    echo "  cd backend"
    echo "  bundle exec sidekiq"
    echo ""
    echo "Access:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001/api/v1"
}

# Add example data
add_example_data() {
    echo ""
    read -p "Do you want to add example data? (y/n): " add_data
    
    if [ "$add_data" = "y" ]; then
        echo "📊 Adding example data..."
        
        if [ -d "backend" ]; then
            if command -v docker-compose &> /dev/null; then
                docker-compose run --rm backend rails db:seed
            else
                cd backend && rails db:seed && cd ..
            fi
            echo -e "${GREEN}✓${NC} Example data added"
        else
            echo -e "${RED}Backend not found${NC}"
        fi
    fi
}

# Main execution
main() {
    check_prerequisites
    setup_choice
    add_example_data
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📚 Next steps:"
    echo "1. Read README.md for project overview"
    echo "2. Read IMPLEMENTATION_GUIDE.md for detailed implementation steps"
    echo "3. Check .cursor/skills/ for Claude AI development assistance"
    echo ""
    echo "💡 Tips:"
    echo "- Use Claude in Cursor for AI-assisted development"
    echo "- Refer to nepal-banking-domain skill for Nepal-specific rules"
    echo "- Check bi-dashboard-api-design skill for API patterns"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main
main
