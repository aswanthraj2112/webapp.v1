#!/bin/bash
# Clean One-Command Deploy Script - Production Ready

set -e

echo "🚀 Clean Video App Deployment"
echo "============================="

# Cleanup existing containers
echo "🛑 Cleaning up existing containers..."
docker stop videoapp-production 2>/dev/null || true
docker rm videoapp-production 2>/dev/null || true

# Build fresh image if needed
echo "🏗️  Ensuring latest image..."
if ! docker image inspect n11817143-videoapp:latest >/dev/null 2>&1; then
    echo "Building fresh image..."
    docker build -t n11817143-videoapp:latest .
fi

# Deploy with optimized settings
echo "🚀 Deploying production container..."
docker run -d \
  --name videoapp-production \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 3000:3000 \
  -e USE_DYNAMO=true \
  -e USE_LOCAL_STORAGE=false \
  -e AWS_REGION=ap-southeast-2 \
  -e CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000 \
  -e PORT=8080 \
  n11817143-videoapp:latest

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Test the deployment
echo "🧪 Testing deployment..."
if curl -s http://n11817143-videoapp.cab432.com:8080/api/health | grep -q "ok"; then
    echo "✅ Backend: WORKING"
else
    echo "❌ Backend: FAILED"
    exit 1
fi

if curl -s -o /dev/null -w "%{http_code}" http://n11817143-videoapp.cab432.com:3000 | grep -q "200"; then
    echo "✅ Frontend: WORKING"
else
    echo "❌ Frontend: FAILED"
    exit 1
fi

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "📱 Frontend: http://n11817143-videoapp.cab432.com:3000"
echo "🔌 Backend:  http://n11817143-videoapp.cab432.com:8080"
echo "💾 Database: DynamoDB (n11817143-VideoApp)"
echo ""
echo "✅ Application is ready to use!"