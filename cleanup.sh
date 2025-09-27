#!/bin/bash
# Comprehensive Workspace Cleanup Script

set -e

echo "🧹 Starting comprehensive workspace cleanup..."
echo "============================================="

# 1. Remove log files
echo "📄 Removing log files..."
rm -f app.log
rm -f client/frontend.log
rm -f server/server.log

# 2. Remove temporary video files
echo "🎬 Cleaning temporary video files..."
rm -rf server/src/public/videos/tmp/*
echo "   Temporary videos cleaned"

# 3. Remove archive files
echo "📦 Removing archive files..."
rm -f client/*.tar

# 4. Remove redundant documentation (keep essential ones)
echo "📚 Cleaning up documentation files..."
mkdir -p docs
mv AWS-SECRETS-MANAGER-INTEGRATION.md docs/ 2>/dev/null || true
mv BUILD-UPDATE-SUMMARY.md docs/ 2>/dev/null || true
mv CLOUD-DIAGNOSTIC-REPORT.md docs/ 2>/dev/null || true
mv CORS-FIX-REPORT.md docs/ 2>/dev/null || true
mv DOCKER-BUILD-REPORT.md docs/ 2>/dev/null || true
mv DOCKER-BUILD-SUMMARY.md docs/ 2>/dev/null || true
mv FIX-REPORT.md docs/ 2>/dev/null || true
mv STATUS-REPORT.md docs/ 2>/dev/null || true
mv WEBAPP-STATUS-REPORT.md docs/ 2>/dev/null || true
mv LESSONS-LEARNED.md docs/ 2>/dev/null || true
mv ECR-PUSH-GUIDE.md docs/ 2>/dev/null || true

# 5. Clean node_modules and package-lock files (will be regenerated on install)
echo "📦 Cleaning Node.js dependencies..."
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
rm -f package-lock.json
rm -f client/package-lock.json
rm -f server/package-lock.json

# 6. Clean Docker containers and images
echo "🐳 Cleaning Docker resources..."
docker container prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true

# 7. Clean SQLite database (optional - uncomment if you want fresh DB)
# echo "🗄️  Cleaning database..."
# rm -f server/data.sqlite

# 8. Create/update .gitignore
echo "📝 Updating .gitignore..."
cat > .gitignore << 'EOF'
# Logs
*.log
logs/
app.log
frontend.log
server.log

# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.production

# Database
*.sqlite
*.db

# Temporary files
tmp/
temp/
*.tmp

# Archives
*.tar
*.zip
*.gz

# Docker
.dockerignore

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Video uploads (temporary)
server/src/public/videos/tmp/
EOF

echo ""
echo "✅ Cleanup completed successfully!"
echo ""
echo "📁 Workspace structure is now clean:"
echo "   - Log files removed"
echo "   - Temporary files cleaned"
echo "   - Documentation organized in docs/ folder"
echo "   - Node modules cleaned (run npm install to restore)"
echo "   - Docker resources cleaned"
echo "   - Updated .gitignore"
echo ""
echo "🚀 Ready for fresh deployment!"