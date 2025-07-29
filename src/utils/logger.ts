import winston from 'winston';
import path from 'path';

/**
 * Log levels for the application
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

/**
 * Log categories for better organization
 */
export enum LogCategory {
  SCHEDULER = 'scheduler',
  COLLECTOR = 'collector',
  CLASSIFIER = 'classifier',
  STORAGE = 'storage',
  API = 'api',
  SYSTEM = 'system'
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  itemsProcessed?: number;
  memoryUsage?: number;
  success: boolean;
  error?: string;
}

/**
 * Collection metrics interface
 */
export interface CollectionMetrics {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalItemsCollected: number;
  duplicatesFiltered: number;
  itemsSaved: number;
  duration: number;
  memoryUsage: number;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: string;
  maxFiles: number;
  enableRotation: boolean;
}

/**
 * Enhanced logger service with structured logging and monitoring capabilities
 */
class LoggerService {
  private logger: winston.Logger;
  private config: LoggerConfig;
  private performanceMetrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 100;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      logDirectory: 'logs',
      maxFileSize: '20m',
      maxFiles: 14,
      enableRotation: true,
      ...config
    };

    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance with configured transports
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
              const categoryStr = category ? `[${category}] ` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${categoryStr}${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transports
    if (this.config.enableFile) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.config.logDirectory, 'combined.log'),
          level: this.config.level,
          maxsize: this.parseSize(this.config.maxFileSize),
          maxFiles: this.config.enableRotation ? this.config.maxFiles : undefined,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.config.logDirectory, 'error.log'),
          level: LogLevel.ERROR,
          maxsize: this.parseSize(this.config.maxFileSize),
          maxFiles: this.config.enableRotation ? this.config.maxFiles : undefined,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Performance log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.config.logDirectory, 'performance.log'),
          level: LogLevel.INFO,
          maxsize: this.parseSize(this.config.maxFileSize),
          maxFiles: this.config.enableRotation ? this.config.maxFiles : undefined,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    });
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };

    const match = sizeStr.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    if (!match) return 20 * 1024 * 1024; // Default 20MB

    const size = match[1];
    const unit = match[2] || 'b';
    
    if (!size) return 20 * 1024 * 1024; // Default 20MB
    
    return parseInt(size, 10) * (units[unit] || 1);
  }

  /**
   * Log error message
   */
  error(message: string, category?: LogCategory, meta?: any): void {
    this.logger.error(message, { category, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, category?: LogCategory, meta?: any): void {
    this.logger.warn(message, { category, ...meta });
  }

  /**
   * Log info message
   */
  info(message: string, category?: LogCategory, meta?: any): void {
    this.logger.info(message, { category, ...meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, category?: LogCategory, meta?: any): void {
    this.logger.debug(message, { category, ...meta });
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, meta?: any): void {
    this.logger.http(message, { category: LogCategory.API, ...meta });
  }

  /**
   * Log performance metrics
   */
  performance(metrics: PerformanceMetrics, category?: LogCategory): void {
    const logData = {
      type: 'performance',
      category: category || LogCategory.SYSTEM,
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Performance metrics', logData);

    // Store metrics for monitoring
    this.performanceMetrics.push(metrics);
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Log collection metrics
   */
  collection(metrics: CollectionMetrics): void {
    const logData = {
      type: 'collection',
      category: LogCategory.SCHEDULER,
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Collection completed', logData);
  }

  /**
   * Log system status
   */
  systemStatus(status: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    activeConnections?: number;
    totalRequests?: number;
  }): void {
    const logData = {
      type: 'system_status',
      category: LogCategory.SYSTEM,
      ...status,
      timestamp: new Date().toISOString()
    };

    this.logger.info('System status', logData);
  }

  /**
   * Log scheduler events
   */
  scheduler(event: 'started' | 'stopped' | 'paused' | 'resumed' | 'collection_started' | 'collection_completed' | 'collection_failed', meta?: any): void {
    const message = `Scheduler ${event.replace('_', ' ')}`;
    this.logger.info(message, { 
      category: LogCategory.SCHEDULER, 
      event,
      ...meta 
    });
  }

  /**
   * Log RSS collection events
   */
  rssCollection(event: 'started' | 'completed' | 'failed', source: string, meta?: any): void {
    const level = event === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    const message = `RSS collection ${event} for ${source}`;
    
    this.logger.log(level, message, {
      category: LogCategory.COLLECTOR,
      event,
      source,
      ...meta
    });
  }

  /**
   * Log classification events
   */
  classification(event: 'started' | 'completed' | 'item_classified', meta?: any): void {
    const message = `Classification ${event.replace('_', ' ')}`;
    this.logger.info(message, {
      category: LogCategory.CLASSIFIER,
      event,
      ...meta
    });
  }

  /**
   * Log storage events
   */
  storage(event: 'saved' | 'duplicate_filtered' | 'cleanup' | 'error', meta?: any): void {
    const level = event === 'error' ? LogLevel.ERROR : LogLevel.INFO;
    const message = `Storage ${event.replace('_', ' ')}`;
    
    this.logger.log(level, message, {
      category: LogCategory.STORAGE,
      event,
      ...meta
    });
  }

  /**
   * Get recent performance metrics
   */
  getPerformanceMetrics(limit?: number): PerformanceMetrics[] {
    const metrics = [...this.performanceMetrics];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    totalItemsProcessed: number;
    averageMemoryUsage: number;
  } {
    const metrics = this.performanceMetrics;
    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalItems = metrics.reduce((sum, m) => sum + (m.itemsProcessed || 0), 0);
    const totalMemory = metrics.filter(m => m.memoryUsage).reduce((sum, m) => sum + (m.memoryUsage || 0), 0);
    const memoryCount = metrics.filter(m => m.memoryUsage).length;

    return {
      totalOperations: metrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageDuration: metrics.length > 0 ? totalDuration / metrics.length : 0,
      totalItemsProcessed: totalItems,
      averageMemoryUsage: memoryCount > 0 ? totalMemory / memoryCount : 0
    };
  }

  /**
   * Clear performance metrics history
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
    this.info('Performance metrics cleared', LogCategory.SYSTEM);
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate logger with new configuration
    this.logger.close();
    this.logger = this.createLogger();
    
    this.info('Logger configuration updated', LogCategory.SYSTEM, { config: this.config });
  }

  /**
   * Get current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Create a child logger with additional context
   */
  child(defaultMeta: any): winston.Logger {
    return this.logger.child(defaultMeta);
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Gracefully close the logger
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof this.logger.close === 'function') {
        this.logger.close();
      }
      resolve();
    });
  }
}

// Create and export singleton logger instance
export const logger = new LoggerService();

// Export the LoggerService class for custom instances
export { LoggerService };

// Export utility functions
export const createLogger = (config?: Partial<LoggerConfig>) => new LoggerService(config);

// Export performance monitoring utilities
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  category?: LogCategory
): Promise<T> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage().heapUsed - startMemory;
    
    logger.performance({
      operation,
      duration,
      memoryUsage,
      success: true
    }, category);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage().heapUsed - startMemory;
    
    logger.performance({
      operation,
      duration,
      memoryUsage,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, category);
    
    throw error;
  }
};

export default logger;