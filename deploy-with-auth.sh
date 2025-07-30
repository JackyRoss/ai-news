#!/bin/bash

# AIダイジェスト 認証付きデプロイメントスクリプト
# Usage: ./deploy-with-auth.sh

set -e

echo "🔐 認証付きAIダイジェスト デプロイメント開始..."

# 前処理
echo "🔧 前処理を実行中..."
npm install
cd frontend && npm install && cd ..

# クリーンビルド
echo "🏗️  アプリケーションをクリーンビルド中..."
./build-clean.sh

# 認証情報の確認
echo "🔑 認証情報:"
echo "   ユーザー名: admin"
echo "   パスワード: password123"

# Vercelにデプロイ
echo "🌐 Vercelに認証付きでデプロイ中..."

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
  echo "📦 Vercel CLIをインストール中..."
  npm install -g vercel
fi

# 環境変数を設定してデプロイ
vercel --prod \
  --env AUTH_ENABLED=true \
  --env AUTH_USERNAME=admin \
  --env AUTH_PASSWORD=password123 \
  --env NODE_ENV=production \
  --env PORT=3001 \
  --env CORS_ORIGIN=*

echo ""
echo "✅ 認証付きデプロイ完了！"
echo ""
echo "🔐 アクセス方法:"
echo "   1. デプロイされたURLにアクセス"
echo "   2. ブラウザの認証ダイアログで以下を入力:"
echo "      ユーザー名: admin"
echo "      パスワード: password123"
echo ""
echo "📋 注意事項:"
echo "   - 初回アクセス時に認証ダイアログが表示されます"
echo "   - 認証情報はブラウザに保存されます"
echo "   - ログアウトするにはブラウザを閉じてください"
echo ""
echo "🎉 デプロイメント完了！"