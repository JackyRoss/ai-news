// Core type definitions for AI News Aggregator

/**
 * AI categories for news classification
 */
export enum AICategory {
  AI_MODELS = 'AIモデル',
  AI_ASSISTANT = 'AIアシスタント',
  AI_AGENT = 'AIエージェント',
  AI_IDE = 'AI IDE',
  AI_CLI = 'AI CLIツール',
  AI_SEARCH = 'AI検索・ナレッジベース',
  AI_INTEGRATION = 'AI統合ツール',
  AI_MULTIMODAL = 'AI音声・マルチモーダル',
  AI_NOCODE = 'AIノーコードツール',
  AI_DATA_ANALYSIS = 'AIデータ分析'
}

/**
 * News item structure
 */
export interface NewsItem {
  id: string;           // Unique ID (hash of URL + pubDate)
  title: string;        // News title
  description: string;  // News summary
  link: string;         // Original article URL
  pubDate: Date;        // Publication date
  source: string;       // Source name
  category: AICategory; // Classification category
  content?: string;     // Article content (optional)
  createdAt: Date;      // System registration date
}

/**
 * RSS source configuration
 */
export interface RSSSource {
  name: string;
  url: string;
  defaultCategory: AICategory;
}

/**
 * API response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  category?: AICategory | 'all';
}

export interface CategoryCount {
  category: AICategory;
  count: number;
}

export interface SystemStatus {
  isRunning: boolean;
  lastCollection: Date | null;
  totalNews: number;
  categoryCounts: CategoryCount[];
}