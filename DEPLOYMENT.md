# 🚀 AIダイジェスト - デプロイメントガイド

このガイドでは、AIダイジェストアプリケーションを無料でパブリック公開する方法を説明します。

## 📋 デプロイメント前の準備

### 1. 必要なファイルの確認
```bash
# プロジェクトルートに以下のファイルがあることを確認
├── vercel.json          # Vercel設定ファイル
├── .env.production      # 本番環境設定
├── package.json         # バックエンド依存関係
├── frontend/
│   ├── package.json     # フロントエンド依存関係
│   └── build/           # ビルド後に作成される
└── src/                 # バックエンドソースコード
```

### 2. 依存関係のインストール
```bash
# バックエンド依存関係
npm install

# フロントエンド依存関係
cd frontend && npm install && cd ..
```

## 🌐 デプロイメント方法

### Option 1: Vercel (推奨) - 完全無料

#### ステップ1: Vercelアカウント作成
1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでサインアップ
3. 無料プランを選択

#### ステップ2: GitHubリポジトリ準備
```bash
# GitHubに新しいリポジトリを作成
git init
git add .
git commit -m "Initial commit: AI News Aggregator"
git branch -M main
git remote add origin https://github.com/yourusername/ai-news-aggregator.git
git push -u origin main
```

#### ステップ3: Vercelでデプロイ
1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリを選択
3. プロジェクト設定:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: frontend/build
4. 環境変数を設定:
   ```
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=*
   ```
5. 「Deploy」をクリック

#### ステップ4: カスタムドメイン設定（オプション）
1. Vercelプロジェクト設定で「Domains」タブ
2. 無料の `.vercel.app` ドメインまたはカスタムドメインを設定

### Option 2: Railway - 月$5クレジット

#### ステップ1: Railwayアカウント作成
1. [Railway](https://railway.app)にアクセス
2. GitHubアカウントでサインアップ

#### ステップ2: プロジェクトデプロイ
1. 「New Project」→「Deploy from GitHub repo」
2. リポジトリを選択
3. 環境変数を設定
4. 自動デプロイ開始

### Option 3: Render - 無料プラン

#### ステップ1: Renderアカウント作成
1. [Render](https://render.com)にアクセス
2. GitHubアカウントでサインアップ

#### ステップ2: Web Serviceを作成
1. 「New」→「Web Service」
2. GitHubリポジトリを接続
3. 設定:
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm start`
4. 環境変数を設定

## 🔧 本番環境設定

### 環境変数
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
API_TIMEOUT=30000
HELMET_CSP_ENABLED=true
LOG_LEVEL=info
RSS_COLLECTION_INTERVAL=60000
MAX_NEWS_ITEMS=1000
DATA_RETENTION_DAYS=7
```

### セキュリティ設定
- HTTPS自動有効化
- CORS設定済み
- Helmet.jsによるセキュリティヘッダー
- CSP（Content Security Policy）有効

## 📊 監視とメンテナンス

### ログ監視
```bash
# Vercelの場合
vercel logs

# Railwayの場合
railway logs

# Renderの場合
# ダッシュボードでログ確認
```

### パフォーマンス監視
- Vercel Analytics（無料）
- Railway Metrics
- Render Metrics

### 自動更新
- 1分毎のニュース収集
- 日次データクリーンアップ
- 自動エラー回復

## 💰 コスト分析

### Vercel（推奨）
- ✅ **完全無料**
- ✅ 100GB帯域幅/月
- ✅ 無制限デプロイ
- ✅ カスタムドメイン
- ✅ SSL証明書

### Railway
- 💰 **月$5クレジット**
- ✅ 十分な使用量
- ✅ データベース込み
- ✅ 自動スケーリング

### Render
- ✅ **無料プラン**
- ⚠️ 制限あり（750時間/月）
- ✅ 自動SSL
- ✅ カスタムドメイン

## 🚀 デプロイ後の確認

### 1. 動作確認
```bash
# APIエンドポイント確認
curl https://your-app.vercel.app/api/news

# フロントエンド確認
curl https://your-app.vercel.app
```

### 2. 機能テスト
- ✅ ニュース一覧表示
- ✅ カテゴリフィルタリング
- ✅ 検索機能
- ✅ ブックマーク機能
- ✅ 新着通知
- ✅ レスポンシブデザイン

### 3. パフォーマンス確認
- ✅ ページ読み込み速度
- ✅ API応答時間
- ✅ モバイル対応

## 🔄 継続的デプロイメント

### 自動デプロイ設定
```bash
# main ブランチへのプッシュで自動デプロイ
git add .
git commit -m "Update: new features"
git push origin main
```

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発

## 📞 サポート

### トラブルシューティング
1. **ビルドエラー**: 依存関係を確認
2. **API エラー**: 環境変数を確認
3. **CORS エラー**: CORS設定を確認

### 参考リンク
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)

---

**🎉 これで AIダイジェスト が世界中からアクセス可能になります！**