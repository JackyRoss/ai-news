// Main entry point for AI News Aggregator
import { APIServer } from './api/server';
import { AICategory } from './types';
import { config } from './config';

let server: APIServer | null = null;

async function main() {
  try {
    console.log('🚀 Starting AI News Aggregator...');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port: ${config.port}`);
    console.log(`CORS Origins: ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`);
    console.log('Available AI Categories:', Object.values(AICategory));

    // Create and start API server with configuration
    server = new APIServer();
    await server.start();
    
    console.log('✅ AI News Aggregator API server started successfully');
  } catch (error) {
    console.error('❌ Failed to start AI News Aggregator:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    try {
      await server.shutdown();
    } catch (error) {
      console.error('❌ Error during server shutdown:', error);
    }
  }
  
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the application
if (require.main === module) {
  main();
}

// Export types and server for use by other modules
export * from './types';
export { APIServer } from './api/server';