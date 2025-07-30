import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { NewsCollectorService, ClassificationService, StorageService, SchedulerService } from '../services';
import { AICategory, ApiResponse, NewsListResponse, SystemStatus } from '../types';
import { config, getEnvironmentConfig } from '../config';
import { basicAuth } from '../middleware/auth';

/**
 * Express server for AI News Aggregator API
 */
export class APIServer {
  private app: express.Application;
  private newsCollector: NewsCollectorService;
  private classifier: ClassificationService;
  private storage: StorageService;
  private scheduler: SchedulerService;
  private port: number;

  constructor(port?: number) {
    this.port = port || config.port;
    this.app = express();
    this.newsCollector = new NewsCollectorService();
    this.classifier = new ClassificationService();
    this.storage = new StorageService();
    this.scheduler = new SchedulerService(
      this.newsCollector,
      this.classifier,
      this.storage
    );
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware with environment-specific configuration
    const helmetOptions = config.helmetCspEnabled ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    } : {
      contentSecurityPolicy: false
    };
    
    this.app.use(helmet(helmetOptions));
    
    // CORS configuration with environment-specific origins
    this.app.use(cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200
    }));
    
    // Logging middleware with environment-specific format
    const logFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
    this.app.use(morgan(logFormat));
    
    // Body parsing middleware with configurable limits
    this.app.use(express.json({ 
      limit: '10mb',
      type: ['application/json', 'text/plain']
    }));
    this.app.use(express.urlencoded({ 
      extended: true,
      limit: '10mb'
    }));

    // Request timeout middleware
    this.app.use((req, res, next) => {
      req.setTimeout(config.apiTimeout, () => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        next(error);
      });
      next();
    });

    // Add security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });

    // Add authentication middleware if enabled
    if (process.env.AUTH_ENABLED === 'true') {
      this.app.use(basicAuth);
    }

    // Serve static files from frontend build
    const frontendPath = path.join(__dirname, '../../frontend/build');
    this.app.use(express.static(frontendPath));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // API routes
    const apiRouter = express.Router();
    
    // GET /api/news - Get all news or filtered news
    apiRouter.get('/news', this.getNews.bind(this));
    
    // GET /api/news/:id - Get specific news item
    apiRouter.get('/news/:id', this.getNewsById.bind(this));
    
    // GET /api/categories - Get categories with counts
    apiRouter.get('/categories', this.getCategories.bind(this));
    
    // POST /api/collect - Manual news collection
    apiRouter.post('/collect', this.collectNews.bind(this));
    
    // GET /api/status - Get system status
    apiRouter.get('/status', this.getStatus.bind(this));
    
    // Scheduler endpoints
    // POST /api/scheduler/start - Start scheduled collection
    apiRouter.post('/scheduler/start', this.startScheduler.bind(this));
    
    // POST /api/scheduler/stop - Stop scheduled collection
    apiRouter.post('/scheduler/stop', this.stopScheduler.bind(this));
    
    // GET /api/scheduler/status - Get scheduler status
    apiRouter.get('/scheduler/status', this.getSchedulerStatus.bind(this));
    
    this.app.use('/api', apiRouter);

    // Catch-all handler: send back React's index.html file for any non-API routes
    this.app.get('*', (req, res) => {
      const frontendPath = path.join(__dirname, '../../frontend/build');
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      // Determine error type and status code
      let statusCode = 500;
      let errorMessage = 'Internal server error';
      
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorMessage = 'Unauthorized access';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorMessage = 'Forbidden access';
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.name === 'TimeoutError') {
        statusCode = 408;
        errorMessage = 'Request timeout';
      } else if (error.name === 'TooManyRequestsError') {
        statusCode = 429;
        errorMessage = 'Too many requests';
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        // Handle JSON parsing errors
        statusCode = 400;
        errorMessage = 'Invalid JSON format';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const response: ApiResponse<null> = {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
      
      res.status(statusCode).json(response);
    });
  }

  /**
   * GET /api/news - Get news items with optional filtering
   */
  private async getNews(req: express.Request, res: express.Response): Promise<void> {
    try {
      const {
        category,
        source,
        startDate,
        endDate,
        limit = '50',
        offset = '0'
      } = req.query;

      // Parse query parameters
      const filterOptions: any = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      };

      // Add category filter
      if (category && category !== 'all') {
        if (Object.values(AICategory).includes(category as AICategory)) {
          filterOptions.category = category as AICategory;
        } else {
          const response: ApiResponse<null> = {
            success: false,
            error: `Invalid category: ${category}`,
            timestamp: new Date()
          };
          res.status(400).json(response);
          return;
        }
      }

      // Add source filter
      if (source) {
        filterOptions.source = source as string;
      }

      // Add date filters
      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          const response: ApiResponse<null> = {
            success: false,
            error: `Invalid startDate format: ${startDate}`,
            timestamp: new Date()
          };
          res.status(400).json(response);
          return;
        }
        filterOptions.startDate = start;
      }

      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          const response: ApiResponse<null> = {
            success: false,
            error: `Invalid endDate format: ${endDate}`,
            timestamp: new Date()
          };
          res.status(400).json(response);
          return;
        }
        filterOptions.endDate = end;
      }

      // Get filtered news items
      const newsItems = this.storage.getNewsItems(filterOptions);
      const total = this.storage.getItemCount();

      const responseData: NewsListResponse = {
        items: newsItems,
        total,
        category: (category as AICategory) || 'all'
      };

      const response: ApiResponse<NewsListResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getNews:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/news/:id - Get specific news item by ID
   */
  private async getNewsById(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'News ID is required',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const newsItem = this.storage.getNewsItem(id);
      
      if (!newsItem) {
        const response: ApiResponse<null> = {
          success: false,
          error: `News item with ID ${id} not found`,
          timestamp: new Date()
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof newsItem> = {
        success: true,
        data: newsItem,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getNewsById:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/categories - Get all categories with news counts
   */
  private async getCategories(req: express.Request, res: express.Response): Promise<void> {
    try {
      const categoryCounts = this.storage.getCategoryCounts();
      
      // Add all categories even if they have 0 items
      const allCategories = Object.values(AICategory).map(category => {
        const existing = categoryCounts.find(c => c.category === category);
        return {
          category,
          count: existing ? existing.count : 0
        };
      });

      const response: ApiResponse<typeof allCategories> = {
        success: true,
        data: allCategories,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getCategories:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /api/collect - Manually trigger news collection
   */
  private async collectNews(req: express.Request, res: express.Response): Promise<void> {
    try {
      console.log('Manual news collection triggered via API');
      
      // Use the scheduler's manual collection method for consistency
      const result = await this.scheduler.executeCollectionManually();
      
      const responseData = {
        message: result.success ? 'News collection completed successfully' : 'News collection failed',
        success: result.success,
        collected: result.itemsCollected,
        saved: result.itemsCollected,
        duration: result.duration,
        error: result.error,
        sources: this.newsCollector.getRSSSources().map(s => s.name)
      };

      const response: ApiResponse<typeof responseData> = {
        success: result.success,
        data: responseData,
        timestamp: new Date()
      };

      if (result.success) {
        res.json(response);
      } else {
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('Error in collectNews:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to collect news',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/status - Get system status information
   */
  private async getStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const stats = this.storage.getStats();
      const categoryCounts = this.storage.getCategoryCounts();
      
      const systemStatus: SystemStatus = {
        isRunning: true,
        lastCollection: stats.newestItem,
        totalNews: stats.totalItems,
        categoryCounts: categoryCounts
      };

      // Add additional system information
      const detailedStatus = {
        ...systemStatus,
        storage: {
          totalItems: stats.totalItems,
          memoryUsage: stats.memoryUsage,
          oldestItem: stats.oldestItem,
          newestItem: stats.newestItem
        },
        sources: this.newsCollector.getRSSSources().map(source => ({
          name: source.name,
          url: source.url,
          defaultCategory: source.defaultCategory
        })),
        categories: categoryCounts,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      };

      const response: ApiResponse<typeof detailedStatus> = {
        success: true,
        data: detailedStatus,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getStatus:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system status',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /api/scheduler/start - Start scheduled news collection
   */
  private async startScheduler(req: express.Request, res: express.Response): Promise<void> {
    try {
      this.scheduler.startScheduledCollection();
      
      const response: ApiResponse<{ message: string; status: any }> = {
        success: true,
        data: {
          message: 'Scheduler started successfully',
          status: this.scheduler.getStats()
        },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      console.error('Error starting scheduler:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start scheduler',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /api/scheduler/stop - Stop scheduled news collection
   */
  private async stopScheduler(req: express.Request, res: express.Response): Promise<void> {
    try {
      this.scheduler.stopScheduledCollection();
      
      const response: ApiResponse<{ message: string; status: any }> = {
        success: true,
        data: {
          message: 'Scheduler stopped successfully',
          status: this.scheduler.getStats()
        },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop scheduler',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/scheduler/status - Get scheduler status
   */
  private async getSchedulerStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const status = this.scheduler.getStats();
      const detailedStatus = this.scheduler.getDetailedStatus();
      
      const responseData = {
        ...status,
        detailedStatus
      };

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduler status',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Start the server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`AI News Aggregator API server running on port ${this.port}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        console.log(`API endpoint: http://localhost:${this.port}/api/news`);
        console.log(`Scheduler API: http://localhost:${this.port}/api/scheduler/status`);
        
        // Auto-start the scheduler when server starts
        console.log('🔄 Starting automatic news collection scheduler...');
        try {
          this.scheduler.startScheduledCollection();
          console.log('✅ Scheduler started successfully');
        } catch (error) {
          console.warn('⚠️ Failed to start scheduler:', error);
        }
        
        resolve();
      });
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get service instances (for testing and external access)
   */
  public getServices() {
    return {
      newsCollector: this.newsCollector,
      classifier: this.classifier,
      storage: this.storage,
      scheduler: this.scheduler
    };
  }

  /**
   * Graceful shutdown of the server and all services
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down AI News Aggregator server...');
    
    try {
      // Gracefully shutdown the scheduler
      this.scheduler.stopScheduledCollection();
      console.log('✅ Scheduler shutdown complete');
    } catch (error) {
      console.error('❌ Error during scheduler shutdown:', error);
    }
    
    console.log('✅ AI News Aggregator server shutdown complete');
  }

  /**
   * Helper method to create standardized success response
   */
  private createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Helper method to create standardized error response
   */
  private createErrorResponse(error: string): ApiResponse<null> {
    return {
      success: false,
      error,
      timestamp: new Date()
    };
  }

  /**
   * Helper method to validate request parameters
   */
  private validateRequiredParams(params: { [key: string]: any }, required: string[]): string | null {
    for (const param of required) {
      if (!params[param]) {
        return `Missing required parameter: ${param}`;
      }
    }
    return null;
  }
}