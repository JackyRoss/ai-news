# AI News Aggregator

AIを学習したい人向けの日本語対応ニュース集約システム。複数の情報源から最新のAI関連情報を自動収集し、10の専門カテゴリに分類して表示するWebアプリケーション。

## 🌐 ライブデモ

**パブリック公開版**: [https://ai-digest.railway.app](https://ai-digest.railway.app) _(デプロイ後に更新)_

## 🚀 機能

- **自動ニュース収集**: 1分毎に6つのRSS情報源から最新のAI関連ニュースを自動収集
- **インテリジェント分類**: 10の専門カテゴリ（AIモデル、AIアシスタント、AI IDE等）に自動分類
- **日本語対応**: 日本語コンテンツを優先し、使いやすい日本語UI
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **リアルタイム更新**: 重複除去機能付きで常に最新情報を提供
- **ブックマーク機能**: 気になる記事を保存・管理
- **新着通知**: 新しい記事の通知とRead Moreボタン
- **日次リセット**: 日本時間0時に記事数リセット
- **REST API**: フロントエンドやサードパーティアプリケーション向けAPI

## 📋 システム要件

### 開発環境

- Node.js 18.x 以上
- npm 8.x 以上
- TypeScript 5.x

### 本番環境

- Docker & Docker Compose
- 最低 512MB RAM
- 1GB ディスク容量

## 🛠️ セットアップ

### 開発環境

1. **リポジトリのクローン**

```bash
git clone <repository-url>
cd ai-news-aggregator
```

2. **依存関係のインストール**

```bash
# バックエンド
npm install

# フロントエンド
cd frontend
npm install
cd ..
```

3. **環境変数の設定**

```bash
# バックエンド環境変数をコピー
cp .env.development .env

# フロントエンド環境変数をコピー
cp frontend/.env frontend/.env.local
```

4. **開発サーバーの起動**

**方法1: 個別起動（推奨）**

```bash
# ターミナル1: バックエンド起動 (ポート 3001)
npm run dev

# ターミナル2: フロントエンド起動 (ポート 3000)
cd frontend
npm start
```

**方法2: 統合起動コマンド**

```bash
# 両方を同時に起動（Windows）
npm run start:all

# 個別起動コマンド
npm run start:backend    # バックエンドのみ
npm run start:frontend   # フロントエンドのみ
```

5. **アクセス**

- **フロントエンド**: http://localhost:3000 （メインのポータル画面）
- **バックエンドAPI**: http://localhost:3001/api
- **ヘルスチェック**: http://localhost:3001/health
- **システム状態**: http://localhost:3001/api/status

6. **初回起動時の確認**

```bash
# バックエンドの動作確認
curl http://localhost:3001/health

# ニュース取得確認
curl http://localhost:3001/api/news

# 手動ニュース収集
curl -X POST http://localhost:3001/api/collect
```

### 本番環境 (Docker)

1. **環境変数の設定**

```bash
# 本番環境用の設定を編集
nano .env.production
nano frontend/.env.production
```

2. **Docker Composeでの起動**

```bash
# ビルドと起動
docker-compose up -d

# ログの確認
docker-compose logs -f
```

3. **SSL証明書の設定** (オプション)

```bash
# SSL証明書を配置
mkdir ssl
# cert.pem と key.pem を ssl/ ディレクトリに配置
```

## 🔧 設定

### 環境変数

#### バックエンド (.env.production)

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=info
RSS_COLLECTION_INTERVAL=15
MAX_NEWS_ITEMS=2000
NEWS_RETENTION_DAYS=14
```

#### フロントエンド (frontend/.env.production)

```env
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_ENV=production
REACT_APP_ENABLE_DEBUG=false
```

### RSS情報源

システムは以下の情報源から自動収集します：

1. **AINOW** - https://ainow.ai/feed/
2. **Publickey** - https://www.publickey1.jp/atom.xml
3. **ITmedia NEWS** - https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml
4. **CodeZine** - https://codezine.jp/rss/new/20/index.xml
5. **日経クロステック** - https://xtech.nikkei.com/rss/index.rdf
6. **Qiita AI タグ** - https://qiita.com/tags/ai/feed

### AIカテゴリ

ニュースは以下の10カテゴリに自動分類されます：

- AIモデル (LLMなど)
- AIアシスタント
- AIエージェント
- AI IDE
- AI CLIツール
- AI検索・ナレッジベース
- AI統合ツール (SaaS連携)
- AI音声・マルチモーダル
- AIノーコードツール
- AIデータ分析

## 📡 API エンドポイント

### ニュース取得

```http
GET /api/news
GET /api/news?category=AIモデル
GET /api/news?limit=20&offset=0
GET /api/news?startDate=2024-01-01&endDate=2024-12-31
```

### カテゴリ情報

```http
GET /api/categories
```

### システム状態

```http
GET /api/status
GET /api/scheduler/status
```

### 手動収集

```http
POST /api/collect
```

### スケジューラー制御

```http
POST /api/scheduler/start
POST /api/scheduler/stop
```

## 🧪 テスト

### ユニットテスト

```bash
npm test
npm run test:watch
```

### 統合テスト

```bash
npm run test:integration
```

### フルシステムテスト

```bash
node scripts/test-integration.js
```

## 📊 監視とログ

### ログファイル

- `logs/combined.log` - 全ログ
- `logs/error.log` - エラーログ
- `logs/performance.log` - パフォーマンスログ

### ヘルスチェック

```bash
curl http://localhost:3001/health
```

### システム状態確認

```bash
curl http://localhost:3001/api/status
```

## 🚀 デプロイ

### Docker Compose (推奨)

```bash
# 本番環境での起動
docker-compose -f docker-compose.yml up -d

# スケーリング
docker-compose up -d --scale ai-news-aggregator=2
```

### 手動デプロイ

```bash
# ビルド
npm run build:prod

# 本番起動
npm run start:prod
```

## 🔒 セキュリティ

- CORS設定による適切なオリジン制限
- Helmet.jsによるセキュリティヘッダー
- レート制限機能
- 入力値検証
- CSP (Content Security Policy) 対応

## 🐛 トラブルシューティング

### よくある問題

1. **RSS取得エラー**
   - ネットワーク接続を確認
   - RSS URLの有効性を確認
   - ログファイルでエラー詳細を確認

2. **メモリ不足**
   - `MAX_NEWS_ITEMS` を調整
   - `NEWS_RETENTION_DAYS` を短縮

3. **CORS エラー**
   - `CORS_ORIGIN` 設定を確認
   - フロントエンドのAPIエンドポイント設定を確認

### ログレベル調整

```env
LOG_LEVEL=debug  # 詳細ログ
LOG_LEVEL=info   # 標準ログ
LOG_LEVEL=warn   # 警告のみ
LOG_LEVEL=error  # エラーのみ
```

## 🤝 開発に参加

### 開発フロー

1. Issue作成
2. Feature branchの作成
3. 実装とテスト
4. Pull Request作成
5. コードレビュー
6. マージ

### コーディング規約

- ESLint + Prettier使用
- TypeScript strict mode
- テストカバレッジ80%以上

## 📄 ライセンス

MIT License

## 📞 サポート

- Issues: GitHub Issues
- Documentation: このREADME
- API Documentation: `/api/status` エンドポイント

## 🔄 更新履歴

### v1.0.0

- 初回リリース
- 基本的なニュース収集・分類機能
- REST API提供
- React フロントエンド
- Docker対応

---

**注意**: 本番環境では必ず適切なSSL証明書を設定し、環境変数を適切に設定してください。

##

🌐 パブリック公開・デプロイメント

### 🆓 無料デプロイメント（推奨）

#### Railway（月$5クレジット）

```bash
# 1. 依存関係インストール
npm install
cd frontend && npm install && cd ..

# 2. ビルド
npm run build:all

# 3. Railway CLIでデプロイ
npm install -g @railway/cli
railway deploy
```

#### 自動デプロイスクリプト

```bash
# 簡単デプロイ
chmod +x deploy.sh
./deploy.sh railway
```

### 🐳 Docker デプロイメント

```bash
# Dockerイメージビルド
docker build -t ai-news-aggregator .

# コンテナ起動
docker run -d -p 3001:3001 --name ai-news-aggregator ai-news-aggregator
```

### 📋 デプロイメント設定

#### 環境変数（本番環境）

```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
API_TIMEOUT=30000
RSS_COLLECTION_INTERVAL=60000
MAX_NEWS_ITEMS=1000
DATA_RETENTION_DAYS=7
```

#### 必要なファイル

- `.env.production` - 本番環境変数
- `Dockerfile` - Docker設定
- `deploy.sh` - デプロイスクリプト

### 🔧 デプロイメント後の確認

```bash
# ヘルスチェック
curl https://your-app.railway.app/health

# API動作確認
curl https://your-app.railway.app/api/news

# フロントエンド確認
curl https://your-app.railway.app
```

### 📊 無料プラン制限

| プラットフォーム | 制限            | コスト  |
| ---------------- | --------------- | ------- |
| **Railway**      | $5クレジット/月 | 月$5 💰 |
| Render           | 750時間/月      | 無料 ✅ |

### 📚 詳細ガイド

完全なデプロイメントガイドは [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

---

## 🎉 パブリック公開完了！

これで世界中からアクセス可能なAIニュースアグリゲーターが完成しました！

**🔗 デプロイ後のURL例**: `https://ai-digest.railway.app`
