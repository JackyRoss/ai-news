#!/bin/bash

# Clean build script for AI News Aggregator
# This ensures all environment variables are properly set

set -e

echo "🧹 Clean build process starting..."

# Clean previous builds
echo "🗑️  Cleaning previous builds..."
rm -rf dist/
rm -rf frontend/build/

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

# Set environment variables for production build
export NODE_ENV=production
export REACT_APP_ENV=production
export REACT_APP_API_URL=""

echo "🔧 Environment variables:"
echo "  NODE_ENV=$NODE_ENV"
echo "  REACT_APP_ENV=$REACT_APP_ENV"
echo "  REACT_APP_API_URL=$REACT_APP_API_URL"

# Build backend
echo "🏗️  Building backend..."
npm run build

# Build frontend with production settings
echo "🎨 Building frontend..."
cd frontend
NODE_ENV=production REACT_APP_ENV=production REACT_APP_API_URL="" npm run build
cd ..

echo "✅ Clean build completed!"
echo "📁 Backend build: dist/"
echo "📁 Frontend build: frontend/build/"