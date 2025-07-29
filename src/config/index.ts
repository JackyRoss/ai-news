import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });

export interface AppConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  
  // CORS Configuration
  corsOrigin: string | string[];
  
  // Logging Configuration
  logLevel: string;
  logFile: string;
  
  // RSS Collection Configuration
  rssCollectionInterval: number;
  rssTimeout: number;
  rssRetryCount: number;
  
  // Storage Configuration
  maxNewsItems: number;
  newsRetentionDays: number;
  
  // Performance Configuration
  apiRateLimit: number;
  apiTimeout: number;
  
  // Security Configuration
  helmetCspEnabled: boolean;
  rateLimitingEnabled: boolean;
}

/**
 * Application configuration loaded from environment variables
 */
export const config: AppConfig = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
    ['http://localhost:3000'],
  
  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/combined.log',
  
  // RSS Collection Configuration
  rssCollectionInterval: parseInt(process.env.RSS_COLLECTION_INTERVAL || '15', 10),
  rssTimeout: parseInt(process.env.RSS_TIMEOUT || '30000', 10),
  rssRetryCount: parseInt(process.env.RSS_RETRY_COUNT || '3', 10),
  
  // Storage Configuration
  maxNewsItems: parseInt(process.env.MAX_NEWS_ITEMS || '1000', 10),
  newsRetentionDays: parseInt(process.env.NEWS_RETENTION_DAYS || '7', 10),
  
  // Performance Configuration
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  
  // Security Configuration
  helmetCspEnabled: process.env.HELMET_CSP_ENABLED === 'true',
  rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED === 'true'
};

/**
 * Validate configuration values
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  if (config.rssCollectionInterval < 1) {
    errors.push('RSS_COLLECTION_INTERVAL must be at least 1 minute');
  }
  
  if (config.rssTimeout < 1000) {
    errors.push('RSS_TIMEOUT must be at least 1000ms');
  }
  
  if (config.maxNewsItems < 100) {
    errors.push('MAX_NEWS_ITEMS must be at least 100');
  }
  
  if (config.newsRetentionDays < 1) {
    errors.push('NEWS_RETENTION_DAYS must be at least 1 day');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(): Partial<AppConfig> {
  const isDevelopment = config.nodeEnv === 'development';
  const isProduction = config.nodeEnv === 'production';
  
  return {
    // Development-specific overrides
    ...(isDevelopment && {
      logLevel: 'debug',
      corsOrigin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      helmetCspEnabled: false,
      rateLimitingEnabled: false
    }),
    
    // Production-specific overrides
    ...(isProduction && {
      logLevel: 'warn',
      helmetCspEnabled: true,
      rateLimitingEnabled: true,
      maxNewsItems: 2000,
      newsRetentionDays: 14
    })
  };
}

// Validate configuration on module load
try {
  validateConfig();
  console.log(`✅ Configuration loaded for ${config.nodeEnv} environment`);
} catch (error) {
  console.error('❌ Configuration validation failed:', error);
  process.exit(1);
}