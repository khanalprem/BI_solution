#!/bin/bash

# BankBI Quick Start Script
# Run this after placing your sample data.csv in the project root

set -e  # Exit on error

echo "🎉 BankBI Setup Starting..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if sample data exists
if [ ! -f "sample data.csv" ]; then
    echo "${YELLOW}⚠️  Warning: sample data.csv not found in project root${NC}"
    echo "Please place your CSV file here before importing data"
    echo ""
fi

# Backend setup
echo "${BLUE}📦 Step 1: Setting up Backend...${NC}"
cd backend

# Check if database exists and is accessible
echo "Checking database connection..."
if ! rails runner "ActiveRecord::Base.connection" 2>/dev/null; then
    echo "${YELLOW}⚠️  Database connection issue. Please check backend/.env${NC}"
    echo "Run this to test: cd backend && rails runner 'puts ActiveRecord::Base.connection.active?'"
    exit 1
fi

# Import data if CSV exists
if [ -f "../sample data.csv" ]; then
    echo "${BLUE}📊 Importing sample data...${NC}"
    rails db:import_all
    echo "${GREEN}✅ Data import complete!${NC}"
else
    echo "${YELLOW}⚠️  Skipping data import (no CSV file)${NC}"
fi

cd ..

echo ""
echo "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${BLUE}🚀 To start your BankBI platform:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "${BLUE}1. Start Backend (Terminal 1):${NC}"
echo "   cd backend && rails s -p 3001"
echo ""
echo "${BLUE}2. Start Frontend (Terminal 2):${NC}"
echo "   cd frontend && npm run dev"
echo ""
echo "${BLUE}3. Open Browser:${NC}"
echo "   http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 For detailed documentation, see:"
echo "   - FINAL_SUMMARY.md (complete guide)"
echo "   - IMPLEMENTATION_COMPLETE.md (features)"
echo "   - QUICK_REFERENCE.md (commands)"
echo ""
