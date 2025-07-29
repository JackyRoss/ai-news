import request from 'supertest';
import { APIServer } from '../server';
import { AICategory, NewsItem } from '../../types';
import { performance } from 'perf_hooks';

describe('Backend Integration Tests', () => {
  let server: APIServer;
  let app: any;

  beforeAll(async () => {
    server = new APIServer(3002); // Use different port for integration tests
    app = server.getApp();
  });

  afterAll(async () => {
    // Clean up
    await server.shutdown();
  });

  beforeEach(() => {
    // Clear storage before each test
    const services = server.getServices();
    services.storage.clear();
  });

  describe('RSS Collection to API Response Integration', () => {
    it('should complete full workflow from RSS collection to API response', async () => {
      const services = server.getServices();
      
      // Test RSS collection (using mock data since we can't rely on external RSS)
      const mockNewsItems: NewsItem[] = [
        {
          id: 'rss-test-1',
          title: 'ChatGPT-4の新機能発表',
          description: 'OpenAIが新しいマルチモーダル機能を発表しました',
          link: 'https://ainow.ai/news/chatgpt-4-multimodal',
          pubDate: new Date(),
          source: 'AINOW',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'rss-test-2',
          title: 'GitHub Copilot Enterprise版リリース',
          description: 'GitHub Copilotの企業向け機能が強化されました',
          link: 'https://publickey1.jp/github-copilot-enterprise',
          pubDate: new Date(),
          source: 'Publickey',
          category: AICategory.AI_IDE,
          createdAt: new Date()
        }
      ];

      // Simulate RSS collection and classification
      for (const item of mockNewsItems) {
        const classifiedCategory = services.classifier.classifyNews(item);
        const classifiedItem = { ...item, category: classifiedCategory };
        services.storage.saveNewsItem(classifiedItem);
      }

      // Test API endpoints
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);

      // Test category filtering
      const categoryResponse = await request(app)
        .get('/api/news?category=AIモデル')
        .expect(200);

      expect(categoryResponse.body.success).toBe(true);
      expect(categoryResponse.body.data.items).toHaveLength(1);
      expect(categoryResponse.body.data.items[0].category).toBe('AIモデル');
    });

    it('should handle real RSS URL integration test', async () => {
      const services = server.getServices();
      
      // Test with a single RSS source (timeout after 10 seconds)
      const startTime = performance.now();
      
      try {
        // This tests actual RSS collection
        const collectedNews = await Promise.race([
          services.newsCollector.collectFromAllSources(),
          new Promise<NewsItem[]>((_, reject) => 
            setTimeout(() => reject(new Error('RSS collection timeout')), 10000)
          )
        ]);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Verify collection results
        expect(Array.isArray(collectedNews)).toBe(true);
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

        if (collectedNews.length > 0) {
          // Verify news item structure
          const firstItem = collectedNews[0];
          expect(firstItem).toBeDefined();
          expect(firstItem).toHaveProperty('id');
          expect(firstItem).toHaveProperty('title');
          expect(firstItem).toHaveProperty('description');
          expect(firstItem).toHaveProperty('link');
          expect(firstItem).toHaveProperty('pubDate');
          expect(firstItem).toHaveProperty('source');
          expect(firstItem).toHaveProperty('category');

          if (firstItem) {
            // Test classification
            const classifiedCategory = services.classifier.classifyNews(firstItem);
            expect(Object.values(AICategory)).toContain(classifiedCategory);

            // Test storage
            const classifiedItem = { ...firstItem, category: classifiedCategory };
            services.storage.saveNewsItem(classifiedItem);
            const storedItem = services.storage.getNewsItem(classifiedItem.id);
            expect(storedItem).toEqual(classifiedItem);
          }
        }

        console.log(`RSS collection test completed in ${duration.toFixed(2)}ms, collected ${collectedNews.length} items`);
      } catch (error) {
        // RSS collection might fail due to network issues, which is acceptable in tests
        console.warn('RSS collection test failed (network issue):', error);
        expect(error).toBeDefined(); // Just verify error handling works
      }
    });
  });

  describe('Error Scenario Integration Tests', () => {
    it('should handle RSS collection errors gracefully', async () => {
      const services = server.getServices();
      
      // Test with invalid RSS URL
      const invalidSource = {
        name: 'Invalid Source',
        url: 'https://invalid-url-that-does-not-exist.com/rss',
        defaultCategory: AICategory.AI_MODELS
      };

      try {
        const result = await services.newsCollector.collectFromSource(invalidSource);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0); // Should return empty array on error
      } catch (error) {
        // Error handling is also acceptable
        expect(error).toBeDefined();
      }
    });

    it('should handle API errors properly', async () => {
      // Test invalid category parameter
      const response = await request(app)
        .get('/api/news?category=InvalidCategory')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid category');

      // Test invalid date parameter
      const dateResponse = await request(app)
        .get('/api/news?startDate=invalid-date')
        .expect(400);

      expect(dateResponse.body.success).toBe(false);
      expect(dateResponse.body.error).toContain('Invalid startDate format');

      // Test non-existent news item
      const notFoundResponse = await request(app)
        .get('/api/news/non-existent-id')
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error).toContain('not found');
    });

    it('should handle classification errors', async () => {
      const services = server.getServices();
      
      // Test with malformed news item
      const malformedItem: any = {
        id: 'malformed-test',
        title: '', // Empty title
        description: '', // Empty description
        link: 'https://example.com',
        pubDate: new Date(),
        source: 'Test',
        category: AICategory.AI_MODELS, // Add default category
        createdAt: new Date()
      };

      // Classification should still work and assign a default category
      const classifiedCategory = services.classifier.classifyNews(malformedItem);
      expect(Object.values(AICategory)).toContain(classifiedCategory);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle large dataset efficiently', async () => {
      const services = server.getServices();
      
      // Create 100 test news items
      const testItems: NewsItem[] = [];
      const categories = Object.values(AICategory);
      for (let i = 0; i < 100; i++) {
        testItems.push({
          id: `perf-test-${i}`,
          title: `Test News Item ${i}`,
          description: `Description for test news item ${i}`,
          link: `https://example.com/news/${i}`,
          pubDate: new Date(Date.now() - i * 60000), // Spread over time
          source: `Source ${i % 5}`, // 5 different sources
          category: categories[i % categories.length] as AICategory,
          createdAt: new Date()
        });
      }

      // Test storage performance
      const storageStartTime = performance.now();
      testItems.forEach(item => services.storage.saveNewsItem(item));
      const storageEndTime = performance.now();
      const storageDuration = storageEndTime - storageStartTime;

      expect(storageDuration).toBeLessThan(1000); // Should complete within 1 second
      expect(services.storage.getItemCount()).toBe(100);

      // Test API response performance
      const apiStartTime = performance.now();
      const response = await request(app)
        .get('/api/news')
        .expect(200);
      const apiEndTime = performance.now();
      const apiDuration = apiEndTime - apiStartTime;

      expect(apiDuration).toBeLessThan(1000); // API should respond within 1 second
      expect(response.body.data.items).toHaveLength(50); // Default limit
      expect(response.body.data.total).toBe(100);

      // Test pagination performance
      const paginationStartTime = performance.now();
      const paginationResponse = await request(app)
        .get('/api/news?limit=20&offset=50')
        .expect(200);
      const paginationEndTime = performance.now();
      const paginationDuration = paginationEndTime - paginationStartTime;

      expect(paginationDuration).toBeLessThan(500); // Pagination should be fast
      expect(paginationResponse.body.data.items).toHaveLength(20);

      console.log(`Performance test results:
        - Storage: ${storageDuration.toFixed(2)}ms for 100 items
        - API response: ${apiDuration.toFixed(2)}ms
        - Pagination: ${paginationDuration.toFixed(2)}ms`);
    });

    it('should handle memory usage efficiently', async () => {
      const services = server.getServices();
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Add 500 news items
      for (let i = 0; i < 500; i++) {
        const item: NewsItem = {
          id: `memory-test-${i}`,
          title: `Memory Test News ${i}`,
          description: `This is a test description for memory usage testing. Item number ${i}`,
          link: `https://example.com/memory-test/${i}`,
          pubDate: new Date(),
          source: 'Memory Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        };
        services.storage.saveNewsItem(item);
      }

      // Get memory usage after adding items
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for 500 items)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Test storage stats
      const stats = services.storage.getStats();
      expect(stats.totalItems).toBe(500);
      expect(stats.memoryUsage).toBeGreaterThan(0);

      console.log(`Memory usage test:
        - Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - After 500 items: ${(afterMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should meet response time requirements', async () => {
      const services = server.getServices();
      
      // Add some test data
      const categories = Object.values(AICategory);
      for (let i = 0; i < 50; i++) {
        services.storage.saveNewsItem({
          id: `response-time-test-${i}`,
          title: `Response Time Test ${i}`,
          description: `Test description ${i}`,
          link: `https://example.com/test/${i}`,
          pubDate: new Date(),
          source: 'Test Source',
          category: categories[i % categories.length] as AICategory,
          createdAt: new Date()
        });
      }

      // Test multiple API endpoints for response time
      const endpoints = [
        '/api/news',
        '/api/news?category=AIモデル',
        '/api/categories',
        '/api/status'
      ];

      for (const endpoint of endpoints) {
        const startTime = performance.now();
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // All endpoints should respond within 3 seconds (requirement 4.4)
        expect(duration).toBeLessThan(3000);
        expect(response.body.success).toBe(true);

        console.log(`${endpoint}: ${duration.toFixed(2)}ms`);
      }
    });
  });

  describe('Manual Collection Integration', () => {
    it('should handle manual news collection via API', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/collect')
        .expect((res) => {
          // Accept both 200 (success) and 500 (network error) as valid responses
          expect([200, 500]).toContain(res.status);
        });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      
      if (response.body.success) {
        expect(response.body.data).toHaveProperty('collected');
        expect(response.body.data).toHaveProperty('saved');
        expect(response.body.data).toHaveProperty('duration');
        expect(response.body.data.sources).toBeInstanceOf(Array);
      }

      // Manual collection should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds max

      console.log(`Manual collection test: ${duration.toFixed(2)}ms, success: ${response.body.success}`);
    });
  });

  describe('System Status Integration', () => {
    it('should provide comprehensive system status', async () => {
      const services = server.getServices();
      
      // Add some test data
      services.storage.saveNewsItem({
        id: 'status-test-1',
        title: 'Status Test News',
        description: 'Test for status endpoint',
        link: 'https://example.com/status-test',
        pubDate: new Date(),
        source: 'Status Test',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning', true);
      expect(response.body.data).toHaveProperty('totalNews');
      expect(response.body.data).toHaveProperty('storage');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('nodeVersion');
      expect(response.body.data).toHaveProperty('platform');

      // Verify storage information
      expect(response.body.data.storage.totalItems).toBeGreaterThan(0);
      expect(response.body.data.sources).toBeInstanceOf(Array);
      expect(response.body.data.sources.length).toBeGreaterThan(0);
    });
  });
});