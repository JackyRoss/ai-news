import request from 'supertest';
import { APIServer } from '../server';
import { AICategory, NewsItem } from '../../types';

describe('APIServer', () => {
  let server: APIServer;
  let app: any;

  beforeEach(() => {
    server = new APIServer(3001); // Use different port for testing
    app = server.getApp();
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/news', () => {
    it('should return empty news list initially', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return news items when storage has data', async () => {
      // Add test data to storage
      const services = server.getServices();
      const testNewsItem: NewsItem = {
        id: 'test-1',
        title: 'Test AI News',
        description: 'This is a test AI news item',
        link: 'https://example.com/test-news',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      services.storage.saveNewsItem(testNewsItem);

      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]).toMatchObject({
        id: 'test-1',
        title: 'Test AI News',
        category: AICategory.AI_MODELS
      });
    });

    it('should filter news by category', async () => {
      // Add test data with different categories
      const services = server.getServices();
      const testItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'AI Model News',
          description: 'AI model description',
          link: 'https://example.com/ai-model',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'AI Assistant News',
          description: 'AI assistant description',
          link: 'https://example.com/ai-assistant',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        }
      ];

      testItems.forEach(item => services.storage.saveNewsItem(item));

      // Test filtering by AI_MODELS category
      const response = await request(app)
        .get('/api/news?category=AIモデル')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].category).toBe(AICategory.AI_MODELS);
    });

    it('should return error for invalid category', async () => {
      const response = await request(app)
        .get('/api/news?category=InvalidCategory')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid category');
    });

    it('should support pagination with limit and offset', async () => {
      // Add multiple test items
      const services = server.getServices();
      for (let i = 1; i <= 5; i++) {
        const testItem: NewsItem = {
          id: `test-${i}`,
          title: `Test News ${i}`,
          description: `Description ${i}`,
          link: `https://example.com/news-${i}`,
          pubDate: new Date(Date.now() - i * 1000 * 60), // Different times
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        };
        services.storage.saveNewsItem(testItem);
      }

      // Test pagination
      const response = await request(app)
        .get('/api/news?limit=2&offset=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
    });
  });

  describe('GET /api/news/:id', () => {
    it('should return specific news item by ID', async () => {
      const services = server.getServices();
      const testNewsItem: NewsItem = {
        id: 'specific-test-1',
        title: 'Specific Test News',
        description: 'This is a specific test news item',
        link: 'https://example.com/specific-test',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_ASSISTANT,
        createdAt: new Date()
      };

      services.storage.saveNewsItem(testNewsItem);

      const response = await request(app)
        .get('/api/news/specific-test-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'specific-test-1',
        title: 'Specific Test News',
        category: AICategory.AI_ASSISTANT
      });
    });

    it('should return 404 for non-existent news item', async () => {
      const response = await request(app)
        .get('/api/news/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle empty ID parameter', async () => {
      // Note: /api/news/ actually matches the /api/news route, not the /api/news/:id route
      const response = await request(app)
        .get('/api/news/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories with zero counts initially', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(Object.keys(AICategory).length);
      
      // All categories should have count 0 initially
      response.body.data.forEach((category: any) => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('count', 0);
        expect(Object.values(AICategory)).toContain(category.category);
      });
    });

    it('should return categories with correct counts when news items exist', async () => {
      const services = server.getServices();
      
      // Add test items with different categories
      const testItems: NewsItem[] = [
        {
          id: 'cat-test-1',
          title: 'AI Model News 1',
          description: 'Description 1',
          link: 'https://example.com/1',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'cat-test-2',
          title: 'AI Model News 2',
          description: 'Description 2',
          link: 'https://example.com/2',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'cat-test-3',
          title: 'AI Assistant News',
          description: 'Description 3',
          link: 'https://example.com/3',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        }
      ];

      testItems.forEach(item => services.storage.saveNewsItem(item));

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Find specific categories and check counts
      const aiModelsCategory = response.body.data.find((cat: any) => cat.category === AICategory.AI_MODELS);
      const aiAssistantCategory = response.body.data.find((cat: any) => cat.category === AICategory.AI_ASSISTANT);
      
      expect(aiModelsCategory.count).toBe(2);
      expect(aiAssistantCategory.count).toBe(1);
    });
  });

  describe('POST /api/collect', () => {
    it('should trigger manual news collection', async () => {
      // Mock the news collector to avoid actual HTTP requests
      const services = server.getServices();
      const mockCollectFromAllSources = jest.spyOn(services.newsCollector, 'collectFromAllSources');
      const mockClassifyNews = jest.spyOn(services.classifier, 'classifyNews');
      
      // Mock return values
      const mockNewsItems: NewsItem[] = [
        {
          id: 'collect-test-1',
          title: 'Collected News',
          description: 'This news was collected',
          link: 'https://example.com/collected',
          pubDate: new Date(),
          source: 'Mock Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];
      
      mockCollectFromAllSources.mockResolvedValue(mockNewsItems);
      mockClassifyNews.mockReturnValue(AICategory.AI_MODELS);

      const response = await request(app)
        .post('/api/collect')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('collected');
      expect(response.body.data).toHaveProperty('saved');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data.collected).toBe(1);
      expect(response.body.data.saved).toBe(1);

      // Verify mocks were called
      expect(mockCollectFromAllSources).toHaveBeenCalled();
      expect(mockClassifyNews).toHaveBeenCalled();

      // Cleanup mocks
      mockCollectFromAllSources.mockRestore();
      mockClassifyNews.mockRestore();
    });

    it('should handle collection errors gracefully', async () => {
      const services = server.getServices();
      const mockCollectFromAllSources = jest.spyOn(services.newsCollector, 'collectFromAllSources');
      
      // Mock an error
      mockCollectFromAllSources.mockRejectedValue(new Error('Collection failed'));

      const response = await request(app)
        .post('/api/collect')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.data.success).toBe(false);
      expect(response.body.data.error).toBe('Collection failed');

      mockCollectFromAllSources.mockRestore();
    });
  });

  describe('GET /api/status', () => {
    it('should return system status information', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning', true);
      expect(response.body.data).toHaveProperty('totalNews');
      expect(response.body.data).toHaveProperty('categoryCounts');
      expect(response.body.data).toHaveProperty('storage');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('nodeVersion');
      expect(response.body.data).toHaveProperty('platform');
      
      // Verify storage information
      expect(response.body.data.storage).toHaveProperty('totalItems');
      expect(response.body.data.storage).toHaveProperty('memoryUsage');
      
      // Verify sources information
      expect(response.body.data.sources).toBeInstanceOf(Array);
      expect(response.body.data.sources.length).toBeGreaterThan(0);
      
      response.body.data.sources.forEach((source: any) => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('url');
        expect(source).toHaveProperty('defaultCategory');
      });
    });

    it('should include correct category counts in status', async () => {
      const services = server.getServices();
      
      // Add a test item
      const testItem: NewsItem = {
        id: 'status-test-1',
        title: 'Status Test News',
        description: 'For status testing',
        link: 'https://example.com/status-test',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_AGENT,
        createdAt: new Date()
      };

      services.storage.saveNewsItem(testItem);

      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalNews).toBe(1);
      
      const agentCategory = response.body.data.categoryCounts.find(
        (cat: any) => cat.category === AICategory.AI_AGENT
      );
      expect(agentCategory.count).toBe(1);
    });
  });

  describe('CORS and Middleware', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should include security headers from helmet', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/collect')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid JSON format');
    });
  });
});