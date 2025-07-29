import * as cron from 'node-cron';
import { NewsCollectorService } from './NewsCollectorService';
import { ClassificationService } from './ClassificationService';
import { StorageService } from './StorageService';
import { NewsItem } from '../types';
import { logger, LogCategory, measurePerformance } from '../utils/logger';

/**
 * Scheduler configuration options
 */
export interface SchedulerConfig {
  cronExpression: string;
  autoStart: boolean;
  timezone?: string;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  lastRun: Date | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsCollected: number;
  lastRunDuration: number; // in milliseconds
  averageRunDuration: number; // in milliseconds
  isRunning: boolean;
}

/**
 * Service for scheduling automatic news collection
 */
export class SchedulerService {
  private collector: NewsCollectorService;
  private classifier: ClassificationService;
  private storage: StorageService;
  private task: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private stats: CollectionStats;
  private runDurations: number[] = [];
  private readonly maxDurationHistory = 10; // Keep last 10 run durations for average

  constructor(
    collector: NewsCollectorService,
    classifier: ClassificationService,
    storage: StorageService
  ) {
    this.collector = collector;
    this.classifier = classifier;
    this.storage = storage;
    
    this.stats = {
      lastRun: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalItemsCollected: 0,
      lastRunDuration: 0,
      averageRunDuration: 0,
      isRunning: false
    };
  }

  /**
   * Start scheduled news collection with default 15-minute interval
   * @param config Optional scheduler configuration
   */
  startScheduledCollection(config?: Partial<SchedulerConfig>): void {
    const defaultConfig: SchedulerConfig = {
      cronExpression: '*/1 * * * *', // Every 1 minute
      autoStart: true,
      timezone: 'Asia/Tokyo'
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (this.task) {
      logger.warn('Scheduler is already running. Stopping existing scheduler first.', LogCategory.SCHEDULER);
      this.stopScheduledCollection();
    }

    logger.info(`Starting news collection scheduler with cron expression: ${finalConfig.cronExpression}`, LogCategory.SCHEDULER, {
      cronExpression: finalConfig.cronExpression,
      timezone: finalConfig.timezone,
      autoStart: finalConfig.autoStart
    });

    try {
      this.task = cron.schedule(
        finalConfig.cronExpression,
        async () => {
          await this.executeCollection();
        },
        {
          scheduled: finalConfig.autoStart,
          timezone: finalConfig.timezone
        }
      );

      logger.scheduler('started', {
        cronExpression: finalConfig.cronExpression,
        timezone: finalConfig.timezone,
        autoStart: finalConfig.autoStart
      });
    } catch (error) {
      logger.error(`Failed to start scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`, LogCategory.SCHEDULER, { error });
      throw new Error(`Failed to start scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop scheduled news collection
   */
  stopScheduledCollection(): void {
    if (this.task) {
      this.task.stop();
      // Note: destroy() method may not exist in all versions of node-cron
      if (typeof (this.task as any).destroy === 'function') {
        (this.task as any).destroy();
      }
      this.task = null;
      logger.scheduler('stopped');
    } else {
      logger.warn('Attempted to stop scheduler but it is not running', LogCategory.SCHEDULER);
    }
  }

  /**
   * Check if scheduler is currently active
   * @returns True if scheduler is running
   */
  isSchedulerActive(): boolean {
    return this.task !== null;
  }

  /**
   * Execute a single news collection cycle manually
   * @returns Collection results
   */
  async executeCollectionManually(): Promise<{
    success: boolean;
    itemsCollected: number;
    duration: number;
    error?: string;
  }> {
    logger.info('Manual news collection triggered', LogCategory.SCHEDULER);
    return await this.executeCollection();
  }

  /**
   * Get current scheduler statistics
   * @returns Collection statistics
   */
  getStats(): CollectionStats {
    return {
      ...this.stats,
      isRunning: this.isRunning
    };
  }

  /**
   * Reset scheduler statistics
   */
  resetStats(): void {
    this.stats = {
      lastRun: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalItemsCollected: 0,
      lastRunDuration: 0,
      averageRunDuration: 0,
      isRunning: false
    };
    this.runDurations = [];
    logger.info('Scheduler statistics reset', LogCategory.SCHEDULER);
  }

  /**
   * Get next scheduled run time
   * @returns Next run date or null if not scheduled
   */
  getNextRunTime(): Date | null {
    if (!this.task) {
      return null;
    }

    try {
      // This is a simplified approach - node-cron doesn't provide direct access to next run time
      // We'll calculate based on current time and 15-minute interval
      const now = new Date();
      const nextRun = new Date(now);
      const minutes = now.getMinutes();
      const nextInterval = Math.ceil(minutes / 15) * 15;
      
      if (nextInterval >= 60) {
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(0);
      } else {
        nextRun.setMinutes(nextInterval);
      }
      
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      
      return nextRun;
    } catch (error) {
      logger.error('Error calculating next run time', LogCategory.SCHEDULER, { error });
      return null;
    }
  }

  /**
   * Execute the complete news collection workflow
   * @returns Collection results
   */
  private async executeCollection(): Promise<{
    success: boolean;
    itemsCollected: number;
    duration: number;
    error?: string;
  }> {
    if (this.isRunning) {
      logger.warn('Collection is already running, skipping this execution', LogCategory.SCHEDULER);
      return {
        success: false,
        itemsCollected: 0,
        duration: 0,
        error: 'Collection already in progress'
      };
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    this.isRunning = true;
    this.stats.totalRuns++;

    logger.scheduler('collection_started', {
      cycleNumber: this.stats.totalRuns,
      startTime: new Date().toISOString()
    });

    try {
      // Step 1: Collect news from all RSS sources
      logger.info('Step 1: Collecting news from RSS sources...', LogCategory.SCHEDULER);
      const collectedNews = await measurePerformance(
        'rss_collection',
        () => this.collector.collectFromAllSources(),
        LogCategory.COLLECTOR
      );
      
      if (collectedNews.length === 0) {
        logger.warn('No news items collected from any source', LogCategory.SCHEDULER);
        return this.completeCollection(startTime, startMemory, true, 0);
      }

      logger.info(`Collected ${collectedNews.length} raw news items`, LogCategory.SCHEDULER, {
        itemCount: collectedNews.length
      });

      // Step 2: Classify news items
      logger.info('Step 2: Classifying news items...', LogCategory.SCHEDULER);
      const classifiedNews = await measurePerformance(
        'news_classification',
        () => Promise.resolve(this.classifier.classifyNewsBatch(collectedNews)),
        LogCategory.CLASSIFIER
      );
      
      logger.classification('completed', {
        itemsClassified: classifiedNews.length
      });

      // Step 3: Save to storage (with duplicate filtering)
      logger.info('Step 3: Saving to storage...', LogCategory.SCHEDULER);
      const savedCount = await measurePerformance(
        'storage_save',
        () => Promise.resolve(this.storage.saveNewsItems(classifiedNews)),
        LogCategory.STORAGE
      );
      
      const duplicatesFiltered = collectedNews.length - savedCount;
      logger.storage('saved', {
        itemsSaved: savedCount,
        duplicatesFiltered,
        totalProcessed: collectedNews.length
      });

      // Update statistics
      this.stats.totalItemsCollected += savedCount;

      const result = this.completeCollection(startTime, startMemory, true, savedCount);
      
      // Log collection metrics
      logger.collection({
        totalSources: this.collector.getRSSSources().length,
        successfulSources: this.collector.getRSSSources().length, // Simplified for now
        failedSources: 0,
        totalItemsCollected: collectedNews.length,
        duplicatesFiltered,
        itemsSaved: savedCount,
        duration: result.duration,
        memoryUsage: process.memoryUsage().heapUsed - startMemory
      });

      logger.scheduler('collection_completed', {
        cycleNumber: this.stats.totalRuns,
        duration: result.duration,
        itemsSaved: savedCount,
        totalItemsInStorage: this.storage.getItemCount()
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Collection cycle failed', LogCategory.SCHEDULER, {
        cycleNumber: this.stats.totalRuns,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      logger.scheduler('collection_failed', {
        cycleNumber: this.stats.totalRuns,
        error: errorMessage
      });
      
      return this.completeCollection(startTime, startMemory, false, 0, errorMessage);
    }
  }

  /**
   * Complete collection cycle and update statistics
   * @param startTime Start time of collection
   * @param startMemory Start memory usage
   * @param success Whether collection was successful
   * @param itemsCollected Number of items collected
   * @param error Error message if failed
   * @returns Collection results
   */
  private completeCollection(
    startTime: number,
    startMemory: number,
    success: boolean,
    itemsCollected: number,
    error?: string
  ): {
    success: boolean;
    itemsCollected: number;
    duration: number;
    error?: string;
  } {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Update statistics
    this.stats.lastRun = new Date();
    this.stats.lastRunDuration = duration;
    this.stats.isRunning = false;
    this.isRunning = false;

    if (success) {
      this.stats.successfulRuns++;
    } else {
      this.stats.failedRuns++;
    }

    // Update average duration
    this.runDurations.push(duration);
    if (this.runDurations.length > this.maxDurationHistory) {
      this.runDurations.shift(); // Remove oldest duration
    }
    
    this.stats.averageRunDuration = this.runDurations.reduce((sum, d) => sum + d, 0) / this.runDurations.length;

    return {
      success,
      itemsCollected,
      duration,
      error
    };
  }

  /**
   * Get detailed status information
   * @returns Detailed status object
   */
  getDetailedStatus(): {
    scheduler: {
      isActive: boolean;
      nextRun: Date | null;
      cronExpression: string | null;
    };
    collection: {
      isRunning: boolean;
      lastRun: Date | null;
      totalRuns: number;
      successRate: number;
    };
    storage: {
      totalItems: number;
      memoryUsage: number;
    };
    performance: {
      lastRunDuration: number;
      averageRunDuration: number;
    };
  } {
    const storageStats = this.storage.getStats();
    const successRate = this.stats.totalRuns > 0 
      ? (this.stats.successfulRuns / this.stats.totalRuns) * 100 
      : 0;

    return {
      scheduler: {
        isActive: this.isSchedulerActive(),
        nextRun: this.getNextRunTime(),
        cronExpression: this.task ? '*/15 * * * *' : null // Default expression
      },
      collection: {
        isRunning: this.isRunning,
        lastRun: this.stats.lastRun,
        totalRuns: this.stats.totalRuns,
        successRate: Math.round(successRate * 100) / 100
      },
      storage: {
        totalItems: storageStats.totalItems,
        memoryUsage: storageStats.memoryUsage
      },
      performance: {
        lastRunDuration: this.stats.lastRunDuration,
        averageRunDuration: Math.round(this.stats.averageRunDuration)
      }
    };
  }

  /**
   * Pause the scheduler (stop without destroying)
   */
  pauseScheduler(): void {
    if (this.task) {
      this.task.stop();
      logger.scheduler('paused');
    }
  }

  /**
   * Resume the scheduler
   */
  resumeScheduler(): void {
    if (this.task) {
      this.task.start();
      logger.scheduler('resumed');
    }
  }

  /**
   * Update scheduler configuration
   * @param config New configuration
   */
  updateSchedulerConfig(config: Partial<SchedulerConfig>): void {
    if (this.task) {
      logger.info('Stopping current scheduler to apply new configuration...', LogCategory.SCHEDULER);
      this.stopScheduledCollection();
    }

    logger.info('Starting scheduler with new configuration...', LogCategory.SCHEDULER, { config });
    this.startScheduledCollection(config);
  }

  /**
   * Get collection history summary
   * @returns Collection history
   */
  getCollectionHistory(): {
    totalCollections: number;
    successfulCollections: number;
    failedCollections: number;
    totalItemsCollected: number;
    averageItemsPerCollection: number;
    lastSuccessfulRun: Date | null;
    uptime: number; // in milliseconds since first run
  } {
    const averageItems = this.stats.successfulRuns > 0 
      ? this.stats.totalItemsCollected / this.stats.successfulRuns 
      : 0;

    const uptime = this.stats.lastRun 
      ? Date.now() - this.stats.lastRun.getTime() 
      : 0;

    return {
      totalCollections: this.stats.totalRuns,
      successfulCollections: this.stats.successfulRuns,
      failedCollections: this.stats.failedRuns,
      totalItemsCollected: this.stats.totalItemsCollected,
      averageItemsPerCollection: Math.round(averageItems * 100) / 100,
      lastSuccessfulRun: this.stats.successfulRuns > 0 ? this.stats.lastRun : null,
      uptime
    };
  }
}