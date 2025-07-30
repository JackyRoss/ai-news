import { Request, Response, NextFunction } from 'express';

// Simple basic authentication middleware
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for health check, API endpoints, and static assets
  if (req.path === '/health' || 
      req.path.startsWith('/api/') || 
      req.path.startsWith('/static/') ||
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    return next();
  }

  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AI News Aggregator"');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Required - AI News Aggregator</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            background-color: #f3f4f6;
          }
          .container { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
          }
          .logo {
            width: 48px;
            height: 48px;
            background: #2563eb;
            border-radius: 8px;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
          }
          h1 { color: #1f2937; margin-bottom: 0.5rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          .credentials {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            font-family: monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🤖</div>
          <h1>AIダイジェスト</h1>
          <p>このサイトにアクセスするには認証が必要です</p>
          <div class="credentials">
            <strong>認証情報:</strong><br>
            ユーザー名: admin<br>
            パスワード: password123
          </div>
          <p style="margin-top: 1rem; font-size: 12px;">
            ブラウザの認証ダイアログが表示されない場合は、ページを更新してください
          </p>
        </div>
      </body>
      </html>
    `);
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Default credentials (change these!)
  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'password123';

  if (username === validUsername && password === validPassword) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="AI News Aggregator"');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed - AI News Aggregator</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            background-color: #f3f4f6;
          }
          .container { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
          }
          .logo {
            width: 48px;
            height: 48px;
            background: #dc2626;
            border-radius: 8px;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
          }
          h1 { color: #1f2937; margin-bottom: 0.5rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          .credentials {
            background: #fef2f2;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #fecaca;
            font-family: monospace;
            font-size: 14px;
          }
          .retry {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">❌</div>
          <h1>認証に失敗しました</h1>
          <p>ユーザー名またはパスワードが正しくありません</p>
          <div class="credentials">
            <strong>正しい認証情報:</strong><br>
            ユーザー名: admin<br>
            パスワード: password123
          </div>
          <a href="/" class="retry">再試行</a>
        </div>
      </body>
      </html>
    `);
  }
};