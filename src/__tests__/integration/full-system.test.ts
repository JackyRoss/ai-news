import request from 'supertest';
import { APIServer } from '../../api/server';
import { config } from '../../config';

describe('Full System Integration Tests', () => {
  let server: APIServer;
  let app: any;

  beforeAll(async () => {
    // Create server instance for testing
    server = new APIServer(0); // Use port 0 for random available port
    app = server.getApp();
    
    // Wait a moment for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      await server.shutdown();
    }
  });

  describe('API Health and Status', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should return system status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning', true);
      expect(response.body.data).toHaveProperty('totalNews');
      expect(response.body.data).toHaveProperty('categoryCounts');
    });
  });

  describe('News API Endpoints', () => {
    test('should return news list', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    test('should return categories with counts', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should have all AI categories
      expect(response.body.data.length).toBeGreaterThanOrEqual(10);
      
      // Each category should have required properties
      response.body.data.forEach((category: any) => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('count');
        expect(typeof category.count).toBe('number');
      });
    });

    test('should handle category filtering', async () => {
      const response = await request(app)
        .get('/api/news?category=AIモデル')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.category).toBe('AIモデル');
    });

    test('should handle invalid category gracefully', async () => {
      const response = await request(app)
        .get('/api/news?category=InvalidCategory')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid category');
    });
  });

  describe('News Collection', () => {
    test('should trigger manual collection', async () => {
      const response = await request(app)
        .post('/api/collect')
        .expect((res) => {
          // Accept both 200 (success) and 500 (partial failure) as valid
          expect([200, 500]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('collected');
      expect(response.body.data).toHaveProperty('sources');
    }, 30000); // Increase timeout for RSS collection
  });

  describe('Scheduler API', () => {
    test('should return scheduler status', async () => {
      const response = await request(app)
        .get('/api/scheduler/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('totalCollections');
    });

    test('should start and stop scheduler', async () => {
      // Stop scheduler
      const stopResponse = await request(app)
        .post('/api/scheduler/stop')
        .expect(200);

      expect(stopResponse.body.success).toBe(true);

      // Start scheduler
      const startResponse = await request(app)
        .post('/api/scheduler/start')
        .expect(200);

      expect(startResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should handle invalid JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/collect')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/news')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/news?limit=5&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeLessThanOrEqual(5);
    });

    test('should handle date filtering', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const response = await request(app)
        .get(`/api/news?startDate=${yesterday.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle invalid date formats', async () => {
      const response = await request(app)
        .get('/api/news?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid startDate format');
    });
  });
});