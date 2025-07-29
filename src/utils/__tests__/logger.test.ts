import { LoggerService, LogLevel, LogCategory, measurePerformance } from '../logger';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Mock winston to avoid actual file operations during tests
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    log: jest.fn(),
    close: jest.fn((callback) => callback && callback())
  }),
  format: {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    errors: jest.fn().mockReturnValue({}),
    json: jest.fn().mockReturnValue({}),
    colorize: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({})
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let mockWinstonLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockWinstonLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      http: jest.fn(),
      log: jest.fn(),
      close: jest.fn((callback) => callback && callback()),
      child: jest.fn()
    } as any;

    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
    
    loggerService = new LoggerService({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false // Disable file logging for tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create logger with default configuration', () => {
      const logger = new LoggerService();
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should create logger with custom configuration', () => {
      const config = {
        level: LogLevel.ERROR,
        enableConsole: false,
        enableFile: true
      };
      
      const logger = new LoggerService(config);
      expect(winston.createLogger).toHaveBeenCalled();
    });
  });

  describe('Logging Methods', () => {
    it('should log error messages', () => {
      const message = 'Test error message';
      const category = LogCategory.SYSTEM;
      const meta = { key: 'value' };

      loggerService.error(message, category, meta);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
        category,
        ...meta
      });
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const category = LogCategory.SCHEDULER;

      loggerService.warn(message, category);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, {
        category
      });
    });

    it('should log info messages', () => {
      const message = 'Test info message';
      const category = LogCategory.COLLECTOR;

      loggerService.info(message, category);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, {
        category
      });
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const category = LogCategory.API;

      loggerService.debug(message, category);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, {
        category
      });
    });

    it('should log HTTP messages', () => {
      const message = 'HTTP request';
      const meta = { method: 'GET', url: '/api/test' };

      loggerService.http(message, meta);

      expect(mockWinstonLogger.http).toHaveBeenCalledWith(message, {
        category: LogCategory.API,
        ...meta
      });
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      const metrics = {
        operation: 'test_operation',
        duration: 100,
        itemsProcessed: 5,
        memoryUsage: 1024,
        success: true
      };

      loggerService.performance(metrics, LogCategory.COLLECTOR);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Performance metrics', 
        expect.objectContaining({
          type: 'performance',
          category: LogCategory.COLLECTOR,
          ...metrics,
          timestamp: expect.any(String)
        })
      );
    });

    it('should store performance metrics for monitoring', () => {
      const metrics = {
        operation: 'test_operation',
        duration: 100,
        success: true
      };

      loggerService.performance(metrics);
      
      const storedMetrics = loggerService.getPerformanceMetrics();
      expect(storedMetrics).toHaveLength(1);
      expect(storedMetrics[0]).toEqual(metrics);
    });

    it('should limit performance metrics history', () => {
      // Create logger with small history limit for testing
      const testLogger = new LoggerService();
      
      // Add more metrics than the limit
      for (let i = 0; i < 150; i++) {
        testLogger.performance({
          operation: `test_${i}`,
          duration: i,
          success: true
        });
      }

      const metrics = testLogger.getPerformanceMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100); // Default max history
    });
  });

  describe('Collection Logging', () => {
    it('should log collection metrics', () => {
      const metrics = {
        totalSources: 6,
        successfulSources: 5,
        failedSources: 1,
        totalItemsCollected: 50,
        duplicatesFiltered: 10,
        itemsSaved: 40,
        duration: 5000,
        memoryUsage: 2048
      };

      loggerService.collection(metrics);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Collection completed',
        expect.objectContaining({
          type: 'collection',
          category: LogCategory.SCHEDULER,
          ...metrics,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('System Status Logging', () => {
    it('should log system status', () => {
      const status = {
        uptime: 60000,
        memoryUsage: process.memoryUsage(),
        activeConnections: 5,
        totalRequests: 100
      };

      loggerService.systemStatus(status);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('System status',
        expect.objectContaining({
          type: 'system_status',
          category: LogCategory.SYSTEM,
          ...status,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log scheduler events', () => {
      loggerService.scheduler('started', { config: 'test' });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Scheduler started', {
        category: LogCategory.SCHEDULER,
        event: 'started',
        config: 'test'
      });
    });

    it('should log RSS collection events', () => {
      loggerService.rssCollection('completed', 'TestSource', { items: 10 });

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'RSS collection completed for TestSource', {
        category: LogCategory.COLLECTOR,
        event: 'completed',
        source: 'TestSource',
        items: 10
      });
    });

    it('should log RSS collection failures as errors', () => {
      loggerService.rssCollection('failed', 'TestSource', { error: 'Network error' });

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'RSS collection failed for TestSource', {
        category: LogCategory.COLLECTOR,
        event: 'failed',
        source: 'TestSource',
        error: 'Network error'
      });
    });

    it('should log classification events', () => {
      loggerService.classification('completed', { itemsClassified: 25 });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Classification completed', {
        category: LogCategory.CLASSIFIER,
        event: 'completed',
        itemsClassified: 25
      });
    });

    it('should log storage events', () => {
      loggerService.storage('saved', { itemsSaved: 15 });

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'Storage saved', {
        category: LogCategory.STORAGE,
        event: 'saved',
        itemsSaved: 15
      });
    });

    it('should log storage errors', () => {
      loggerService.storage('error', { error: 'Database connection failed' });

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'Storage error', {
        category: LogCategory.STORAGE,
        event: 'error',
        error: 'Database connection failed'
      });
    });
  });

  describe('Performance Summary', () => {
    it('should calculate performance summary correctly', () => {
      // Add some test metrics
      loggerService.performance({ operation: 'op1', duration: 100, success: true });
      loggerService.performance({ operation: 'op2', duration: 200, success: false });
      loggerService.performance({ operation: 'op3', duration: 150, itemsProcessed: 10, success: true });

      const summary = loggerService.getPerformanceSummary();

      expect(summary.totalOperations).toBe(3);
      expect(summary.successfulOperations).toBe(2);
      expect(summary.failedOperations).toBe(1);
      expect(summary.averageDuration).toBe(150); // (100 + 200 + 150) / 3
      expect(summary.totalItemsProcessed).toBe(10);
    });

    it('should handle empty performance metrics', () => {
      const summary = loggerService.getPerformanceSummary();

      expect(summary.totalOperations).toBe(0);
      expect(summary.successfulOperations).toBe(0);
      expect(summary.failedOperations).toBe(0);
      expect(summary.averageDuration).toBe(0);
      expect(summary.totalItemsProcessed).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update logger configuration', () => {
      const newConfig = {
        level: LogLevel.ERROR,
        enableConsole: false
      };

      loggerService.updateConfig(newConfig);

      expect(winston.createLogger).toHaveBeenCalledTimes(2); // Initial + update
    });

    it('should return current configuration', () => {
      const config = loggerService.getConfig();

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('enableConsole');
      expect(config).toHaveProperty('enableFile');
    });
  });

  describe('Utility Methods', () => {
    it('should clear performance metrics', () => {
      loggerService.performance({ operation: 'test', duration: 100, success: true });
      expect(loggerService.getPerformanceMetrics()).toHaveLength(1);

      loggerService.clearPerformanceMetrics();
      expect(loggerService.getPerformanceMetrics()).toHaveLength(0);
    });

    it('should create child logger', () => {
      const childMeta = { component: 'test' };
      mockWinstonLogger.child.mockReturnValue(mockWinstonLogger);

      const childLogger = loggerService.child(childMeta);

      expect(mockWinstonLogger.child).toHaveBeenCalledWith(childMeta);
      expect(childLogger).toBe(mockWinstonLogger);
    });

    it('should return winston logger instance', () => {
      const winstonLogger = loggerService.getWinstonLogger();
      expect(winstonLogger).toBe(mockWinstonLogger);
    });

    it('should close logger gracefully', async () => {
      await loggerService.close();
      expect(mockWinstonLogger.close).toHaveBeenCalled();
    });
  });
});

describe('measurePerformance utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should measure successful operation performance', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const result = await measurePerformance('test_operation', mockOperation, LogCategory.SYSTEM);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should measure failed operation performance', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
    
    await expect(measurePerformance('test_operation', mockOperation, LogCategory.SYSTEM))
      .rejects.toThrow('Test error');
    
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should handle non-Error exceptions', async () => {
    const mockOperation = jest.fn().mockRejectedValue('String error');
    
    await expect(measurePerformance('test_operation', mockOperation, LogCategory.SYSTEM))
      .rejects.toBe('String error');
  });
});