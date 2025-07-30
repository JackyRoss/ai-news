#!/bin/bash

# Force clean deployment script
# This ensures a completely fresh deployment

set -e

echo "🚀 Force Clean Deployment Starting..."

# Clean everything
echo "🧹 Cleaning all builds and caches..."
rm -rf dist/
rm -rf frontend/build/
rm -rf node_modules/.cache/
rm -rf frontend/node_modules/.cache/

# Fresh install
echo "📦 Fresh dependency installation..."
npm install
cd frontend && npm install && cd ..

# Clean build with explicit environment variables
echo "🏗️  Clean build with production settings..."
export NODE_ENV=production
export REACT_APP_ENV=production
export REACT_APP_API_URL=""

# Build backend
npm run build

# Build frontend with explicit environment
cd frontend
NODE_ENV=production REACT_APP_ENV=production REACT_APP_API_URL="" npm run build
cd ..

# Verify build
echo "🔍 Verifying build..."
node test-api-config.js

# Deploy to Vercel with force flag
echo "🌐 Deploying to Vercel (force clean)..."

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

# Force deployment with clean cache
vercel --prod --force \
  --env NODE_ENV=production \
  --env AUTH_ENABLED=true \
  --env AUTH_USERNAME=admin \
  --env AUTH_PASSWORD=password123 \
  --env CORS_ORIGIN=* \
  --env PORT=3001

echo ""
echo "✅ Force clean deployment completed!"
echo ""
echo "🔐 Access Information:"
echo "  Username: admin"
echo "  Password: password123"
echo ""
echo "🔧 If you still see CORS errors:"
echo "  1. Clear browser cache completely"
echo "  2. Try incognito/private mode"
echo "  3. Wait 2-3 minutes for CDN propagation"
echo ""
echo "🎉 Deployment complete!"