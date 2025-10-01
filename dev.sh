#!/bin/bash
# Clean Development Setup Script

set -e

echo "🔧 Setting up clean development environment..."
echo "============================================"

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
fi

if [ -f "client/package.json" ]; then
    cd client && npm install && cd ..
fi

if [ -f "server/package.json" ]; then
    cd server && npm install && cd ..
fi

# Start development servers
echo "🚀 Starting development servers..."
echo "Frontend will be available at: http://n11817143-videoapp.cab432.com:3000"
echo "Backend will be available at: http://n11817143-videoapp.cab432.com:8080"
echo ""
echo "Press Ctrl+C to stop all servers"

# Use docker-compose for clean development
docker-compose up --build