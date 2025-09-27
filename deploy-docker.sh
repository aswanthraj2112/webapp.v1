#!/bin/bash

# Docker Build and ECR Push Script
# Usage: ./deploy-docker.sh [tag]

set -e

# Configuration
AWS_ACCOUNT_ID="901444280953"
AWS_REGION="ap-southeast-2"
ECR_REPOSITORY="n11817143-videoapp"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Generate tag if not provided
if [ -z "$1" ]; then
    TAG="dynamodb-$(date +%Y%m%d-%H%M%S)"
else
    TAG="$1"
fi

echo "🐳 Docker Build and ECR Deployment"
echo "================================="
echo "Tag: $TAG"
echo "ECR URI: $ECR_URI"
echo ""

# Stop any running services
echo "🛑 Stopping running services..."
pkill -f "node src/index.js" || true
pkill -f "vite" || true
pkill -f "npm run dev" || true

# Build Docker image
echo "🏗️  Building Docker image..."
docker build -t $ECR_REPOSITORY:$TAG -t $ECR_REPOSITORY:latest .

# Tag for ECR
echo "🏷️  Tagging for ECR..."
docker tag $ECR_REPOSITORY:$TAG $ECR_URI:$TAG
docker tag $ECR_REPOSITORY:latest $ECR_URI:latest

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Create repository if it doesn't exist
echo "📦 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>/dev/null || \
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# Push to ECR
echo "⬆️  Pushing to ECR..."
docker push $ECR_URI:$TAG
docker push $ECR_URI:latest

# Save local backup
echo "💾 Saving local backup..."
docker save -o ${ECR_REPOSITORY}-${TAG}.tar $ECR_REPOSITORY:$TAG

echo ""
echo "✅ Deployment completed successfully!"
echo "📋 Summary:"
echo "   • Image: $ECR_REPOSITORY:$TAG"
echo "   • ECR URI: $ECR_URI:$TAG"
echo "   • Backup: ${ECR_REPOSITORY}-${TAG}.tar"
echo ""
echo "🚀 To run locally:"
echo "   docker run -d -p 8080:8080 -p 3000:3000 \\"
echo "     -e USE_DYNAMO=true \\"
echo "     -e USE_LOCAL_STORAGE=false \\"
echo "     -e AWS_REGION=$AWS_REGION \\"
echo "     $ECR_REPOSITORY:$TAG"