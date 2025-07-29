import Parser from 'rss-parser';
import { NewsItem, RSSSource, AICategory } from '../types';
import { createHash } from 'crypto';

/**
 * RSS sources configuration
 */
const RSS_SOURCES: RSSSource[] = [
  {
    name: 'AINOW',
    url: 'https://ainow.ai/feed/',
    defaultCategory: AICategory.AI_MODELS
  },
  {
    name: 'Publickey',
    url: 'https://www.publickey1.jp/atom.xml',
    defaultCategory: AICategory.AI_DATA_ANALYSIS
  },
  {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    defaultCategory: AICategory.AI_ASSISTANT
  },
  {
    name: 'CodeZine',
    url: 'https://codezine.jp/rss/new/20/index.xml',
    defaultCategory: AICategory.AI_IDE
  },
  {
    name: '日経クロステック',
    url: 'https://xtech.nikkei.com/rss/index.rdf',
    defaultCategory: AICategory.AI_INTEGRATION
  },
  {
    name: 'Qiita',
    url: 'https://qiita.com/tags/ai/feed',
    defaultCategory: AICategory.AI_AGENT
  }
];

/**
 * Service for collecting news from RSS sources
 */
export class NewsCollectorService {
  private parser: Parser;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  constructor() {
    this.parser = new Parser({
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'AI News Aggregator Bot 1.0'
      }
    });
  }

  /**
   * Collect news from all configured RSS sources in parallel
   * @returns Array of NewsItem objects from all sources
   */
  async collectFromAllSources(): Promise<NewsItem[]> {
    console.log(`Starting parallel collection from ${RSS_SOURCES.length} RSS sources...`);
    
    // Use Promise.allSettled to handle parallel processing with error tolerance
    const results = await Promise.allSettled(
      RSS_SOURCES.map(source => this.collectFromSourceWithRetry(source))
    );

    const allNews: NewsItem[] = [];
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const source = RSS_SOURCES[index];
      if (!source) return;
      
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
        successCount++;
        console.log(`✓ Successfully collected ${result.value.length} items from ${source.name}`);
      } else {
        errorCount++;
        console.error(`✗ Failed to collect from ${source.name}:`, result.reason);
      }
    });

    console.log(`Collection completed: ${successCount} sources succeeded, ${errorCount} sources failed`);
    console.log(`Total news items collected: ${allNews.length}`);
    
    return allNews;
  }

  /**
   * Collect news from a single RSS source with retry logic
   * @param source RSS source configuration
   * @returns Array of NewsItem objects
   */
  async collectFromSourceWithRetry(source: RSSSource): Promise<NewsItem[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting to collect from ${source.name} (attempt ${attempt}/${this.maxRetries})`);
        return await this.collectFromSource(source);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Attempt ${attempt} failed for ${source.name}: ${lastError.message}`);
        
        // Wait before retrying (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to collect from ${source.name} after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Collect news from a single RSS source
   * @param source RSS source configuration
   * @returns Array of NewsItem objects
   */
  async collectFromSource(source: RSSSource): Promise<NewsItem[]> {
    try {
      const feed = await this.parseRSSFeed(source.url);
      return feed.map(item => this.convertToNewsItem(item, source));
    } catch (error) {
      throw new Error(`Failed to collect from ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all configured RSS sources
   * @returns Array of RSS source configurations
   */
  getRSSSources(): RSSSource[] {
    return [...RSS_SOURCES];
  }

  /**
   * Parse RSS feed from URL
   * @param url RSS feed URL
   * @returns Parsed RSS items
   */
  private async parseRSSFeed(url: string): Promise<any[]> {
    try {
      const feed = await this.parser.parseURL(url);
      return feed.items || [];
    } catch (error) {
      throw new Error(`Failed to parse RSS feed from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert RSS item to NewsItem
   * @param rssItem Raw RSS item
   * @param source RSS source configuration
   * @returns NewsItem object
   */
  private convertToNewsItem(rssItem: any, source: RSSSource): NewsItem {
    const title = rssItem.title || 'No title';
    const description = rssItem.contentSnippet || rssItem.content || rssItem.summary || 'No description';
    const link = rssItem.link || '';
    const pubDate = rssItem.pubDate ? new Date(rssItem.pubDate) : new Date();
    
    // Generate unique ID from URL and publication date
    const id = this.generateNewsId(link, pubDate);
    
    return {
      id,
      title: title.trim(),
      description: description.trim(),
      link,
      pubDate,
      source: source.name,
      category: source.defaultCategory,
      content: rssItem.content,
      createdAt: new Date()
    };
  }

  /**
   * Generate unique ID for news item
   * @param link News article URL
   * @param pubDate Publication date
   * @returns Unique ID string
   */
  private generateNewsId(link: string, pubDate: Date): string {
    const data = `${link}${pubDate.toISOString()}`;
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}