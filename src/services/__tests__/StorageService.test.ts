import { StorageService, StorageFilterOptions } from '../StorageService';
import { NewsItem, AICategory } from '../../types';

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
  });

  afterEach(() => {
    storageService.clear();
  });

  describe('saveNewsItem', () => {
    it('should save a news item successfully', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = storageService.saveNewsItem(newsItem);
      expect(result).toBe(true);
      expect(storageService.getItemCount()).toBe(1);
    });

    it('should reject duplicate news items by ID', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const firstSave = storageService.saveNewsItem(newsItem);
      const secondSave = storageService.saveNewsItem(newsItem);

      expect(firstSave).toBe(true);
      expect(secondSave).toBe(false);
      expect(storageService.getItemCount()).toBe(1);
    });

    it('should reject duplicate news items by URL and similar date', () => {
      const baseDate = new Date();
      
      const newsItem1: NewsItem = {
        id: 'test-1',
        title: 'Test News 1',
        description: 'Test Description 1',
        link: 'https://example.com/news/same',
        pubDate: baseDate,
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const newsItem2: NewsItem = {
        id: 'test-2',
        title: 'Test News 2',
        description: 'Test Description 2',
        link: 'https://example.com/news/same', // Same URL
        pubDate: new Date(baseDate.getTime() + 30 * 60 * 1000), // 30 minutes later
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const firstSave = storageService.saveNewsItem(newsItem1);
      const secondSave = storageService.saveNewsItem(newsItem2);

      expect(firstSave).toBe(true);
      expect(secondSave).toBe(false);
      expect(storageService.getItemCount()).toBe(1);
    });

    it('should allow news items with same URL but different dates (>1 hour)', () => {
      const baseDate = new Date();
      
      const newsItem1: NewsItem = {
        id: 'test-1',
        title: 'Test News 1',
        description: 'Test Description 1',
        link: 'https://example.com/news/same',
        pubDate: baseDate,
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const newsItem2: NewsItem = {
        id: 'test-2',
        title: 'Test News 2',
        description: 'Test Description 2',
        link: 'https://example.com/news/same', // Same URL
        pubDate: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const firstSave = storageService.saveNewsItem(newsItem1);
      const secondSave = storageService.saveNewsItem(newsItem2);

      expect(firstSave).toBe(true);
      expect(secondSave).toBe(true);
      expect(storageService.getItemCount()).toBe(2);
    });
  });

  describe('saveNewsItems', () => {
    it('should save multiple news items in batch', () => {
      const newsItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'Test News 1',
          description: 'Test Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'Test News 2',
          description: 'Test Description 2',
          link: 'https://example.com/news/2',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        }
      ];

      const savedCount = storageService.saveNewsItems(newsItems);
      expect(savedCount).toBe(2);
      expect(storageService.getItemCount()).toBe(2);
    });

    it('should handle duplicates in batch save', () => {
      const newsItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'Test News 1',
          description: 'Test Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-1', // Duplicate ID
          title: 'Test News 1 Duplicate',
          description: 'Test Description 1 Duplicate',
          link: 'https://example.com/news/1-duplicate',
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      const savedCount = storageService.saveNewsItems(newsItems);
      expect(savedCount).toBe(1);
      expect(storageService.getItemCount()).toBe(1);
    });
  });

  describe('getNewsItem', () => {
    it('should retrieve a news item by ID', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      storageService.saveNewsItem(newsItem);
      const retrieved = storageService.getNewsItem('test-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test News');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = storageService.getNewsItem('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getNewsItems', () => {
    beforeEach(() => {
      // Setup test data with recent dates to avoid cleanup
      const now = new Date();
      const testItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'AI Models News',
          description: 'Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'AI Assistant News',
          description: 'Description 2',
          link: 'https://example.com/news/2',
          pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          source: 'Source B',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        },
        {
          id: 'test-3',
          title: 'AI IDE News',
          description: 'Description 3',
          link: 'https://example.com/news/3',
          pubDate: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          source: 'Source A',
          category: AICategory.AI_IDE,
          createdAt: new Date()
        }
      ];

      storageService.saveNewsItems(testItems);
    });

    it('should return all news items when no filter is applied', () => {
      const items = storageService.getNewsItems();
      expect(items).toHaveLength(3);
    });

    it('should filter by category', () => {
      const items = storageService.getNewsItems({ category: AICategory.AI_MODELS });
      expect(items).toHaveLength(1);
      expect(items[0]?.category).toBe(AICategory.AI_MODELS);
    });

    it('should filter by source', () => {
      const items = storageService.getNewsItems({ source: 'Source A' });
      expect(items).toHaveLength(2);
      expect(items.every(item => item.source === 'Source A')).toBe(true);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 2.5 * 60 * 60 * 1000); // 2.5 hours ago
      const endDate = new Date(now.getTime() - 0.5 * 60 * 60 * 1000); // 0.5 hours ago
      
      const items = storageService.getNewsItems({ startDate, endDate });
      expect(items).toHaveLength(2);
    });

    it('should apply limit and offset', () => {
      const items = storageService.getNewsItems({ limit: 2, offset: 1 });
      expect(items).toHaveLength(2);
    });

    it('should return items sorted by publication date (newest first)', () => {
      const items = storageService.getNewsItems();
      expect(items).toHaveLength(3);
      
      // Check if sorted by pubDate descending
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i]?.pubDate.getTime()).toBeGreaterThanOrEqual(items[i + 1]?.pubDate.getTime() || 0);
      }
    });

    it('should handle "all" category filter', () => {
      const items = storageService.getNewsItems({ category: 'all' });
      expect(items).toHaveLength(3);
    });
  });

  describe('updateNewsItem', () => {
    it('should update an existing news item', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Original Title',
        description: 'Original Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      storageService.saveNewsItem(newsItem);
      
      const updated = storageService.updateNewsItem('test-1', {
        title: 'Updated Title',
        category: AICategory.AI_ASSISTANT
      });

      expect(updated).toBe(true);
      
      const retrieved = storageService.getNewsItem('test-1');
      expect(retrieved?.title).toBe('Updated Title');
      expect(retrieved?.category).toBe(AICategory.AI_ASSISTANT);
      expect(retrieved?.description).toBe('Original Description'); // Should remain unchanged
    });

    it('should return false for non-existent item', () => {
      const updated = storageService.updateNewsItem('non-existent', { title: 'New Title' });
      expect(updated).toBe(false);
    });
  });

  describe('deleteNewsItem', () => {
    it('should delete an existing news item', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      storageService.saveNewsItem(newsItem);
      expect(storageService.getItemCount()).toBe(1);

      const deleted = storageService.deleteNewsItem('test-1');
      expect(deleted).toBe(true);
      expect(storageService.getItemCount()).toBe(0);
    });

    it('should return false for non-existent item', () => {
      const deleted = storageService.deleteNewsItem('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const now = new Date();
      const testItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'News 1',
          description: 'Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'News 2',
          description: 'Description 2',
          link: 'https://example.com/news/2',
          pubDate: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          source: 'Source B',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-3',
          title: 'News 3',
          description: 'Description 3',
          link: 'https://example.com/news/3',
          pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          source: 'Source A',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        }
      ];

      storageService.saveNewsItems(testItems);
      const stats = storageService.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.categoryCounts[AICategory.AI_MODELS]).toBe(2);
      expect(stats.categoryCounts[AICategory.AI_ASSISTANT]).toBe(1);
      expect(stats.sourceCounts['Source A']).toBe(2);
      expect(stats.sourceCounts['Source B']).toBe(1);
      expect(stats.oldestItem).toEqual(new Date(now.getTime() - 3 * 60 * 60 * 1000));
      expect(stats.newestItem).toEqual(new Date(now.getTime() - 1 * 60 * 60 * 1000));
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should return empty stats for empty storage', () => {
      const stats = storageService.getStats();

      expect(stats.totalItems).toBe(0);
      expect(stats.categoryCounts).toEqual({});
      expect(stats.sourceCounts).toEqual({});
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('getCategoryCounts', () => {
    it('should return category counts in correct format', () => {
      const testItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'News 1',
          description: 'Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(),
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'News 2',
          description: 'Description 2',
          link: 'https://example.com/news/2',
          pubDate: new Date(),
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      storageService.saveNewsItems(testItems);
      const categoryCounts = storageService.getCategoryCounts();

      expect(categoryCounts).toHaveLength(1);
      expect(categoryCounts[0]?.category).toBe(AICategory.AI_MODELS);
      expect(categoryCounts[0]?.count).toBe(2);
    });
  });

  describe('memory management', () => {
    it('should enforce memory limit', () => {
      const smallStorageService = new StorageService(2); // Limit to 2 items
      
      const now = new Date();
      const testItems: NewsItem[] = [
        {
          id: 'test-1',
          title: 'News 1',
          description: 'Description 1',
          link: 'https://example.com/news/1',
          pubDate: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-2',
          title: 'News 2',
          description: 'Description 2',
          link: 'https://example.com/news/2',
          pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'test-3',
          title: 'News 3',
          description: 'Description 3',
          link: 'https://example.com/news/3',
          pubDate: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      smallStorageService.saveNewsItems(testItems);
      
      // Should only keep 2 items (newest ones)
      expect(smallStorageService.getItemCount()).toBe(2);
      
      // Should have removed the oldest item
      expect(smallStorageService.getNewsItem('test-1')).toBeUndefined();
      expect(smallStorageService.getNewsItem('test-2')).toBeDefined();
      expect(smallStorageService.getNewsItem('test-3')).toBeDefined();
    });

    it('should clean up old items', () => {
      const shortRetentionService = new StorageService(1000, 1); // 1 day retention
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
      
      const recentDate = new Date();
      
      const testItems: NewsItem[] = [
        {
          id: 'old-item',
          title: 'Old News',
          description: 'Old Description',
          link: 'https://example.com/news/old',
          pubDate: oldDate,
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'recent-item',
          title: 'Recent News',
          description: 'Recent Description',
          link: 'https://example.com/news/recent',
          pubDate: recentDate,
          source: 'Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      shortRetentionService.saveNewsItems(testItems);
      
      // Should only keep the recent item
      expect(shortRetentionService.getItemCount()).toBe(1);
      expect(shortRetentionService.getNewsItem('old-item')).toBeUndefined();
      expect(shortRetentionService.getNewsItem('recent-item')).toBeDefined();
    });
  });

  describe('data integrity', () => {
    it('should pass integrity check for valid data', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      storageService.saveNewsItem(newsItem);
      const integrity = storageService.checkDataIntegrity();

      expect(integrity.isValid).toBe(true);
      expect(integrity.issues).toHaveLength(0);
      expect(integrity.totalItems).toBe(1);
      expect(integrity.validItems).toBe(1);
    });

    it('should detect integrity issues', () => {
      // Manually add invalid item to test integrity check
      const invalidItem = {
        id: 'invalid-1',
        title: '', // Missing title
        description: 'Description',
        link: '', // Missing link
        pubDate: new Date(),
        source: 'Test Source',
        category: 'INVALID_CATEGORY' as AICategory,
        createdAt: new Date()
      };

      // Access private property for testing
      (storageService as any).newsItems.set('invalid-1', invalidItem);

      const integrity = storageService.checkDataIntegrity();

      expect(integrity.isValid).toBe(false);
      expect(integrity.issues.length).toBeGreaterThan(0);
      expect(integrity.totalItems).toBe(1);
      expect(integrity.validItems).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all stored items', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'Test News',
        description: 'Test Description',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      storageService.saveNewsItem(newsItem);
      expect(storageService.getItemCount()).toBe(1);

      storageService.clear();
      expect(storageService.getItemCount()).toBe(0);
    });
  });

  describe('advanced data management features', () => {
    it('should handle concurrent operations safely', async () => {
      const promises: Promise<boolean>[] = [];
      
      // Create multiple concurrent save operations
      for (let i = 0; i < 10; i++) {
        const newsItem: NewsItem = {
          id: `concurrent-${i}`,
          title: `Concurrent News ${i}`,
          description: `Description ${i}`,
          link: `https://example.com/news/${i}`,
          pubDate: new Date(),
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        };
        
        promises.push(Promise.resolve(storageService.saveNewsItem(newsItem)));
      }

      const results = await Promise.all(promises);
      
      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true);
      expect(storageService.getItemCount()).toBe(10);
    });

    it('should maintain data consistency during cleanup operations', () => {
      const shortRetentionService = new StorageService(5, 1); // 5 items max, 1 day retention
      
      const now = new Date();
      const testItems: NewsItem[] = [];
      
      // Create mix of old and new items
      for (let i = 0; i < 8; i++) {
        const isOld = i < 4;
        testItems.push({
          id: `consistency-${i}`,
          title: `News ${i}`,
          description: `Description ${i}`,
          link: `https://example.com/news/${i}`,
          pubDate: isOld ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) : now, // 2 days ago or now
          source: 'Test Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        });
      }

      shortRetentionService.saveNewsItems(testItems);
      
      // Should have cleaned up old items and enforced memory limit
      expect(shortRetentionService.getItemCount()).toBeLessThanOrEqual(5);
      
      // Verify data integrity
      const integrity = shortRetentionService.checkDataIntegrity();
      expect(integrity.isValid).toBe(true);
    });

    it('should handle edge cases in memory estimation', () => {
      const newsItems: NewsItem[] = [
        {
          id: 'empty-content',
          title: '',
          description: '',
          link: 'https://example.com/empty',
          pubDate: new Date(),
          source: '',
          category: AICategory.AI_MODELS,
          content: undefined,
          createdAt: new Date()
        },
        {
          id: 'large-content',
          title: 'A'.repeat(1000),
          description: 'B'.repeat(2000),
          link: 'https://example.com/large',
          pubDate: new Date(),
          source: 'Large Source',
          category: AICategory.AI_MODELS,
          content: 'C'.repeat(5000),
          createdAt: new Date()
        }
      ];

      storageService.saveNewsItems(newsItems);
      const stats = storageService.getStats();
      
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.totalItems).toBe(2);
    });

    it('should provide detailed statistics for monitoring', () => {
      const monitoringItems: NewsItem[] = [
        {
          id: 'monitor-1',
          title: 'Monitor News 1',
          description: 'Description 1',
          link: 'https://example.com/monitor/1',
          pubDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          source: 'Monitor Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'monitor-2',
          title: 'Monitor News 2',
          description: 'Description 2',
          link: 'https://example.com/monitor/2',
          pubDate: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          source: 'Monitor Source B',
          category: AICategory.AI_ASSISTANT,
          createdAt: new Date()
        },
        {
          id: 'monitor-3',
          title: 'Monitor News 3',
          description: 'Description 3',
          link: 'https://example.com/monitor/3',
          pubDate: new Date(), // Now
          source: 'Monitor Source A',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      storageService.saveNewsItems(monitoringItems);
      const stats = storageService.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.categoryCounts[AICategory.AI_MODELS]).toBe(2);
      expect(stats.categoryCounts[AICategory.AI_ASSISTANT]).toBe(1);
      expect(stats.sourceCounts['Monitor Source A']).toBe(2);
      expect(stats.sourceCounts['Monitor Source B']).toBe(1);
      expect(stats.oldestItem).toBeDefined();
      expect(stats.newestItem).toBeDefined();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should handle storage service configuration changes', () => {
      const configurableService = new StorageService(3, 2); // 3 items max, 2 days retention
      
      const testItems: NewsItem[] = [];
      for (let i = 0; i < 5; i++) {
        testItems.push({
          id: `config-${i}`,
          title: `Config News ${i}`,
          description: `Description ${i}`,
          link: `https://example.com/config/${i}`,
          pubDate: new Date(),
          source: 'Config Source',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        });
      }

      configurableService.saveNewsItems(testItems);
      
      // Should enforce the 3-item limit
      expect(configurableService.getItemCount()).toBe(3);
      
      // Verify the newest items are kept
      const items = configurableService.getNewsItems();
      expect(items).toHaveLength(3);
      
      // Should have items with IDs config-2, config-3, config-4 (newest ones)
      const itemIds = items.map(item => item.id).sort();
      expect(itemIds).toEqual(['config-2', 'config-3', 'config-4']);
    });

    it('should handle bulk operations efficiently', () => {
      const bulkItems: NewsItem[] = [];
      const startTime = Date.now();
      
      // Create 100 items for bulk testing
      for (let i = 0; i < 100; i++) {
        bulkItems.push({
          id: `bulk-${i}`,
          title: `Bulk News ${i}`,
          description: `Bulk Description ${i}`,
          link: `https://example.com/bulk/${i}`,
          pubDate: new Date(Date.now() - i * 60 * 1000), // Spread over time
          source: `Bulk Source ${i % 5}`, // 5 different sources
          category: Object.values(AICategory)[i % 10] as AICategory, // Rotate through categories
          createdAt: new Date()
        });
      }

      const savedCount = storageService.saveNewsItems(bulkItems);
      const endTime = Date.now();
      
      expect(savedCount).toBe(100);
      expect(storageService.getItemCount()).toBe(100);
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Verify statistics are correct
      const stats = storageService.getStats();
      expect(stats.totalItems).toBe(100);
      expect(Object.keys(stats.sourceCounts)).toHaveLength(5);
      expect(Object.keys(stats.categoryCounts)).toHaveLength(10);
    });

    it('should maintain performance with large datasets', () => {
      const performanceService = new StorageService(500, 30); // Larger limits for performance testing
      
      // Add items in batches
      for (let batch = 0; batch < 5; batch++) {
        const batchItems: NewsItem[] = [];
        
        for (let i = 0; i < 100; i++) {
          batchItems.push({
            id: `perf-${batch}-${i}`,
            title: `Performance News ${batch}-${i}`,
            description: `Performance Description ${batch}-${i}`,
            link: `https://example.com/perf/${batch}/${i}`,
            pubDate: new Date(Date.now() - (batch * 100 + i) * 60 * 1000),
            source: `Performance Source ${batch}`,
            category: Object.values(AICategory)[i % 10] as AICategory,
            createdAt: new Date()
          });
        }
        
        const startTime = Date.now();
        performanceService.saveNewsItems(batchItems);
        const endTime = Date.now();
        
        // Each batch should complete quickly
        expect(endTime - startTime).toBeLessThan(500);
      }
      
      // Should have enforced memory limit
      expect(performanceService.getItemCount()).toBe(500);
      
      // Test retrieval performance
      const retrievalStart = Date.now();
      const allItems = performanceService.getNewsItems();
      const retrievalEnd = Date.now();
      
      expect(allItems).toHaveLength(500);
      expect(retrievalEnd - retrievalStart).toBeLessThan(100);
      
      // Test filtered retrieval performance
      const filterStart = Date.now();
      const filteredItems = performanceService.getNewsItems({
        category: AICategory.AI_MODELS,
        limit: 50
      });
      const filterEnd = Date.now();
      
      expect(filteredItems.length).toBeLessThanOrEqual(50);
      expect(filterEnd - filterStart).toBeLessThan(100);
    });
  });
});