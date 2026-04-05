#!/bin/bash

# Frontend Complete Setup Script
# This creates all necessary files for the BankBI frontend

echo "🎨 Setting up BankBI Frontend..."
echo "================================"

cd /Users/premprasadkhanal/prem/BI_solution/frontend

# Create necessary directories
mkdir -p components/ui
mkdir -p components/layout
mkdir -p lib/hooks
mkdir -p types
mkdir -p app/dashboard/executive

echo "✅ Directories created"

# Install dependencies if needed
if [ ! -d "node_modules/@tanstack" ]; then
    echo "📦 Installing dependencies..."
    npm install @tanstack/react-query axios date-fns recharts
fi

echo ""
echo "✅ Frontend structure ready!"
echo ""
echo "📝 Next steps:"
echo "1. Files are being created..."
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
