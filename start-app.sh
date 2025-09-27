#!/bin/bash

# Start the video webapp with proper domain configuration

echo "🚀 Starting Video Web Application"
echo "📍 Domain: http://n11817143-videoapp.cab432.com"
echo "🖥️  Backend: Port 8080"
echo "🌐 Frontend: Port 3000"
echo ""

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start the application
echo "🟢 Starting application..."
cd /home/ubuntu/my-node-server/webapp.v1
npm run dev