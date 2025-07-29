import { Request, Response, NextFunction } from 'express';

// Simple basic authentication middleware
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for health check and API endpoints
  if (req.path === '/health' || req.path.startsWith('/api/')) {
    return next();
  }

  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AI News Aggregator"');
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide username and password' 
    });
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
    return res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Username or password is incorrect' 
    });
  }
};