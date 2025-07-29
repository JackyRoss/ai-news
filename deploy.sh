#!/bin/bash

# AIダイジェスト デプロイメントスクリプト
# Usage: ./deploy.sh [vercel|railway|render|docker]

set -e

DEPLOYMENT_TYPE=${1:-vercel}
PROJECT_NAME="ai-news-aggregator"

echo "🚀 AIダイジェスト デプロイメント開始..."
echo "📦 デプロイメントタイプ: $DEPLOYMENT_TYPE"

# 前処理
echo "🔧 前処理を実行中..."
npm install
cd frontend && npm install && cd ..

# ビルド
echo "🏗️  アプリケーションをビルド中..."
npm run build:all

case $DEPLOYMENT_TYPE in
  "vercel")
    echo "🌐 Vercelにデプロイ中..."
    
    # Vercel CLIがインストールされているか確認
    if ! command -v vercel &> /dev/null; then
      echo "📦 Vercel CLIをインストール中..."
      npm install -g vercel
    fi
    
    # デプロイ実行
    vercel --prod
    
    echo "✅ Vercelデプロイ完了！"
    echo "🔗 URL: https://$PROJECT_NAME.vercel.app"
    ;;
    
  "railway")
    echo "🚂 Railwayにデプロイ中..."
    
    # Railway CLIがインストールされているか確認
    if ! command -v railway &> /dev/null; then
      echo "📦 Railway CLIをインストール中..."
      npm install -g @railway/cli
    fi
    
    # デプロイ実行
    railway login
    railway up
    
    echo "✅ Railwayデプロイ完了！"
    ;;
    
  "render")
    echo "🎨 Renderにデプロイ中..."
    echo "ℹ️  Render Web Serviceを手動で設定してください:"
    echo "   1. https://render.com にアクセス"
    echo "   2. New Web Service を作成"
    echo "   3. GitHubリポジトリを接続"
    echo "   4. Build Command: npm run build:all"
    echo "   5. Start Command: npm start"
    ;;
    
  "docker")
    echo "🐳 Dockerでデプロイ中..."
    
    # Dockerイメージをビルド
    docker build -t $PROJECT_NAME .
    
    # コンテナを起動
    docker run -d \
      --name $PROJECT_NAME \
      -p 3001:3001 \
      -e NODE_ENV=production \
      -e PORT=3001 \
      -e CORS_ORIGIN=* \
      --restart unless-stopped \
      $PROJECT_NAME
    
    echo "✅ Dockerデプロイ完了！"
    echo "🔗 URL: http://localhost:3001"
    ;;
    
  *)
    echo "❌ 不明なデプロイメントタイプ: $DEPLOYMENT_TYPE"
    echo "使用可能なオプション: vercel, railway, render, docker"
    exit 1
    ;;
esac

echo ""
echo "🎉 デプロイメント完了！"
echo "📋 次のステップ:"
echo "   1. アプリケーションの動作確認"
echo "   2. カスタムドメインの設定（オプション）"
echo "   3. 監視とログの確認"
echo ""
echo "📚 詳細なガイド: DEPLOYMENT.md を参照してください"