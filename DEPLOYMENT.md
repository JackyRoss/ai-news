# 🚀 AIダイジェスト - デプロイメントガイド

このガイドでは、AIダイジェストアプリケーションを無料でパブリック公開する方法を説明します。

## 📋 デプロイメント前の準備

### 1. 必要なファイルの確認

```bash
# プロジェクトルートに以下のファイルがあることを確認
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

### Option 1: Railway - 月$5クレジット

#### ステップ1: Railwayアカウント作成

1. [Railway](https://railway.app)にアクセス
2. GitHubアカウントでサインアップ

#### ステップ2: プロジェクトデプロイ

1. 「New Project」→「Deploy from GitHub repo」
2. リポジトリを選択
3. 環境変数を設定
4. 自動デプロイ開始

### Option 2: Render - 無料プラン

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
# Railwayの場合
railway logs

# Renderの場合
# ダッシュボードでログ確認
```

### パフォーマンス監視

- Railway Metrics
- Render Metrics

### 自動更新

- 1分毎のニュース収集
- 日次データクリーンアップ
- 自動エラー回復

## 💰 コスト分析

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
curl https://your-app.railway.app/api/news

# フロントエンド確認
curl https://your-app.railway.app
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

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)

---

**🎉 これで AIダイジェスト が世界中からアクセス可能になります！**

## 🔐 認証付きデプロイメント

### 認証情報

デフォルトの認証情報:

- **ユーザー名**: `admin`
- **パスワード**: `password123`

### 認証付きデプロイ方法

#### 自動デプロイスクリプト（推奨）

```bash
# 認証付き自動デプロイ
chmod +x deploy-with-auth.sh
./deploy-with-auth.sh
```

#### 手動デプロイ

```bash
# 1. ビルド
npm run build:all

# 2. 認証付きでRailwayデプロイ
# Railway CLIを使用してデプロイ
railway deploy
```

### アクセス方法

1. **デプロイされたURLにアクセス**
   - 例: `https://your-app.railway.app`

2. **ブラウザの認証ダイアログで入力**
   - ユーザー名: `admin`
   - パスワード: `password123`

3. **認証成功後、アプリケーションが表示されます**

### 認証のカスタマイズ

環境変数で認証情報を変更できます:

```bash
# Railwayダッシュボードで設定
AUTH_ENABLED=true
AUTH_USERNAME=your_custom_username
AUTH_PASSWORD=your_secure_password
```

### トラブルシューティング

#### 404エラーが出る場合

1. 認証が有効になっているか確認
2. 環境変数が正しく設定されているか確認
3. ビルドが正常に完了しているか確認

#### 認証ダイアログが表示されない場合

1. ページを更新（F5）
2. ブラウザのキャッシュをクリア
3. シークレット/プライベートモードで試す

---

**🔒 これで認証付きのAIダイジェストが公開されます！**
