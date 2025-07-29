import { SchedulerService } from '../SchedulerService';
import { NewsCollectorService } from '../NewsCollectorService';
import { ClassificationService } from '../ClassificationService';
import { StorageService } from '../StorageService';
import { NewsItem, AICategory } from '../../types';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    getStatus: jest.fn().mockReturnValue('scheduled')
  })
}));

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockCollector: jest.Mocked<NewsCollectorService>;
  let mockClassifier: jest.Mocked<ClassificationService>;
  let mockStorage: jest.Mocked<StorageService>;

  const mockNewsItem: NewsItem = {
    id: 'test-id-1',
    title: 'Test AI News',
    description: 'Test description about AI',
    link: 'https://example.com/news/1',
    pubDate: new Date('2024-01-15T10:00:00Z'),
    source: 'Test Source',
    category: AICategory.AI_MODELS,
    createdAt: new Date()
  };

  beforeEach(() => {
    // Create mocked services
    mockCollector = {
      collectFromAllSources: jest.fn(),
      collectFromSource: jest.fn(),
      getRSSSources: jest.fn()
    } as any;

    mockClassifier = {
      classifyNews: jest.fn(),
      classifyNewsBatch: jest.fn(),
      getAvailableCategories: jest.fn()
    } as any;

    mockStorage = {
      saveNewsItems: jest.fn(),
      getStats: jest.fn(),
      getItemCount: jest.fn()
    } as any;

    // Setup default mock implementations
    mockCollector.collectFromAllSources.mockResolvedValue([mockNewsItem]);
    mockClassifier.classifyNewsBatch.mockReturnValue([mockNewsItem]);
    mockStorage.saveNewsItems.mockReturnValue(1);
    mockStorage.getItemCount.mockReturnValue(10);
    mockStorage.getStats.mockReturnValue({
      totalItems: 10,
      categoryCounts: {},
      sourceCounts: {},
      oldestItem: new Date(),
      newestItem: new Date(),
      memoryUsage: 1024
    });

    schedulerService = new SchedulerService(mockCollector, mockClassifier, mockStorage);
  });

  afterEach(() => {
    // Clean up any running schedulers
    schedulerService.stopScheduledCollection();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct services', () => {
      expect(schedulerService).toBeInstanceOf(SchedulerService);
    });

    it('should initialize with default statistics', () => {
      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(0);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(0);
      expect(stats.totalItemsCollected).toBe(0);
      expect(stats.lastRun).toBeNull();
      expect(stats.isRunning).toBe(false);
    });
  });

  describe('startScheduledCollection', () => {
    it('should start scheduler with default configuration', () => {
      const cron = require('node-cron');
      
      schedulerService.startScheduledCollection();
      
      expect(cron.schedule).toHaveBeenCalledWith(
        '*/15 * * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'Asia/Tokyo'
        }
      );
    });

    it('should start scheduler with custom configuration', () => {
      const cron = require('node-cron');
      const customConfig = {
        cronExpression: '*/30 * * * *',
        autoStart: false,
        timezone: 'UTC'
      };
      
      schedulerService.startScheduledCollection(customConfig);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        '*/30 * * * *',
        expect.any(Function),
        {
          scheduled: false,
          timezone: 'UTC'
        }
      );
    });

    it('should stop existing scheduler before starting new one', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        getStatus: jest.fn().mockReturnValue('scheduled')
      };
      cron.schedule.mockReturnValue(mockTask);

      // Start first scheduler
      schedulerService.startScheduledCollection();
      
      // Start second scheduler
      schedulerService.startScheduledCollection();
      
      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockTask.destroy).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopScheduledCollection', () => {
    it('should stop and destroy active scheduler', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        getStatus: jest.fn().mockReturnValue('scheduled')
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.startScheduledCollection();
      schedulerService.stopScheduledCollection();
      
      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockTask.destroy).toHaveBeenCalled();
    });

    it('should handle stopping when no scheduler is running', () => {
      // Should not throw error
      expect(() => schedulerService.stopScheduledCollection()).not.toThrow();
    });
  });

  describe('isSchedulerActive', () => {
    it('should return true when scheduler is active', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn()
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.startScheduledCollection();
      
      expect(schedulerService.isSchedulerActive()).toBe(true);
    });

    it('should return false when scheduler is not active', () => {
      expect(schedulerService.isSchedulerActive()).toBe(false);
    });
  });

  describe('executeCollectionManually', () => {
    it('should execute collection workflow successfully', async () => {
      const result = await schedulerService.executeCollectionManually();
      
      expect(result.success).toBe(true);
      expect(result.itemsCollected).toBe(1);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      
      expect(mockCollector.collectFromAllSources).toHaveBeenCalled();
      expect(mockClassifier.classifyNewsBatch).toHaveBeenCalledWith([mockNewsItem]);
      expect(mockStorage.saveNewsItems).toHaveBeenCalledWith([mockNewsItem]);
    });

    it('should handle collection failure', async () => {
      const errorMessage = 'Collection failed';
      mockCollector.collectFromAllSources.mockRejectedValue(new Error(errorMessage));
      
      const result = await schedulerService.executeCollectionManually();
      
      expect(result.success).toBe(false);
      expect(result.itemsCollected).toBe(0);
      expect(result.error).toBe(errorMessage);
    });

    it('should handle empty collection results', async () => {
      mockCollector.collectFromAllSources.mockResolvedValue([]);
      
      const result = await schedulerService.executeCollectionManually();
      
      expect(result.success).toBe(true);
      expect(result.itemsCollected).toBe(0);
      expect(mockClassifier.classifyNewsBatch).not.toHaveBeenCalled();
      expect(mockStorage.saveNewsItems).not.toHaveBeenCalled();
    });

    it('should prevent concurrent executions', async () => {
      // Mock a slow collection
      mockCollector.collectFromAllSources.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([mockNewsItem]), 100))
      );

      // Start two collections simultaneously
      const promise1 = schedulerService.executeCollectionManually();
      const promise2 = schedulerService.executeCollectionManually();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // One should succeed, one should be skipped
      const successCount = [result1, result2].filter(r => r.success).length;
      const skipCount = [result1, result2].filter(r => r.error === 'Collection already in progress').length;
      
      expect(successCount).toBe(1);
      expect(skipCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = schedulerService.getStats();
      
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('successfulRuns');
      expect(stats).toHaveProperty('failedRuns');
      expect(stats).toHaveProperty('totalItemsCollected');
      expect(stats).toHaveProperty('lastRun');
      expect(stats).toHaveProperty('lastRunDuration');
      expect(stats).toHaveProperty('averageRunDuration');
      expect(stats).toHaveProperty('isRunning');
    });

    it('should update statistics after successful collection', async () => {
      await schedulerService.executeCollectionManually();
      
      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successfulRuns).toBe(1);
      expect(stats.failedRuns).toBe(0);
      expect(stats.totalItemsCollected).toBe(1);
      expect(stats.lastRun).toBeInstanceOf(Date);
      expect(stats.lastRunDuration).toBeGreaterThan(0);
    });

    it('should update statistics after failed collection', async () => {
      mockCollector.collectFromAllSources.mockRejectedValue(new Error('Test error'));
      
      await schedulerService.executeCollectionManually();
      
      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(1);
      expect(stats.totalItemsCollected).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics to initial values', async () => {
      // Run some collections to generate stats
      await schedulerService.executeCollectionManually();
      await schedulerService.executeCollectionManually();
      
      // Verify stats are not zero
      let stats = schedulerService.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);
      
      // Reset stats
      schedulerService.resetStats();
      
      // Verify stats are reset
      stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(0);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(0);
      expect(stats.totalItemsCollected).toBe(0);
      expect(stats.lastRun).toBeNull();
      expect(stats.lastRunDuration).toBe(0);
      expect(stats.averageRunDuration).toBe(0);
    });
  });

  describe('getDetailedStatus', () => {
    it('should return comprehensive status information', () => {
      const status = schedulerService.getDetailedStatus();
      
      expect(status).toHaveProperty('scheduler');
      expect(status).toHaveProperty('collection');
      expect(status).toHaveProperty('storage');
      expect(status).toHaveProperty('performance');
      
      expect(status.scheduler).toHaveProperty('isActive');
      expect(status.scheduler).toHaveProperty('nextRun');
      expect(status.scheduler).toHaveProperty('cronExpression');
      
      expect(status.collection).toHaveProperty('isRunning');
      expect(status.collection).toHaveProperty('lastRun');
      expect(status.collection).toHaveProperty('totalRuns');
      expect(status.collection).toHaveProperty('successRate');
      
      expect(status.storage).toHaveProperty('totalItems');
      expect(status.storage).toHaveProperty('memoryUsage');
      
      expect(status.performance).toHaveProperty('lastRunDuration');
      expect(status.performance).toHaveProperty('averageRunDuration');
    });

    it('should calculate success rate correctly', async () => {
      // Run successful collection
      await schedulerService.executeCollectionManually();
      
      // Run failed collection
      mockCollector.collectFromAllSources.mockRejectedValue(new Error('Test error'));
      await schedulerService.executeCollectionManually();
      
      const status = schedulerService.getDetailedStatus();
      expect(status.collection.successRate).toBe(50); // 1 success out of 2 total
    });
  });

  describe('getNextRunTime', () => {
    it('should return null when scheduler is not active', () => {
      const nextRun = schedulerService.getNextRunTime();
      expect(nextRun).toBeNull();
    });

    it('should return estimated next run time when scheduler is active', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        getStatus: jest.fn().mockReturnValue('scheduled')
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.startScheduledCollection();
      
      const nextRun = schedulerService.getNextRunTime();
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('pauseScheduler and resumeScheduler', () => {
    it('should pause and resume scheduler', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        getStatus: jest.fn().mockReturnValue('scheduled')
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.startScheduledCollection();
      
      schedulerService.pauseScheduler();
      expect(mockTask.stop).toHaveBeenCalled();
      
      schedulerService.resumeScheduler();
      expect(mockTask.start).toHaveBeenCalled();
    });
  });

  describe('updateSchedulerConfig', () => {
    it('should update scheduler configuration', () => {
      const cron = require('node-cron');
      const mockTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        getStatus: jest.fn().mockReturnValue('scheduled')
      };
      cron.schedule.mockReturnValue(mockTask);

      // Start with default config
      schedulerService.startScheduledCollection();
      
      // Update config
      const newConfig = { cronExpression: '*/5 * * * *' };
      schedulerService.updateSchedulerConfig(newConfig);
      
      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockTask.destroy).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cron.schedule).toHaveBeenLastCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true })
      );
    });
  });

  describe('getCollectionHistory', () => {
    it('should return collection history summary', async () => {
      // Run some collections
      await schedulerService.executeCollectionManually();
      mockStorage.saveNewsItems.mockReturnValue(2);
      await schedulerService.executeCollectionManually();
      
      const history = schedulerService.getCollectionHistory();
      
      expect(history.totalCollections).toBe(2);
      expect(history.successfulCollections).toBe(2);
      expect(history.failedCollections).toBe(0);
      expect(history.totalItemsCollected).toBe(3); // 1 + 2
      expect(history.averageItemsPerCollection).toBe(1.5);
      expect(history.lastSuccessfulRun).toBeInstanceOf(Date);
      expect(history.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});