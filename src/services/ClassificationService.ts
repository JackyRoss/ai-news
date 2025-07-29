import { NewsItem, AICategory } from '../types';

/**
 * Keyword dictionary for AI category classification
 */
interface KeywordDictionary {
  [key: string]: string[];
}

/**
 * Classification result with confidence score
 */
interface ClassificationResult {
  category: AICategory;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Service for classifying news items into AI categories using keyword matching
 */
export class ClassificationService {
  private readonly keywordDictionary: KeywordDictionary;
  private readonly defaultCategory: AICategory = AICategory.AI_MODELS;
  private readonly minConfidenceThreshold: number = 0.1;
  private classificationStats: Map<AICategory, number> = new Map();

  constructor() {
    this.keywordDictionary = this.initializeKeywordDictionary();
  }

  /**
   * Classify a news item into an AI category
   * @param newsItem News item to classify
   * @returns AI category
   */
  classifyNews(newsItem: NewsItem): AICategory {
    try {
      const result = this.analyzeContent(newsItem.title, newsItem.description);
      
      // If confidence is too low, use the source's default category
      if (result.confidence < this.minConfidenceThreshold) {
        console.log(`Low confidence (${result.confidence.toFixed(2)}) for "${newsItem.title}", using default category`);
        return newsItem.category; // Use the default category from RSS source
      }

      console.log(`Classified "${newsItem.title}" as ${result.category} (confidence: ${result.confidence.toFixed(2)})`);
      return result.category;
    } catch (error) {
      console.error(`Classification error for "${newsItem.title}":`, error);
      return this.defaultCategory;
    }
  }

  /**
   * Analyze content and return classification result with confidence
   * @param title News title
   * @param description News description
   * @returns Classification result
   */
  private analyzeContent(title: string, description: string): ClassificationResult {
    const combinedText = `${title} ${description}`.toLowerCase();
    const categoryScores = this.getKeywordMatches(combinedText);
    
    // Find the category with highest score
    let bestCategory = this.defaultCategory;
    let bestScore = 0;
    let matchedKeywords: string[] = [];

    for (const [category, score] of categoryScores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as AICategory;
        matchedKeywords = this.getMatchedKeywordsForCategory(combinedText, category);
      }
    }

    // Calculate confidence based on score and text length
    const textLength = combinedText.length;
    const confidence = Math.min(bestScore / Math.max(textLength / 100, 1), 1.0);

    return {
      category: bestCategory,
      confidence,
      matchedKeywords
    };
  }

  /**
   * Get keyword matches for each category with scoring
   * @param text Text to analyze
   * @returns Map of categories to scores
   */
  private getKeywordMatches(text: string): Map<string, number> {
    const scores = new Map<string, number>();

    // Initialize all categories with 0 score
    Object.keys(this.keywordDictionary).forEach(category => {
      scores.set(category, 0);
    });

    // Calculate scores for each category
    for (const [category, keywords] of Object.entries(this.keywordDictionary)) {
      let categoryScore = 0;

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Count occurrences of keyword in text
        const matches = (text.match(new RegExp(keywordLower, 'g')) || []).length;
        
        if (matches > 0) {
          // Weight score based on keyword specificity and frequency
          const keywordWeight = this.getKeywordWeight(keyword);
          categoryScore += matches * keywordWeight;
        }
      }

      scores.set(category, categoryScore);
    }

    return scores;
  }

  /**
   * Get matched keywords for a specific category
   * @param text Text to analyze
   * @param category Category to check
   * @returns Array of matched keywords
   */
  private getMatchedKeywordsForCategory(text: string, category: string): string[] {
    const keywords = this.keywordDictionary[category] || [];
    const matched: string[] = [];

    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        matched.push(keyword);
      }
    }

    return matched;
  }

  /**
   * Get weight for keyword based on specificity
   * @param keyword Keyword to weight
   * @returns Weight value
   */
  private getKeywordWeight(keyword: string): number {
    // Longer, more specific keywords get higher weight
    if (keyword.length > 10) return 3.0;
    if (keyword.length > 6) return 2.0;
    return 1.0;
  }

  /**
   * Initialize keyword dictionary for all AI categories
   * @returns Keyword dictionary
   */
  private initializeKeywordDictionary(): KeywordDictionary {
    return {
      [AICategory.AI_MODELS]: [
        'GPT', 'ChatGPT', 'LLM', 'Large Language Model', '大規模言語モデル',
        'BERT', 'Transformer', 'OpenAI', 'Claude', 'Gemini', 'Llama',
        'モデル', 'model', '学習', 'training', 'fine-tuning', 'ファインチューニング',
        'neural network', 'ニューラルネットワーク', 'deep learning', 'ディープラーニング',
        'machine learning', '機械学習', 'AI model', 'AIモデル'
      ],
      
      [AICategory.AI_ASSISTANT]: [
        'ChatGPT', 'Siri', 'Alexa', 'Google Assistant', 'Cortana',
        'アシスタント', 'assistant', 'チャットボット', 'chatbot', 'bot',
        '対話', 'conversation', 'chat', 'チャット', '会話',
        'virtual assistant', 'バーチャルアシスタント', 'AI助手', 'AI秘書'
      ],
      
      [AICategory.AI_AGENT]: [
        'agent', 'エージェント', 'autonomous', '自律', 'automation', '自動化',
        'workflow', 'ワークフロー', 'task automation', 'タスク自動化',
        'intelligent agent', 'インテリジェントエージェント', 'AI agent', 'AIエージェント',
        'multi-agent', 'マルチエージェント', 'agent system', 'エージェントシステム'
      ],
      
      [AICategory.AI_IDE]: [
        'IDE', 'editor', 'エディタ', 'code', 'コード', 'programming', 'プログラミング',
        'development', '開発', 'coding', 'コーディング', 'GitHub Copilot', 'Copilot',
        'code completion', 'コード補完', 'code generation', 'コード生成',
        'VS Code', 'Visual Studio', 'IntelliJ', 'development environment', '開発環境'
      ],
      
      [AICategory.AI_CLI]: [
        'CLI', 'command line', 'コマンドライン', 'terminal', 'ターミナル',
        'shell', 'シェル', 'command', 'コマンド', 'bash', 'zsh',
        'CLI tool', 'CLIツール', 'command line tool', 'コマンドラインツール',
        'terminal AI', 'ターミナルAI'
      ],
      
      [AICategory.AI_SEARCH]: [
        'search', '検索', 'knowledge base', 'ナレッジベース', 'knowledge',
        'information retrieval', '情報検索', 'semantic search', 'セマンティック検索',
        'vector search', 'ベクトル検索', 'RAG', 'retrieval', '検索拡張生成',
        'database', 'データベース', 'index', 'インデックス', 'Elasticsearch'
      ],
      
      [AICategory.AI_INTEGRATION]: [
        'integration', '統合', 'SaaS', 'API', 'webhook', 'Zapier', 'Make',
        'workflow automation', 'ワークフロー自動化', 'business process', 'ビジネスプロセス',
        'enterprise', 'エンタープライズ', 'platform', 'プラットフォーム',
        'connector', 'コネクタ', 'middleware', 'ミドルウェア'
      ],
      
      [AICategory.AI_MULTIMODAL]: [
        'multimodal', 'マルチモーダル', 'voice', '音声', 'speech', 'スピーチ',
        'image', '画像', 'video', '動画', 'vision', 'ビジョン', 'audio', 'オーディオ',
        'text-to-speech', 'speech-to-text', '音声認識', '音声合成',
        'computer vision', 'コンピュータビジョン', 'OCR', 'image recognition', '画像認識'
      ],
      
      [AICategory.AI_NOCODE]: [
        'no-code', 'ノーコード', 'low-code', 'ローコード', 'drag and drop', 'ドラッグアンドドロップ',
        'visual programming', 'ビジュアルプログラミング', 'builder', 'ビルダー',
        'template', 'テンプレート', 'workflow builder', 'ワークフロービルダー',
        'automation platform', '自動化プラットフォーム'
      ],
      
      [AICategory.AI_DATA_ANALYSIS]: [
        'data analysis', 'データ分析', 'analytics', 'アナリティクス', 'visualization', '可視化',
        'dashboard', 'ダッシュボード', 'report', 'レポート', 'insight', 'インサイト',
        'business intelligence', 'BI', 'data science', 'データサイエンス',
        'statistics', '統計', 'metrics', 'メトリクス', 'KPI', 'data mining', 'データマイニング'
      ]
    };
  }

  /**
   * Get all available categories
   * @returns Array of AI categories
   */
  getAvailableCategories(): AICategory[] {
    return Object.values(AICategory);
  }

  /**
   * Get keywords for a specific category (for testing/debugging)
   * @param category AI category
   * @returns Array of keywords
   */
  getKeywordsForCategory(category: AICategory): string[] {
    return this.keywordDictionary[category] || [];
  }

  /**
   * Set custom default category for fallback scenarios
   * @param category Default category to use
   */
  setDefaultCategory(category: AICategory): void {
    (this as any).defaultCategory = category;
  }

  /**
   * Get current default category
   * @returns Current default category
   */
  getDefaultCategory(): AICategory {
    return this.defaultCategory;
  }

  /**
   * Set minimum confidence threshold for classification
   * @param threshold Minimum confidence threshold (0.0 to 1.0)
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      (this as any).minConfidenceThreshold = threshold;
    } else {
      throw new Error('Confidence threshold must be between 0.0 and 1.0');
    }
  }

  /**
   * Get current confidence threshold
   * @returns Current confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.minConfidenceThreshold;
  }

  /**
   * Update classification statistics
   * @param category Category that was classified
   */
  private updateStats(category: AICategory): void {
    const currentCount = this.classificationStats.get(category) || 0;
    this.classificationStats.set(category, currentCount + 1);
  }

  /**
   * Get classification statistics
   * @returns Map of categories to classification counts
   */
  getClassificationStats(): Map<AICategory, number> {
    return new Map(this.classificationStats);
  }

  /**
   * Reset classification statistics
   */
  resetStats(): void {
    this.classificationStats.clear();
  }

  /**
   * Classify multiple news items in batch
   * @param newsItems Array of news items to classify
   * @returns Array of classified news items
   */
  classifyNewsBatch(newsItems: NewsItem[]): NewsItem[] {
    return newsItems.map(item => {
      const classifiedCategory = this.classifyNews(item);
      this.updateStats(classifiedCategory);
      return {
        ...item,
        category: classifiedCategory
      };
    });
  }

  /**
   * Get classification accuracy report
   * @returns Object with accuracy metrics
   */
  getAccuracyReport(): {
    totalClassifications: number;
    categoryDistribution: { [key: string]: number };
    mostCommonCategory: AICategory | null;
    leastCommonCategory: AICategory | null;
  } {
    const total = Array.from(this.classificationStats.values()).reduce((sum, count) => sum + count, 0);
    const distribution: { [key: string]: number } = {};
    
    let mostCommon: AICategory | null = null;
    let leastCommon: AICategory | null = null;
    let maxCount = 0;
    let minCount = Infinity;

    for (const [category, count] of this.classificationStats.entries()) {
      distribution[category] = count;
      
      if (count > maxCount) {
        maxCount = count;
        mostCommon = category;
      }
      
      if (count < minCount && count > 0) {
        minCount = count;
        leastCommon = category;
      }
    }

    return {
      totalClassifications: total,
      categoryDistribution: distribution,
      mostCommonCategory: mostCommon,
      leastCommonCategory: leastCommon
    };
  }

  /**
   * Validate classification result with detailed analysis
   * @param newsItem News item to validate
   * @param expectedCategory Expected category for validation
   * @returns Validation result with details
   */
  validateClassification(newsItem: NewsItem, expectedCategory: AICategory): {
    isCorrect: boolean;
    actualCategory: AICategory;
    expectedCategory: AICategory;
    confidence: number;
    matchedKeywords: string[];
    analysis: string;
  } {
    const result = this.analyzeContent(newsItem.title, newsItem.description);
    const actualCategory = result.confidence >= this.minConfidenceThreshold ? result.category : newsItem.category;
    const isCorrect = actualCategory === expectedCategory;

    let analysis = '';
    if (isCorrect) {
      analysis = `Correct classification with ${result.confidence.toFixed(2)} confidence`;
    } else {
      analysis = `Incorrect classification: expected ${expectedCategory}, got ${actualCategory} (confidence: ${result.confidence.toFixed(2)})`;
    }

    return {
      isCorrect,
      actualCategory,
      expectedCategory,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysis
    };
  }
}