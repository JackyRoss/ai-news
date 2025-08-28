# Vercel デプロイメントガイド

## 概要
このプロジェクトは以下の構成でデプロイします：
- **フロントエンド**: Vercel（静的サイト）
- **バックエンドAPI**: Railway（Node.jsアプリ）

## 手順

### 1. バックエンドAPIをRailwayにデプロイ

```bash
# Railway CLIをインストール
npm install -g @railway/cli

# Railwayにログイン
railway login

# プロジェクトを作成してデプロイ
railway up
```

### 2. APIのURLを取得
Railwayのダッシュボードから、デプロイされたAPIのURLを取得します。
例: `https://your-project-name.railway.app`

### 3. フロントエンドの環境変数を更新

`frontend/.env.production`を編集：
```env
REACT_APP_API_URL=https://your-project-name.railway.app
```

### 4. フロントエンドをVercelにデプロイ

```bash
# Vercel CLIをインストール
npm install -g vercel

# デプロイ
vercel --prod
```

## 設定ファイル

### vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "frontend/build",
  "installCommand": "npm install"
}
```

### package.json (vercel-buildスクリプト)
```json
{
  "scripts": {
    "vercel-build": "npm run build && cd frontend && npm install && npm run build"
  }
}
```

## トラブルシューティング

### "No Output Directory found" エラー
- `vercel.json`の`outputDirectory`が正しく設定されているか確認
- `npm run vercel-build`が正常に実行されるか確認
- `frontend/build`ディレクトリが作成されているか確認

### API接続エラー
- `frontend/.env.production`のAPI URLが正しいか確認
- RailwayのAPIが正常に動作しているか確認
- CORSの設定が正しいか確認