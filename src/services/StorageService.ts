import { NewsItem, AICategory } from '../types';

/**
 * Storage filter options
 */
export interface StorageFilterOptions {
  category?: AICategory | 'all';
  startDate?: Date;
  endDate?: Date;
  source?: string;
  limit?: number;
  offset?: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalItems: number;
  categoryCounts: { [key: string]: number };
  sourceCounts: { [key: string]: number };
  oldestItem: Date | null;
  newestItem: Date | null;
  memoryUsage: number; // Estimated memory usage in bytes
}

/**
 * In-memory storage service for news items
 */
export class StorageService {
  private newsItems: Map<string, NewsItem> = new Map();
  private readonly maxItems: number = 1000;
  private readonly maxAgeInDays: number = 7;

  constructor(maxItems: number = 1000, maxAgeInDays: number = 7) {
    this.maxItems = maxItems;
    this.maxAgeInDays = maxAgeInDays;
  }

  /**
   * Save a single news item
   * @param newsItem News item to save
   * @returns True if saved, false if duplicate
   */
  saveNewsItem(newsItem: NewsItem): boolean {
    try {
      // Check for duplicate
      if (this.isDuplicate(newsItem)) {
        console.log(`Duplicate news item detected: ${newsItem.title}`);
        return false;
      }

      // Save the item
      this.newsItems.set(newsItem.id, { ...newsItem });

      // Clean up old items after adding new ones
      this.cleanupOldItems();

      // Enforce memory limit after cleanup
      this.enforceMemoryLimit();
      
      console.log(`Saved news item: ${newsItem.title} (ID: ${newsItem.id})`);
      return true;
    } catch (error) {
      console.error(`Error saving news item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Save multiple news items in batch
   * @param newsItems Array of news items to save
   * @returns Number of items successfully saved
   */
  saveNewsItems(newsItems: NewsItem[]): number {
    let savedCount = 0;
    
    for (const item of newsItems) {
      if (this.saveNewsItem(item)) {
        savedCount++;
      }
    }

    console.log(`Batch save completed: ${savedCount}/${newsItems.length} items saved`);
    return savedCount;
  }

  /**
   * Get news item by ID
   * @param id News item ID
   * @returns News item or undefined
   */
  getNewsItem(id: string): NewsItem | undefined {
    return this.newsItems.get(id);
  }

  /**
   * Get all news items with optional filtering
   * @param options Filter options
   * @returns Array of filtered news items
   */
  getNewsItems(options: StorageFilterOptions = {}): NewsItem[] {
    let items = Array.from(this.newsItems.values());

    // Apply category filter
    if (options.category && options.category !== 'all') {
      items = items.filter(item => item.category === options.category);
    }

    // Apply date range filter
    if (options.startDate) {
      items = items.filter(item => item.pubDate >= options.startDate!);
    }

    if (options.endDate) {
      items = items.filter(item => item.pubDate <= options.endDate!);
    }

    // Apply source filter
    if (options.source) {
      items = items.filter(item => item.source === options.source);
    }

    // Sort by publication date (newest first)
    items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

    // Apply pagination
    if (options.offset) {
      items = items.slice(options.offset);
    }

    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * Update an existing news item
   * @param id News item ID
   * @param updates Partial news item updates
   * @returns True if updated, false if not found
   */
  updateNewsItem(id: string, updates: Partial<NewsItem>): boolean {
    const existingItem = this.newsItems.get(id);
    
    if (!existingItem) {
      console.warn(`News item not found for update: ${id}`);
      return false;
    }

    const updatedItem = { ...existingItem, ...updates };
    this.newsItems.set(id, updatedItem);
    
    console.log(`Updated news item: ${id}`);
    return true;
  }

  /**
   * Delete a news item by ID
   * @param id News item ID
   * @returns True if deleted, false if not found
   */
  deleteNewsItem(id: string): boolean {
    const deleted = this.newsItems.delete(id);
    
    if (deleted) {
      console.log(`Deleted news item: ${id}`);
    } else {
      console.warn(`News item not found for deletion: ${id}`);
    }
    
    return deleted;
  }

  /**
   * Get storage statistics
   * @returns Storage statistics
   */
  getStats(): StorageStats {
    const items = Array.from(this.newsItems.values());
    const categoryCounts: { [key: string]: number } = {};
    const sourceCounts: { [key: string]: number } = {};
    
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const item of items) {
      // Count categories
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      
      // Count sources
      sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
      
      // Track date range
      if (!oldestDate || item.pubDate < oldestDate) {
        oldestDate = item.pubDate;
      }
      
      if (!newestDate || item.pubDate > newestDate) {
        newestDate = item.pubDate;
      }
    }

    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = this.estimateMemoryUsage();

    return {
      totalItems: items.length,
      categoryCounts,
      sourceCounts,
      oldestItem: oldestDate,
      newestItem: newestDate,
      memoryUsage: estimatedMemoryUsage
    };
  }

  /**
   * Get all available categories with counts
   * @returns Array of categories with counts
   */
  getCategoryCounts(): { category: AICategory; count: number }[] {
    const stats = this.getStats();
    
    return Object.entries(stats.categoryCounts).map(([category, count]) => ({
      category: category as AICategory,
      count
    }));
  }

  /**
   * Clear all stored news items
   */
  clear(): void {
    const itemCount = this.newsItems.size;
    this.newsItems.clear();
    console.log(`Cleared ${itemCount} news items from storage`);
  }

  /**
   * Get total number of stored items
   * @returns Number of items
   */
  getItemCount(): number {
    return this.newsItems.size;
  }

  /**
   * Check if a news item is a duplicate
   * @param newsItem News item to check
   * @returns True if duplicate
   */
  private isDuplicate(newsItem: NewsItem): boolean {
    // Check by ID first
    if (this.newsItems.has(newsItem.id)) {
      return true;
    }

    // Check by URL and similar publication date (within 1 hour)
    const existingItems = Array.from(this.newsItems.values());
    
    for (const existing of existingItems) {
      if (existing.link === newsItem.link) {
        const timeDiff = Math.abs(existing.pubDate.getTime() - newsItem.pubDate.getTime());
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (timeDiff <= oneHour) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Clean up old news items (older than maxAgeInDays)
   */
  private cleanupOldItems(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxAgeInDays);
    
    let removedCount = 0;
    
    for (const [id, item] of this.newsItems.entries()) {
      if (item.pubDate < cutoffDate) {
        this.newsItems.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old news items (older than ${this.maxAgeInDays} days)`);
    }
  }

  /**
   * Enforce memory limit by removing oldest items
   */
  private enforceMemoryLimit(): void {
    while (this.newsItems.size > this.maxItems) {
      // Get items sorted by publication date (oldest first)
      const items = Array.from(this.newsItems.entries())
        .sort(([, a], [, b]) => a.pubDate.getTime() - b.pubDate.getTime());

      // Remove the oldest item
      if (items.length > 0) {
        const oldestItem = items[0];
        if (oldestItem) {
          const [id] = oldestItem;
          this.newsItems.delete(id);
          console.log(`Enforced memory limit: removed oldest item ${id} (limit: ${this.maxItems})`);
        }
      } else {
        break; // Safety break if no items found
      }
    }
  }

  /**
   * Estimate memory usage in bytes (rough calculation)
   * @returns Estimated memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const item of this.newsItems.values()) {
      // Rough estimation: each string character = 2 bytes, plus object overhead
      totalSize += (item.id.length + item.title.length + item.description.length + 
                   item.link.length + item.source.length + item.category.length) * 2;
      totalSize += (item.content?.length || 0) * 2;
      totalSize += 200; // Estimated object overhead and dates
    }

    return totalSize;
  }

  /**
   * Perform data integrity check
   * @returns Object with integrity check results
   */
  checkDataIntegrity(): {
    isValid: boolean;
    issues: string[];
    totalItems: number;
    validItems: number;
  } {
    const issues: string[] = [];
    let validItems = 0;
    const totalItems = this.newsItems.size;

    for (const [id, item] of this.newsItems.entries()) {
      let isItemValid = true;

      // Check required fields
      if (!item.id || !item.title || !item.link || !item.source) {
        issues.push(`Item ${id}: Missing required fields`);
        isItemValid = false;
      }

      // Check ID consistency
      if (item.id !== id) {
        issues.push(`Item ${id}: ID mismatch (stored as ${id}, item.id is ${item.id})`);
        isItemValid = false;
      }

      // Check date validity
      if (!(item.pubDate instanceof Date) || isNaN(item.pubDate.getTime())) {
        issues.push(`Item ${id}: Invalid publication date`);
        isItemValid = false;
      }

      if (!(item.createdAt instanceof Date) || isNaN(item.createdAt.getTime())) {
        issues.push(`Item ${id}: Invalid creation date`);
        isItemValid = false;
      }

      // Check category validity
      if (!Object.values(AICategory).includes(item.category)) {
        issues.push(`Item ${id}: Invalid category ${item.category}`);
        isItemValid = false;
      }

      if (isItemValid) {
        validItems++;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalItems,
      validItems
    };
  }
}