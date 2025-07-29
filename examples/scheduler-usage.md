# Scheduler Service Usage Examples

This document provides examples of how to use the SchedulerService with integrated logging and monitoring capabilities.

## Basic Usage

### Setting up the Scheduler

```typescript
import { SchedulerService } from '../src/services/SchedulerService';
import { NewsCollectorService } from '../src/services/NewsCollectorService';
import { ClassificationService } from '../src/services/ClassificationService';
import { StorageService } from '../src/services/StorageService';
import { MonitoringService } from '../src/services/MonitoringService';
import { logger, LogCategory } from '../src/utils/logger';

// Initialize services
const collector = new NewsCollectorService();
const classifier = new ClassificationService();
const storage = new StorageService();

// Create scheduler
const scheduler = new SchedulerService(collector, classifier, storage);

// Create monitoring service
const monitoring = new MonitoringService(scheduler, storage);
```

### Starting the Scheduler

```typescript
// Start with default configuration (15-minute intervals)
scheduler.startScheduledCollection();

// Start with custom configuration
scheduler.startScheduledCollection({
  cronExpression: '*/30 * * * *', // Every 30 minutes
  autoStart: true,
  timezone: 'Asia/Tokyo'
});

// Start monitoring
monitoring.startMonitoring(60000); // Check every minute
```

### Manual Collection

```typescript
// Trigger manual collection
const result = await scheduler.executeCollectionManually();

console.log('Collection result:', {
  success: result.success,
  itemsCollected: result.itemsCollected,
  duration: result.duration,
  error: result.error
});
```

## Monitoring and Statistics

### Getting Scheduler Statistics

```typescript
// Get basic statistics
const stats = scheduler.getStats();
console.log('Scheduler Stats:', {
  totalRuns: stats.totalRuns,
  successfulRuns: stats.successfulRuns,
  failedRuns: stats.failedRuns,
  totalItemsCollected: stats.totalItemsCollected,
  lastRun: stats.lastRun,
  averageRunDuration: stats.averageRunDuration
});

// Get detailed status
const detailedStatus = scheduler.getDetailedStatus();
console.log('Detailed Status:', detailedStatus);
```

### Health Monitoring

```typescript
// Get system health status
const healthStatus = monitoring.getHealthStatus();
console.log('System Health:', {
  overall: healthStatus.overall,
  components: healthStatus.components.map(c => ({
    component: c.component,
    status: c.status,
    message: c.message
  }))
});

// Get monitoring report
const report = monitoring.getMonitoringReport();
console.log('Monitoring Report:', report);
```

### Performance Metrics

```typescript
// Get performance metrics
const performanceMetrics = logger.getPerformanceMetrics(10); // Last 10 operations
console.log('Recent Performance:', performanceMetrics);

// Get performance summary
const summary = logger.getPerformanceSummary();
console.log('Performance Summary:', {
  totalOperations: summary.totalOperations,
  successfulOperations: summary.successfulOperations,
  averageDuration: summary.averageDuration,
  errorRate: (summary.failedOperations / summary.totalOperations) * 100
});
```

## Logging Examples

### Custom Logging

```typescript
// Log scheduler events
logger.scheduler('started', { config: 'custom' });
logger.scheduler('collection_completed', { itemsCollected: 25 });

// Log RSS collection events
logger.rssCollection('started', 'AINOW');
logger.rssCollection('completed', 'AINOW', { itemsCollected: 10 });
logger.rssCollection('failed', 'Publickey', { error: 'Network timeout' });

// Log classification events
logger.classification('started', { itemsToClassify: 50 });
logger.classification('completed', { itemsClassified: 50 });

// Log storage events
logger.storage('saved', { itemsSaved: 45, duplicatesFiltered: 5 });
logger.storage('cleanup', { itemsRemoved: 100 });
```

### Performance Measurement

```typescript
import { measurePerformance } from '../src/utils/logger';

// Measure RSS collection performance
const collectedNews = await measurePerformance(
  'rss_collection_all_sources',
  () => collector.collectFromAllSources(),
  LogCategory.COLLECTOR
);

// Measure classification performance
const classifiedNews = await measurePerformance(
  'news_classification_batch',
  () => Promise.resolve(classifier.classifyNewsBatch(collectedNews)),
  LogCategory.CLASSIFIER
);
```

## Configuration Management

### Scheduler Configuration

```typescript
// Update scheduler configuration
scheduler.updateSchedulerConfig({
  cronExpression: '0 */2 * * *', // Every 2 hours
  timezone: 'UTC'
});

// Pause and resume scheduler
scheduler.pauseScheduler();
scheduler.resumeScheduler();

// Stop scheduler
scheduler.stopScheduledCollection();
```

### Logger Configuration

```typescript
// Update logger configuration
logger.updateConfig({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  logDirectory: './custom-logs'
});

// Get current configuration
const config = logger.getConfig();
console.log('Logger Config:', config);
```

### Monitoring Configuration

```typescript
// Update alert configuration
monitoring.updateAlertConfig({
  memoryThreshold: 1000, // 1GB
  errorRateThreshold: 5, // 5%
  responseTimeThreshold: 3000, // 3 seconds
  enableAlerts: true
});

// Get active alerts
const activeAlerts = monitoring.getActiveAlerts();
console.log('Active Alerts:', activeAlerts);
```

## Error Handling

### Handling Collection Errors

```typescript
try {
  const result = await scheduler.executeCollectionManually();
  
  if (!result.success) {
    logger.error('Collection failed', LogCategory.SCHEDULER, {
      error: result.error,
      duration: result.duration
    });
    
    // Handle specific error cases
    if (result.error?.includes('Network')) {
      // Handle network errors
      console.log('Network issue detected, will retry later');
    }
  }
} catch (error) {
  logger.error('Unexpected error during collection', LogCategory.SCHEDULER, { error });
}
```

### Monitoring Alerts

```typescript
// Check for critical alerts
const alerts = monitoring.getActiveAlerts();
const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');

if (criticalAlerts.length > 0) {
  console.log('CRITICAL ALERTS DETECTED:');
  criticalAlerts.forEach(alert => {
    console.log(`- ${alert.type}: ${alert.message}`);
    
    // Take action based on alert type
    switch (alert.type) {
      case 'memory':
        // Handle memory issues
        logger.clearPerformanceMetrics();
        break;
      case 'scheduler':
        // Handle scheduler issues
        scheduler.resetStats();
        break;
    }
  });
}
```

## Complete Example

```typescript
import { SchedulerService } from '../src/services/SchedulerService';
import { NewsCollectorService } from '../src/services/NewsCollectorService';
import { ClassificationService } from '../src/services/ClassificationService';
import { StorageService } from '../src/services/StorageService';
import { MonitoringService } from '../src/services/MonitoringService';
import { logger, LogCategory } from '../src/utils/logger';

async function main() {
  try {
    // Initialize services
    const collector = new NewsCollectorService();
    const classifier = new ClassificationService();
    const storage = new StorageService();
    const scheduler = new SchedulerService(collector, classifier, storage);
    const monitoring = new MonitoringService(scheduler, storage);

    // Configure logging
    logger.updateConfig({
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      logDirectory: './logs'
    });

    // Start scheduler with custom configuration
    scheduler.startScheduledCollection({
      cronExpression: '*/15 * * * *', // Every 15 minutes
      autoStart: true,
      timezone: 'Asia/Tokyo'
    });

    // Start monitoring
    monitoring.startMonitoring(60000); // Check every minute

    logger.info('AI News Aggregator started successfully', LogCategory.SYSTEM, {
      schedulerActive: scheduler.isSchedulerActive(),
      monitoringActive: true
    });

    // Run initial collection
    const initialResult = await scheduler.executeCollectionManually();
    logger.info('Initial collection completed', LogCategory.SCHEDULER, {
      success: initialResult.success,
      itemsCollected: initialResult.itemsCollected,
      duration: initialResult.duration
    });

    // Set up periodic status reporting
    setInterval(() => {
      const report = monitoring.getMonitoringReport();
      logger.info('System status report', LogCategory.SYSTEM, {
        health: report.health.overall,
        uptime: report.uptime,
        totalItems: report.applicationMetrics.storage.totalItems,
        schedulerRuns: report.applicationMetrics.scheduler.totalRuns
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('Shutting down AI News Aggregator...', LogCategory.SYSTEM);
      
      scheduler.stopScheduledCollection();
      monitoring.stopMonitoring();
      
      await logger.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start AI News Aggregator', LogCategory.SYSTEM, { error });
    process.exit(1);
  }
}

// Run the application
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```

## Best Practices

### 1. Error Handling
- Always wrap scheduler operations in try-catch blocks
- Log errors with appropriate context and categories
- Implement retry logic for transient failures

### 2. Performance Monitoring
- Use `measurePerformance` for critical operations
- Monitor memory usage and set appropriate thresholds
- Regularly check performance summaries

### 3. Logging Strategy
- Use appropriate log levels (ERROR for failures, INFO for normal operations)
- Include relevant context in log messages
- Use log categories to organize logs by component

### 4. Health Monitoring
- Set up monitoring with appropriate intervals
- Configure alert thresholds based on your requirements
- Regularly review and act on alerts

### 5. Resource Management
- Monitor memory usage and implement cleanup strategies
- Set reasonable limits for data retention
- Use log rotation to manage disk space