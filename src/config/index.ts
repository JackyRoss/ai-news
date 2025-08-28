import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  nodeEnv: string;
  port: number;
  corsOrigin: string | string[];
  helmetCspEnabled: boolean;
  apiTimeout: number;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
    ['http://localhost:3000', 'http://localhost:3001'],
  helmetCspEnabled: process.env.HELMET_CSP_ENABLED === 'true',
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10)
};

export function getEnvironmentConfig() {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    corsOrigin: config.corsOrigin,
    isDevelopment: config.nodeEnv === 'development',
    isProduction: config.nodeEnv === 'production'
  };
}