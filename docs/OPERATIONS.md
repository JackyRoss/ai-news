# AI News Aggregator 運用マニュアル

## 📋 概要

このドキュメントは、AI News Aggregatorシステムの運用担当者向けの詳細な運用マニュアルです。

## 🚀 システム起動・停止

### Docker Compose環境

#### 起動
```bash
# 通常起動
docker-compose up -d

# ビルドから起動
docker-compose up -d --build

# 特定サービスのみ起動
docker-compose up -d ai-news-aggregator
```

#### 停止
```bash
# 全サービス停止
docker-compose down

# データ保持して停止
docker-compose stop

# 完全削除（データも削除）
docker-compose down -v
```

#### 再起動
```bash
# 全サービス再起動
docker-compose restart

# 特定サービス再起動
docker-compose restart ai-news-aggregator
```

### 手動起動（開発環境）

```bash
# 開発モード
npm run dev

# 本番モード
npm run start:prod
```

## 📊 監視とヘルスチェック

### システム状態確認

#### ヘルスチェック
```bash
# 基本ヘルスチェック
curl http://localhost:3001/health

# 詳細システム状態
curl http://localhost:3001/api/status
```

#### スケジューラー状態
```bash
# スケジューラー状態確認
curl http://localhost:3001/api/scheduler/status

# スケジューラー開始
curl -X POST http://localhost:3001/api/scheduler/start

# スケジューラー停止
curl -X POST http://localhost:3001/api/scheduler/stop
```

### ログ監視

#### Docker環境
```bash
# リアルタイムログ
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f ai-news-aggregator

# 最新100行
docker-compose logs --tail=100 ai-news-aggregator
```

#### ログファイル
```bash
# 全ログ
tail -f logs/combined.log

# エラーログのみ
tail -f logs/error.log

# パフォーマンスログ
tail -f logs/performance.log
```

## 🔧 設定管理

### 環境変数の変更

1. **設定ファイル編集**
```bash
# 本番環境設定
nano .env.production

# フロントエンド設定
nano frontend/.env.production
```

2. **Docker環境での反映**
```bash
# 設定変更後の再起動
docker-compose down
docker-compose up -d
```

### 重要な設定項目

#### RSS収集設定
```env
RSS_COLLECTION_INTERVAL=15    # 収集間隔（分）
RSS_TIMEOUT=30000            # タイムアウト（ミリ秒）
RSS_RETRY_COUNT=3            # リトライ回数
```

#### ストレージ設定
```env
MAX_NEWS_ITEMS=2000          # 最大保存件数
NEWS_RETENTION_DAYS=14       # 保存期間（日）
```

#### パフォーマンス設定
```env
API_RATE_LIMIT=200           # API レート制限
API_TIMEOUT=30000            # API タイムアウト
```

## 🗄️ データ管理

### データバックアップ

#### ログファイルのバックアップ
```bash
# ログアーカイブ作成
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# 古いログの削除（30日以上）
find logs/ -name "*.log" -mtime +30 -delete
```

#### 設定ファイルのバックアップ
```bash
# 設定ファイルバックアップ
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env* frontend/.env* docker-compose.yml nginx.conf
```

### データクリーンアップ

#### 手動データクリーンアップ
```bash
# 古いニュースデータの削除（APIから）
curl -X POST http://localhost:3001/api/cleanup
```

#### ログローテーション設定
```bash
# logrotate設定例
sudo nano /etc/logrotate.d/ai-news-aggregator
```

```
/path/to/ai-news-aggregator/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 nodejs nodejs
    postrotate
        docker-compose restart ai-news-aggregator
    endscript
}
```

## 🚨 トラブルシューティング

### よくある問題と対処法

#### 1. RSS収集エラー

**症状**: ニュースが更新されない
```bash
# ログ確認
docker-compose logs ai-news-aggregator | grep -i error

# 手動収集テスト
curl -X POST http://localhost:3001/api/collect
```

**対処法**:
- ネットワーク接続確認
- RSS URL の有効性確認
- タイムアウト設定の調整

#### 2. メモリ不足

**症状**: システムが重い、応答が遅い
```bash
# メモリ使用量確認
docker stats ai-news-aggregator

# システム状態確認
curl http://localhost:3001/api/status
```

**対処法**:
```env
# 設定調整
MAX_NEWS_ITEMS=1000
NEWS_RETENTION_DAYS=7
```

#### 3. API応答エラー

**症状**: フロントエンドでデータが表示されない
```bash
# API テスト
curl http://localhost:3001/api/news
curl http://localhost:3001/api/categories
```

**対処法**:
- CORS設定確認
- API エンドポイント確認
- ネットワーク設定確認

#### 4. Docker コンテナ起動失敗

**症状**: コンテナが起動しない
```bash
# コンテナ状態確認
docker-compose ps

# エラーログ確認
docker-compose logs ai-news-aggregator
```

**対処法**:
```bash
# イメージ再ビルド
docker-compose build --no-cache

# 完全クリーンアップ
docker-compose down -v
docker system prune -a
```

## 📈 パフォーマンス監視

### メトリクス収集

#### システムメトリクス
```bash
# CPU・メモリ使用量
docker stats --no-stream

# ディスク使用量
df -h

# ネットワーク統計
netstat -i
```

#### アプリケーションメトリクス
```bash
# API レスポンス時間
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/news

# ニュース収集統計
curl http://localhost:3001/api/status | jq '.data.storage'
```

### パフォーマンス最適化

#### 1. メモリ最適化
```env
# Node.js メモリ制限
NODE_OPTIONS="--max-old-space-size=512"
```

#### 2. ネットワーク最適化
```env
# 並列処理数制限
RSS_CONCURRENT_LIMIT=3
```

#### 3. ストレージ最適化
```env
# データ保持期間短縮
NEWS_RETENTION_DAYS=7
MAX_NEWS_ITEMS=500
```

## 🔐 セキュリティ管理

### セキュリティチェック

#### 1. 依存関係の脆弱性チェック
```bash
# npm audit
npm audit

# 自動修正
npm audit fix
```

#### 2. Docker イメージのセキュリティスキャン
```bash
# Trivy でスキャン
trivy image ai-news-aggregator:latest
```

#### 3. ログ監視
```bash
# 不審なアクセスパターン
grep -i "error\|fail\|attack" logs/combined.log

# レート制限違反
grep "rate limit" logs/combined.log
```

### セキュリティ設定

#### HTTPS設定
```bash
# SSL証明書の更新
certbot renew

# 証明書の確認
openssl x509 -in ssl/cert.pem -text -noout
```

#### ファイアウォール設定
```bash
# 必要なポートのみ開放
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3001/tcp  # 直接アクセス禁止
```

## 📅 定期メンテナンス

### 日次作業
- [ ] システム状態確認
- [ ] エラーログチェック
- [ ] ディスク使用量確認

### 週次作業
- [ ] パフォーマンスメトリクス確認
- [ ] ログファイルのアーカイブ
- [ ] セキュリティログ確認

### 月次作業
- [ ] 依存関係の更新確認
- [ ] バックアップの確認
- [ ] システム設定の見直し

### 四半期作業
- [ ] セキュリティ監査
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新

## 📞 緊急時対応

### 緊急連絡先
- システム管理者: [連絡先]
- 開発チーム: [連絡先]
- インフラチーム: [連絡先]

### 緊急時手順

#### 1. システム停止
```bash
# 緊急停止
docker-compose down

# プロセス強制終了
pkill -f "node.*ai-news"
```

#### 2. ログ保存
```bash
# 緊急時ログ保存
cp -r logs/ emergency-logs-$(date +%Y%m%d-%H%M%S)/
```

#### 3. 復旧手順
```bash
# 設定確認
docker-compose config

# 段階的復旧
docker-compose up -d ai-news-aggregator
docker-compose up -d nginx
```

## 📋 チェックリスト

### デプロイ前チェック
- [ ] 環境変数設定確認
- [ ] SSL証明書有効性確認
- [ ] バックアップ作成
- [ ] テスト実行
- [ ] ログ設定確認

### 運用開始後チェック
- [ ] ヘルスチェック正常
- [ ] RSS収集動作確認
- [ ] API応答確認
- [ ] フロントエンド表示確認
- [ ] ログ出力確認

---

このマニュアルは定期的に更新し、最新の運用状況を反映してください。