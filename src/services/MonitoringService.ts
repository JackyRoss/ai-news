import { logger, LogCategory, PerformanceMetrics } from '../utils/logger';
import { SchedulerService } from './SchedulerService';
import { StorageService } from './StorageService';

/**
 * System health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  DOWN = 'down'
}

/**
 * System health check result
 */
export interface HealthCheck {
  component: string;
  status: HealthStatus;
  message: string;
  lastCheck: Date;
  responseTime?: number;
  details?: any;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  loadAverage: number[];
  timestamp: Date;
}

/**
 * Application metrics
 */
export interface ApplicationMetrics {
  scheduler: {
    isActive: boolean;
    totalRuns: number;
    successRate: number;
    lastRun: Date | null;
    averageRunDuration: number;
  };
  storage: {
    totalItems: number;
    memoryUsage: number;
    categoryCounts: { [key: string]: number };
  };
  performance: {
    averageResponseTime: number;
    totalOperations: number;
    errorRate: number;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  memoryThreshold: number; // MB
  cpuThreshold: number; // percentage
  errorRateThreshold: number; // percentage
  responseTimeThreshold: number; // milliseconds
  storageThreshold: number; // number of items
  enableAlerts: boolean;
}

/**
 * Alert information
 */
export interface Alert {
  id: string;
  type: 'memory' | 'cpu' | 'error_rate' | 'response_time' | 'storage' | 'scheduler';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  details?: any;
}

/**
 * Monitoring service for system health and performance tracking
 */
export class MonitoringService {
  private scheduler: SchedulerService;
  private storage: StorageService;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Alert[] = [];
  private systemMetricsHistory: SystemMetrics[] = [];
  private alertConfig: AlertConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly maxHistorySize = 100;
  private readonly maxAlertsHistory = 50;
  private startTime: Date;

  constructor(
    scheduler: SchedulerService,
    storage: StorageService,
    alertConfig?: Partial<AlertConfig>
  ) {
    this.scheduler = scheduler;
    this.storage = storage;
    this.startTime = new Date();
    
    this.alertConfig = {
      memoryThreshold: 500, // 500MB
      cpuThreshold: 80, // 80%
      errorRateThreshold: 10, // 10%
      responseTimeThreshold: 5000, // 5 seconds
      storageThreshold: 900, // 900 items (close to 1000 limit)
      enableAlerts: true,
      ...alertConfig
    };

    // Initialize health checks
    this.initializeHealthChecks();
  }

  /**
   * Start monitoring with specified interval
   * @param intervalMs Monitoring interval in milliseconds (default: 60000 = 1 minute)
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      logger.warn('Monitoring is already running', LogCategory.SYSTEM);
      return;
    }

    logger.info(`Starting system monitoring with ${intervalMs}ms interval`, LogCategory.SYSTEM);
    
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
      this.collectSystemMetrics();
      this.checkAlerts();
    }, intervalMs);

    // Perform initial checks
    setTimeout(async () => {
      await this.performHealthChecks();
      this.collectSystemMetrics();
    }, 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('System monitoring stopped', LogCategory.SYSTEM);
    }
  }

  /**
   * Initialize health checks for all components
   */
  private initializeHealthChecks(): void {
    const components = ['scheduler', 'storage', 'memory', 'performance'];
    
    components.forEach(component => {
      this.healthChecks.set(component, {
        component,
        status: HealthStatus.HEALTHY,
        message: 'Initialized',
        lastCheck: new Date()
      });
    });
  }

  /**
   * Perform health checks on all components
   */
  private async performHealthChecks(): Promise<void> {
    const startTime = Date.now();

    try {
      // Check scheduler health
      await this.checkSchedulerHealth();
      
      // Check storage health
      await this.checkStorageHealth();
      
      // Check memory health
      await this.checkMemoryHealth();
      
      // Check performance health
      await this.checkPerformanceHealth();

      const duration = Date.now() - startTime;
      logger.debug(`Health checks completed in ${duration}ms`, LogCategory.SYSTEM);

    } catch (error) {
      logger.error('Error during health checks', LogCategory.SYSTEM, { error });
    }
  }

  /**
   * Check scheduler component health
   */
  private async checkSchedulerHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const stats = this.scheduler.getStats();
      const detailedStatus = this.scheduler.getDetailedStatus();
      
      let status = HealthStatus.HEALTHY;
      let message = 'Scheduler is operating normally';
      
      // Check if scheduler is active
      if (!detailedStatus.scheduler.isActive) {
        status = HealthStatus.WARNING;
        message = 'Scheduler is not active';
      }
      
      // Check success rate
      if (stats.totalRuns > 0 && detailedStatus.collection.successRate < 80) {
        status = HealthStatus.WARNING;
        message = `Low success rate: ${detailedStatus.collection.successRate}%`;
      }
      
      // Check if collection is stuck
      if (stats.lastRun && Date.now() - stats.lastRun.getTime() > 30 * 60 * 1000) { // 30 minutes
        status = HealthStatus.CRITICAL;
        message = 'No successful collection in the last 30 minutes';
      }

      this.updateHealthCheck('scheduler', status, message, Date.now() - startTime, {
        isActive: detailedStatus.scheduler.isActive,
        successRate: detailedStatus.collection.successRate,
        totalRuns: stats.totalRuns,
        lastRun: stats.lastRun
      });

    } catch (error) {
      this.updateHealthCheck('scheduler', HealthStatus.CRITICAL, 'Scheduler health check failed', Date.now() - startTime, { error });
    }
  }

  /**
   * Check storage component health
   */
  private async checkStorageHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const stats = this.storage.getStats();
      const integrity = this.storage.checkDataIntegrity();
      
      let status = HealthStatus.HEALTHY;
      let message = 'Storage is operating normally';
      
      // Check data integrity
      if (!integrity.isValid) {
        status = HealthStatus.CRITICAL;
        message = `Data integrity issues: ${integrity.issues.length} problems found`;
      }
      
      // Check storage capacity
      if (stats.totalItems > this.alertConfig.storageThreshold) {
        status = HealthStatus.WARNING;
        message = `Storage approaching capacity: ${stats.totalItems} items`;
      }
      
      // Check memory usage
      if (stats.memoryUsage > this.alertConfig.memoryThreshold * 1024 * 1024) {
        status = HealthStatus.WARNING;
        message = `High memory usage: ${Math.round(stats.memoryUsage / 1024 / 1024)}MB`;
      }

      this.updateHealthCheck('storage', status, message, Date.now() - startTime, {
        totalItems: stats.totalItems,
        memoryUsage: stats.memoryUsage,
        dataIntegrity: integrity.isValid,
        validItems: integrity.validItems
      });

    } catch (error) {
      this.updateHealthCheck('storage', HealthStatus.CRITICAL, 'Storage health check failed', Date.now() - startTime, { error });
    }
  }

  /**
   * Check system memory health
   */
  private async checkMemoryHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      let status = HealthStatus.HEALTHY;
      let message = `Memory usage: ${Math.round(heapUsedMB)}MB (${Math.round(heapUsagePercent)}%)`;
      
      if (heapUsedMB > this.alertConfig.memoryThreshold) {
        status = HealthStatus.CRITICAL;
        message = `High memory usage: ${Math.round(heapUsedMB)}MB`;
      } else if (heapUsagePercent > 80) {
        status = HealthStatus.WARNING;
        message = `Memory usage at ${Math.round(heapUsagePercent)}%`;
      }

      this.updateHealthCheck('memory', status, message, Date.now() - startTime, {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapUsagePercent,
        external: memoryUsage.external / 1024 / 1024
      });

    } catch (error) {
      this.updateHealthCheck('memory', HealthStatus.CRITICAL, 'Memory health check failed', Date.now() - startTime, { error });
    }
  }

  /**
   * Check performance health
   */
  private async checkPerformanceHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const performanceMetrics = logger.getPerformanceMetrics(20); // Last 20 operations
      const summary = logger.getPerformanceSummary();
      
      let status = HealthStatus.HEALTHY;
      let message = 'Performance is within normal parameters';
      
      // Check error rate
      const errorRate = summary.totalOperations > 0 
        ? (summary.failedOperations / summary.totalOperations) * 100 
        : 0;
      
      if (errorRate > this.alertConfig.errorRateThreshold) {
        status = HealthStatus.CRITICAL;
        message = `High error rate: ${Math.round(errorRate)}%`;
      }
      
      // Check average response time
      if (summary.averageDuration > this.alertConfig.responseTimeThreshold) {
        status = HealthStatus.WARNING;
        message = `Slow response time: ${Math.round(summary.averageDuration)}ms`;
      }

      this.updateHealthCheck('performance', status, message, Date.now() - startTime, {
        averageDuration: summary.averageDuration,
        errorRate,
        totalOperations: summary.totalOperations,
        successfulOperations: summary.successfulOperations
      });

    } catch (error) {
      this.updateHealthCheck('performance', HealthStatus.WARNING, 'Performance health check failed', Date.now() - startTime, { error });
    }
  }

  /**
   * Update health check result
   */
  private updateHealthCheck(
    component: string,
    status: HealthStatus,
    message: string,
    responseTime: number,
    details?: any
  ): void {
    this.healthChecks.set(component, {
      component,
      status,
      message,
      lastCheck: new Date(),
      responseTime,
      details
    });
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const metrics: SystemMetrics = {
        uptime: Date.now() - this.startTime.getTime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg(),
        timestamp: new Date()
      };

      this.systemMetricsHistory.push(metrics);
      
      // Keep only recent metrics
      if (this.systemMetricsHistory.length > this.maxHistorySize) {
        this.systemMetricsHistory.shift();
      }

      // Log system status periodically
      logger.systemStatus({
        uptime: metrics.uptime,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage
      });

    } catch (error) {
      logger.error('Error collecting system metrics', LogCategory.SYSTEM, { error });
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    if (!this.alertConfig.enableAlerts) {
      return;
    }

    try {
      // Check each health check for alert conditions
      for (const [component, healthCheck] of this.healthChecks.entries()) {
        if (healthCheck.status === HealthStatus.CRITICAL || healthCheck.status === HealthStatus.WARNING) {
          this.createAlert(component, healthCheck);
        }
      }

      // Auto-resolve alerts that are no longer relevant
      this.resolveOutdatedAlerts();

    } catch (error) {
      logger.error('Error checking alerts', LogCategory.SYSTEM, { error });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(component: string, healthCheck: HealthCheck): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert => 
      alert.type === component && 
      !alert.resolved && 
      alert.message === healthCheck.message
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: `${component}-${Date.now()}`,
      type: component as any,
      severity: healthCheck.status === HealthStatus.CRITICAL ? 'critical' : 'medium',
      message: healthCheck.message,
      timestamp: new Date(),
      resolved: false,
      details: healthCheck.details
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift();
    }

    logger.error(`Alert created: ${alert.message}`, LogCategory.SYSTEM, {
      alertId: alert.id,
      component,
      severity: alert.severity
    });
  }

  /**
   * Resolve outdated alerts
   */
  private resolveOutdatedAlerts(): void {
    const now = new Date();
    
    for (const alert of this.alerts) {
      if (alert.resolved) continue;

      const healthCheck = this.healthChecks.get(alert.type);
      if (healthCheck && healthCheck.status === HealthStatus.HEALTHY) {
        alert.resolved = true;
        alert.resolvedAt = now;
        
        logger.info(`Alert resolved: ${alert.message}`, LogCategory.SYSTEM, {
          alertId: alert.id,
          resolvedAt: now
        });
      }
    }
  }

  /**
   * Get current system health status
   */
  getHealthStatus(): {
    overall: HealthStatus;
    components: HealthCheck[];
    lastUpdate: Date;
  } {
    const components = Array.from(this.healthChecks.values());
    
    // Determine overall status
    let overall = HealthStatus.HEALTHY;
    for (const component of components) {
      if (component.status === HealthStatus.CRITICAL) {
        overall = HealthStatus.CRITICAL;
        break;
      } else if (component.status === HealthStatus.WARNING && overall === HealthStatus.HEALTHY) {
        overall = HealthStatus.WARNING;
      }
    }

    return {
      overall,
      components,
      lastUpdate: new Date()
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics | null {
    return this.systemMetricsHistory.length > 0 
      ? this.systemMetricsHistory[this.systemMetricsHistory.length - 1] 
      : null;
  }

  /**
   * Get system metrics history
   */
  getSystemMetricsHistory(limit?: number): SystemMetrics[] {
    const history = [...this.systemMetricsHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get application metrics
   */
  getApplicationMetrics(): ApplicationMetrics {
    const schedulerStats = this.scheduler.getStats();
    const schedulerStatus = this.scheduler.getDetailedStatus();
    const storageStats = this.storage.getStats();
    const performanceSummary = logger.getPerformanceSummary();

    return {
      scheduler: {
        isActive: schedulerStatus.scheduler.isActive,
        totalRuns: schedulerStats.totalRuns,
        successRate: schedulerStatus.collection.successRate,
        lastRun: schedulerStats.lastRun,
        averageRunDuration: schedulerStats.averageRunDuration
      },
      storage: {
        totalItems: storageStats.totalItems,
        memoryUsage: storageStats.memoryUsage,
        categoryCounts: storageStats.categoryCounts
      },
      performance: {
        averageResponseTime: performanceSummary.averageDuration,
        totalOperations: performanceSummary.totalOperations,
        errorRate: performanceSummary.totalOperations > 0 
          ? (performanceSummary.failedOperations / performanceSummary.totalOperations) * 100 
          : 0
      }
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): Alert[] {
    const alerts = [...this.alerts].reverse(); // Most recent first
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    logger.info('Alert configuration updated', LogCategory.SYSTEM, { config: this.alertConfig });
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Get comprehensive monitoring report
   */
  getMonitoringReport(): {
    health: ReturnType<MonitoringService['getHealthStatus']>;
    systemMetrics: SystemMetrics | null;
    applicationMetrics: ApplicationMetrics;
    activeAlerts: Alert[];
    uptime: number;
    reportTime: Date;
  } {
    return {
      health: this.getHealthStatus(),
      systemMetrics: this.getSystemMetrics(),
      applicationMetrics: this.getApplicationMetrics(),
      activeAlerts: this.getActiveAlerts(),
      uptime: Date.now() - this.startTime.getTime(),
      reportTime: new Date()
    };
  }

  /**
   * Manually trigger health checks
   */
  async triggerHealthCheck(): Promise<void> {
    logger.info('Manual health check triggered', LogCategory.SYSTEM);
    await this.performHealthChecks();
    this.collectSystemMetrics();
    this.checkAlerts();
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    const activeCount = this.getActiveAlerts().length;
    this.alerts = [];
    logger.info(`Cleared ${activeCount} active alerts`, LogCategory.SYSTEM);
  }

  /**
   * Gracefully shutdown monitoring
   */
  shutdown(): void {
    this.stopMonitoring();
    logger.info('Monitoring service shutdown', LogCategory.SYSTEM);
  }
}