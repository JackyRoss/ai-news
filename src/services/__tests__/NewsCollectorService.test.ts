import { NewsCollectorService } from '../NewsCollectorService';
import { RSSSource, AICategory } from '../../types';
import Parser from 'rss-parser';

// Mock rss-parser
jest.mock('rss-parser');
const MockedParser = Parser as jest.MockedClass<typeof Parser>;

describe('NewsCollectorService', () => {
  let service: NewsCollectorService;
  let mockRSSSource: RSSSource;
  let mockParserInstance: jest.Mocked<Parser>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock parser instance
    mockParserInstance = {
      parseURL: jest.fn()
    } as any;
    
    // Mock the Parser constructor
    MockedParser.mockImplementation(() => mockParserInstance);
    
    service = new NewsCollectorService();
    mockRSSSource = {
      name: 'Test Source',
      url: 'https://example.com/rss',
      defaultCategory: AICategory.AI_MODELS
    };
  });

  describe('convertToNewsItem', () => {
    it('should convert RSS item to NewsItem correctly', () => {
      const mockRSSItem = {
        title: 'Test AI News',
        contentSnippet: 'This is a test news about AI',
        link: 'https://example.com/news/1',
        pubDate: '2024-01-15T10:00:00Z',
        content: 'Full content here'
      };

      // Access private method for testing
      const convertMethod = (service as any).convertToNewsItem.bind(service);
      const result = convertMethod(mockRSSItem, mockRSSSource);

      expect(result).toMatchObject({
        title: 'Test AI News',
        description: 'This is a test news about AI',
        link: 'https://example.com/news/1',
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        content: 'Full content here'
      });
      expect(result.id).toBeDefined();
      expect(result.pubDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle missing fields gracefully', () => {
      const mockRSSItem = {
        // Missing title, description, link, pubDate
      };

      const convertMethod = (service as any).convertToNewsItem.bind(service);
      const result = convertMethod(mockRSSItem, mockRSSSource);

      expect(result.title).toBe('No title');
      expect(result.description).toBe('No description');
      expect(result.link).toBe('');
      expect(result.pubDate).toBeInstanceOf(Date);
    });
  });

  describe('generateNewsId', () => {
    it('should generate consistent IDs for same input', () => {
      const link = 'https://example.com/news/1';
      const pubDate = new Date('2024-01-15T10:00:00Z');

      const generateIdMethod = (service as any).generateNewsId.bind(service);
      const id1 = generateIdMethod(link, pubDate);
      const id2 = generateIdMethod(link, pubDate);

      expect(id1).toBe(id2);
      expect(id1).toHaveLength(32); // MD5 hash length
    });

    it('should generate different IDs for different inputs', () => {
      const generateIdMethod = (service as any).generateNewsId.bind(service);
      const id1 = generateIdMethod('https://example.com/news/1', new Date('2024-01-15T10:00:00Z'));
      const id2 = generateIdMethod('https://example.com/news/2', new Date('2024-01-15T10:00:00Z'));

      expect(id1).not.toBe(id2);
    });
  });

  describe('collectFromSource', () => {
    it('should successfully collect news from a single source', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'AI News 1',
            contentSnippet: 'Description 1',
            link: 'https://example.com/news/1',
            pubDate: '2024-01-15T10:00:00Z'
          },
          {
            title: 'AI News 2',
            contentSnippet: 'Description 2',
            link: 'https://example.com/news/2',
            pubDate: '2024-01-15T11:00:00Z'
          }
        ]
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeedData);

      const result = await service.collectFromSource(mockRSSSource);

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('AI News 1');
      expect(result[1]?.title).toBe('AI News 2');
      expect(mockParserInstance.parseURL).toHaveBeenCalledWith(mockRSSSource.url);
    });

    it('should handle RSS parsing errors', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Network error'));

      await expect(service.collectFromSource(mockRSSSource)).rejects.toThrow(
        'Failed to collect from Test Source: Failed to parse RSS feed from https://example.com/rss: Network error'
      );
    });

    it('should handle empty RSS feeds', async () => {
      mockParserInstance.parseURL.mockResolvedValue({ items: [] });

      const result = await service.collectFromSource(mockRSSSource);

      expect(result).toHaveLength(0);
    });
  });

  describe('collectFromSourceWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'AI News',
            contentSnippet: 'Description',
            link: 'https://example.com/news/1',
            pubDate: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeedData);

      const result = await service.collectFromSourceWithRetry(mockRSSSource);

      expect(result).toHaveLength(1);
      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'AI News',
            contentSnippet: 'Description',
            link: 'https://example.com/news/1',
            pubDate: '2024-01-15T10:00:00Z'
          }
        ]
      };

      // Fail twice, then succeed
      mockParserInstance.parseURL
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue(mockFeedData);

      const result = await service.collectFromSourceWithRetry(mockRSSSource);

      expect(result).toHaveLength(1);
      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Persistent error'));

      await expect(service.collectFromSourceWithRetry(mockRSSSource)).rejects.toThrow(
        'Failed to collect from Test Source after 3 attempts'
      );

      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(3);
    });
  });

  describe('collectFromAllSources', () => {
    beforeEach(() => {
      // Mock console methods to avoid noise in tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should collect from all sources in parallel', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'AI News',
            contentSnippet: 'Description',
            link: 'https://example.com/news/1',
            pubDate: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeedData);

      const result = await service.collectFromAllSources();

      // Should collect from all 6 configured sources
      expect(result.length).toBeGreaterThan(0);
      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(6);
    });

    it('should handle partial failures gracefully', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'AI News',
            contentSnippet: 'Description',
            link: 'https://example.com/news/1',
            pubDate: '2024-01-15T10:00:00Z'
          }
        ]
      };

      // Some sources succeed, some fail
      mockParserInstance.parseURL
        .mockResolvedValueOnce(mockFeedData) // AINOW succeeds
        .mockRejectedValueOnce(new Error('Network error')) // Publickey fails
        .mockResolvedValueOnce(mockFeedData) // ITmedia succeeds
        .mockRejectedValueOnce(new Error('Timeout')) // CodeZine fails
        .mockResolvedValueOnce(mockFeedData) // 日経クロステック succeeds
        .mockRejectedValueOnce(new Error('Parse error')); // Qiita fails

      const result = await service.collectFromAllSources();

      // Should still return results from successful sources
      expect(result.length).toBe(3); // 3 successful sources, 1 item each
      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(12); // 3 successful (1 call each) + 3 failed (3 retries each)
    });

    it('should return empty array when all sources fail', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('All sources down'));

      const result = await service.collectFromAllSources();

      expect(result).toHaveLength(0);
      expect(mockParserInstance.parseURL).toHaveBeenCalledTimes(18); // 6 sources × 3 retries each
    });
  });

  describe('getRSSSources', () => {
    it('should return all configured RSS sources', () => {
      const sources = service.getRSSSources();

      expect(sources).toHaveLength(6);
      expect(sources.map(s => s.name)).toEqual([
        'AINOW',
        'Publickey',
        'ITmedia NEWS',
        'CodeZine',
        '日経クロステック',
        'Qiita'
      ]);
    });

    it('should return a copy of the sources array', () => {
      const sources1 = service.getRSSSources();
      const sources2 = service.getRSSSources();

      expect(sources1).not.toBe(sources2); // Different array instances
      expect(sources1).toEqual(sources2); // Same content
    });
  });

  describe('RSS Sources Configuration', () => {
    it('should have correct RSS source URLs', () => {
      const sources = service.getRSSSources();

      const expectedSources = [
        { name: 'AINOW', url: 'https://ainow.ai/feed/', category: AICategory.AI_MODELS },
        { name: 'Publickey', url: 'https://www.publickey1.jp/atom.xml', category: AICategory.AI_DATA_ANALYSIS },
        { name: 'ITmedia NEWS', url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml', category: AICategory.AI_ASSISTANT },
        { name: 'CodeZine', url: 'https://codezine.jp/rss/new/20/index.xml', category: AICategory.AI_IDE },
        { name: '日経クロステック', url: 'https://xtech.nikkei.com/rss/index.rdf', category: AICategory.AI_INTEGRATION },
        { name: 'Qiita', url: 'https://qiita.com/tags/ai/feed', category: AICategory.AI_AGENT }
      ];

      expectedSources.forEach((expected, index) => {
        expect(sources[index]?.name).toBe(expected.name);
        expect(sources[index]?.url).toBe(expected.url);
        expect(sources[index]?.defaultCategory).toBe(expected.category);
      });
    });
  });
});