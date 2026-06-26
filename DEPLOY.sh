#!/bin/bash
# =====================================================
# NEXXLYTIC FlowX — Production Deploy Script
# Usage: bash DEPLOY.sh
# =====================================================

set -e

echo "🚀 NEXXLYTIC FlowX — Starting Deployment..."
echo "============================================="

# 1. Pull latest changes
echo "📥 Pulling latest from main..."
git pull origin main

# 2. Backend setup
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
echo "✅ Backend deps installed"

# 3. Run DB migrations
echo "🗄️  Running database migrations..."
npm run migrate
echo "✅ Migrations done"

# 4. Restart backend with PM2
echo "🔄 Restarting backend via PM2..."
pm2 restart nexxlytic-flowx || pm2 start ecosystem.config.js --env production
echo "✅ Backend restarted"
cd ..

# 5. Frontend build
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
echo "✅ Frontend built"
cd ..

echo ""
echo "============================================="
echo "✅ Deployment complete! NEXXLYTIC FlowX is live."
echo "============================================="
