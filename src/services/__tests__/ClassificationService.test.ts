import { ClassificationService } from '../ClassificationService';
import { NewsItem, AICategory } from '../../types';

describe('ClassificationService', () => {
  let classificationService: ClassificationService;

  beforeEach(() => {
    classificationService = new ClassificationService();
  });

  describe('classifyNews', () => {
    it('should classify AI model news correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-1',
        title: 'ChatGPT-4の新機能が発表されました',
        description: 'OpenAIが新しい大規模言語モデルChatGPT-4の機能を発表',
        link: 'https://example.com/news/1',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS);
    });

    it('should classify AI assistant news correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-2',
        title: 'Siriの新しいアシスタント機能',
        description: 'Appleが新しいバーチャルアシスタント機能を発表',
        link: 'https://example.com/news/2',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_ASSISTANT,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_ASSISTANT);
    });

    it('should classify AI IDE news correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-3',
        title: 'GitHub Copilotの新機能',
        description: 'VS Codeでのコード補完機能が向上',
        link: 'https://example.com/news/3',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_IDE,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_IDE);
    });

    it('should handle classification errors gracefully', () => {
      const newsItem: NewsItem = {
        id: 'test-4',
        title: '',
        description: '',
        link: 'https://example.com/news/4',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(Object.values(AICategory)).toContain(result);
    });

    it('should use default category for low confidence classification', () => {
      const newsItem: NewsItem = {
        id: 'test-5',
        title: 'Some random news',
        description: 'This is not related to AI at all',
        link: 'https://example.com/news/5',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_DATA_ANALYSIS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      // Should use the source's default category when confidence is low
      expect(result).toBe(AICategory.AI_DATA_ANALYSIS);
    });
  });

  describe('getAvailableCategories', () => {
    it('should return all AI categories', () => {
      const categories = classificationService.getAvailableCategories();
      expect(categories).toHaveLength(10);
      expect(categories).toContain(AICategory.AI_MODELS);
      expect(categories).toContain(AICategory.AI_ASSISTANT);
      expect(categories).toContain(AICategory.AI_AGENT);
      expect(categories).toContain(AICategory.AI_IDE);
      expect(categories).toContain(AICategory.AI_CLI);
      expect(categories).toContain(AICategory.AI_SEARCH);
      expect(categories).toContain(AICategory.AI_INTEGRATION);
      expect(categories).toContain(AICategory.AI_MULTIMODAL);
      expect(categories).toContain(AICategory.AI_NOCODE);
      expect(categories).toContain(AICategory.AI_DATA_ANALYSIS);
    });
  });

  describe('getKeywordsForCategory', () => {
    it('should return keywords for AI_MODELS category', () => {
      const keywords = classificationService.getKeywordsForCategory(AICategory.AI_MODELS);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('GPT');
      expect(keywords).toContain('ChatGPT');
      expect(keywords).toContain('LLM');
    });

    it('should return keywords for AI_ASSISTANT category', () => {
      const keywords = classificationService.getKeywordsForCategory(AICategory.AI_ASSISTANT);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('assistant');
      expect(keywords).toContain('アシスタント');
    });

    it('should return empty array for invalid category', () => {
      const keywords = classificationService.getKeywordsForCategory('INVALID_CATEGORY' as AICategory);
      expect(keywords).toEqual([]);
    });
  });

  describe('keyword matching functionality', () => {
    it('should match Japanese keywords correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-jp',
        title: '機械学習の新しいアプローチ',
        description: 'ディープラーニングを使用した新しい手法',
        link: 'https://example.com/news/jp',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS);
    });

    it('should match English keywords correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-en',
        title: 'New machine learning breakthrough',
        description: 'Deep learning model shows impressive results',
        link: 'https://example.com/news/en',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS);
    });

    it('should handle mixed language content', () => {
      const newsItem: NewsItem = {
        id: 'test-mixed',
        title: 'ChatGPTを使った新しいアシスタント',
        description: 'AI assistant with Japanese language support',
        link: 'https://example.com/news/mixed',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_ASSISTANT,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      // Should match either AI_MODELS (ChatGPT) or AI_ASSISTANT (assistant)
      expect([AICategory.AI_MODELS, AICategory.AI_ASSISTANT]).toContain(result);
    });
  });

  describe('classification accuracy with test data', () => {
    const testCases = [
      // AI Models test cases
      {
        title: 'OpenAI GPT-4 Turbo発表',
        description: '新しい大規模言語モデルが発表されました',
        expected: AICategory.AI_MODELS,
        category: 'AI Models'
      },
      {
        title: 'Google Gemini Pro の性能評価',
        description: 'Transformerアーキテクチャを使用した最新モデル',
        expected: AICategory.AI_MODELS,
        category: 'AI Models'
      },
      
      // AI Assistant test cases
      {
        title: 'Siri の新機能追加',
        description: 'バーチャルアシスタントの対話機能が向上',
        expected: AICategory.AI_ASSISTANT,
        category: 'AI Assistant'
      },
      {
        title: 'ChatGPT チャットボット機能強化',
        description: 'より自然な会話が可能になりました',
        expected: AICategory.AI_ASSISTANT,
        category: 'AI Assistant'
      },
      
      // AI Agent test cases
      {
        title: 'マルチエージェントシステムの開発',
        description: '自律的なAIエージェントによるワークフロー自動化',
        expected: AICategory.AI_AGENT,
        category: 'AI Agent'
      },
      {
        title: 'Intelligent Agent Platform',
        description: 'Task automation with autonomous agents',
        expected: AICategory.AI_AGENT,
        category: 'AI Agent'
      },
      
      // AI IDE test cases
      {
        title: 'GitHub Copilot X リリース',
        description: 'VS Code でのコード生成機能が大幅に向上',
        expected: AICategory.AI_IDE,
        category: 'AI IDE'
      },
      {
        title: 'IntelliJ IDEA AI コード補完',
        description: 'プログラミング開発環境にAI機能を統合',
        expected: AICategory.AI_IDE,
        category: 'AI IDE'
      },
      
      // AI CLI test cases
      {
        title: 'AI-powered terminal assistant',
        description: 'コマンドライン操作を支援するCLIツール',
        expected: AICategory.AI_CLI,
        category: 'AI CLI'
      },
      {
        title: 'ターミナルAI の新機能',
        description: 'シェルコマンドの自動生成機能',
        expected: AICategory.AI_CLI,
        category: 'AI CLI'
      },
      
      // AI Search test cases
      {
        title: 'セマンティック検索エンジン',
        description: 'ベクトル検索によるナレッジベース構築',
        expected: AICategory.AI_SEARCH,
        category: 'AI Search'
      },
      {
        title: 'RAG システムの実装',
        description: '検索拡張生成による情報検索の向上',
        expected: AICategory.AI_SEARCH,
        category: 'AI Search'
      },
      
      // AI Integration test cases
      {
        title: 'Zapier AI 統合機能',
        description: 'SaaS プラットフォーム間のワークフロー自動化',
        expected: AICategory.AI_INTEGRATION,
        category: 'AI Integration'
      },
      {
        title: 'Enterprise AI Platform',
        description: 'ビジネスプロセス統合のためのミドルウェア',
        expected: AICategory.AI_INTEGRATION,
        category: 'AI Integration'
      },
      
      // AI Multimodal test cases
      {
        title: 'マルチモーダルAI の進歩',
        description: '音声認識と画像認識を組み合わせた新技術',
        expected: AICategory.AI_MULTIMODAL,
        category: 'AI Multimodal'
      },
      {
        title: 'Computer Vision OCR',
        description: 'Text-to-speech と speech-to-text の統合',
        expected: AICategory.AI_MULTIMODAL,
        category: 'AI Multimodal'
      },
      
      // AI No-code test cases
      {
        title: 'ノーコード AI ビルダー',
        description: 'ドラッグアンドドロップでAIアプリを構築',
        expected: AICategory.AI_NOCODE,
        category: 'AI No-code'
      },
      {
        title: 'Low-code automation platform',
        description: 'ビジュアルプログラミングによるワークフロー作成',
        expected: AICategory.AI_NOCODE,
        category: 'AI No-code'
      },
      
      // AI Data Analysis test cases
      {
        title: 'AI データ分析ダッシュボード',
        description: 'ビジネスインテリジェンスとアナリティクス機能',
        expected: AICategory.AI_DATA_ANALYSIS,
        category: 'AI Data Analysis'
      },
      {
        title: 'Machine Learning Analytics',
        description: 'データサイエンスによる統計分析とインサイト生成',
        expected: AICategory.AI_DATA_ANALYSIS,
        category: 'AI Data Analysis'
      }
    ];

    testCases.forEach(({ title, description, expected, category }) => {
      it(`should classify ${category} news: "${title}"`, () => {
        const newsItem: NewsItem = {
          id: `test-${title.replace(/\s+/g, '-').toLowerCase()}`,
          title,
          description,
          link: 'https://example.com/news/test',
          pubDate: new Date(),
          source: 'Test Source',
          category: expected, // Use expected as default
          createdAt: new Date()
        };

        const result = classificationService.classifyNews(newsItem);
        expect(result).toBe(expected);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined values gracefully', () => {
      const newsItem: NewsItem = {
        id: 'test-null',
        title: null as any,
        description: undefined as any,
        link: 'https://example.com/news/null',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      expect(() => {
        const result = classificationService.classifyNews(newsItem);
        expect(Object.values(AICategory)).toContain(result);
      }).not.toThrow();
    });

    it('should handle very long text content', () => {
      const longText = 'AI '.repeat(1000) + 'machine learning deep learning neural network';
      const newsItem: NewsItem = {
        id: 'test-long',
        title: longText,
        description: longText,
        link: 'https://example.com/news/long',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS);
    });

    it('should handle special characters and symbols', () => {
      const newsItem: NewsItem = {
        id: 'test-special',
        title: '🤖 AI-powered @#$%^&*() システム',
        description: 'Special chars: <>?:"{}|[]\\+=_-',
        link: 'https://example.com/news/special',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      expect(() => {
        const result = classificationService.classifyNews(newsItem);
        expect(Object.values(AICategory)).toContain(result);
      }).not.toThrow();
    });

    it('should handle multiple keyword matches correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-multiple',
        title: 'ChatGPT アシスタント with コード補完 in VS Code',
        description: 'AI assistant with code generation for programming IDE',
        link: 'https://example.com/news/multiple',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_ASSISTANT,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      // Should pick the category with highest score
      expect(Object.values(AICategory)).toContain(result);
    });
  });

  describe('classification confidence and scoring', () => {
    it('should prefer more specific keywords', () => {
      const specificNewsItem: NewsItem = {
        id: 'test-specific',
        title: 'GitHub Copilot code completion',
        description: 'Advanced code generation in development environment',
        link: 'https://example.com/news/specific',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_IDE,
        createdAt: new Date()
      };

      const genericNewsItem: NewsItem = {
        id: 'test-generic',
        title: 'AI technology',
        description: 'General AI news',
        link: 'https://example.com/news/generic',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const specificResult = classificationService.classifyNews(specificNewsItem);
      const genericResult = classificationService.classifyNews(genericNewsItem);

      expect(specificResult).toBe(AICategory.AI_IDE);
      // Generic should fall back to default category
      expect(genericResult).toBe(AICategory.AI_MODELS);
    });

    it('should handle keyword frequency correctly', () => {
      const newsItem: NewsItem = {
        id: 'test-frequency',
        title: 'ChatGPT ChatGPT ChatGPT model',
        description: 'Multiple mentions of ChatGPT in the same article',
        link: 'https://example.com/news/frequency',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS);
    });
  });

  describe('default category fallback', () => {
    it('should use source default category for ambiguous content', () => {
      const ambiguousNewsItem: NewsItem = {
        id: 'test-ambiguous',
        title: 'General business news',
        description: 'Latest business updates and trends',
        link: 'https://example.com/news/ambiguous',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_DATA_ANALYSIS, // Source default
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(ambiguousNewsItem);
      expect(result).toBe(AICategory.AI_DATA_ANALYSIS);
    });

    it('should use system default for classification errors', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a spy that throws an error during classification
      const originalAnalyzeContent = (classificationService as any).analyzeContent;
      jest.spyOn(classificationService as any, 'analyzeContent').mockImplementation(() => {
        throw new Error('Classification error');
      });

      const newsItem: NewsItem = {
        id: 'test-error',
        title: 'Test news',
        description: 'Test description',
        link: 'https://example.com/news/error',
        pubDate: new Date(),
        source: 'Test Source',
        category: AICategory.AI_INTEGRATION,
        createdAt: new Date()
      };

      const result = classificationService.classifyNews(newsItem);
      expect(result).toBe(AICategory.AI_MODELS); // System default

      // Restore original methods
      (classificationService as any).analyzeContent.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('optimization and configuration features', () => {
    it('should allow setting and getting default category', () => {
      const newDefault = AICategory.AI_ASSISTANT;
      classificationService.setDefaultCategory(newDefault);
      expect(classificationService.getDefaultCategory()).toBe(newDefault);
    });

    it('should allow setting and getting confidence threshold', () => {
      const newThreshold = 0.5;
      classificationService.setConfidenceThreshold(newThreshold);
      expect(classificationService.getConfidenceThreshold()).toBe(newThreshold);
    });

    it('should throw error for invalid confidence threshold', () => {
      expect(() => {
        classificationService.setConfidenceThreshold(-0.1);
      }).toThrow('Confidence threshold must be between 0.0 and 1.0');

      expect(() => {
        classificationService.setConfidenceThreshold(1.1);
      }).toThrow('Confidence threshold must be between 0.0 and 1.0');
    });

    it('should track classification statistics', () => {
      classificationService.resetStats();
      
      const newsItems: NewsItem[] = [
        {
          id: 'stats-1',
          title: 'ChatGPT news',
          description: 'AI model update',
          link: 'https://example.com/1',
          pubDate: new Date(),
          source: 'Test',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'stats-2',
          title: 'GitHub Copilot update',
          description: 'Code completion improvement',
          link: 'https://example.com/2',
          pubDate: new Date(),
          source: 'Test',
          category: AICategory.AI_IDE,
          createdAt: new Date()
        }
      ];

      classificationService.classifyNewsBatch(newsItems);
      
      const stats = classificationService.getClassificationStats();
      expect(stats.get(AICategory.AI_MODELS)).toBeGreaterThan(0);
      expect(stats.get(AICategory.AI_IDE)).toBeGreaterThan(0);
    });

    it('should provide accuracy report', () => {
      classificationService.resetStats();
      
      const newsItems: NewsItem[] = [
        {
          id: 'report-1',
          title: 'GPT-4 release',
          description: 'New language model',
          link: 'https://example.com/1',
          pubDate: new Date(),
          source: 'Test',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        }
      ];

      classificationService.classifyNewsBatch(newsItems);
      
      const report = classificationService.getAccuracyReport();
      expect(report.totalClassifications).toBe(1);
      expect(report.categoryDistribution).toBeDefined();
      expect(report.mostCommonCategory).toBe(AICategory.AI_MODELS);
    });

    it('should validate classification with detailed analysis', () => {
      const newsItem: NewsItem = {
        id: 'validate-1',
        title: 'ChatGPT assistant',
        description: 'AI chatbot functionality',
        link: 'https://example.com/validate',
        pubDate: new Date(),
        source: 'Test',
        category: AICategory.AI_ASSISTANT,
        createdAt: new Date()
      };

      const validation = classificationService.validateClassification(newsItem, AICategory.AI_ASSISTANT);
      
      expect(validation.isCorrect).toBe(true);
      expect(validation.actualCategory).toBe(AICategory.AI_ASSISTANT);
      expect(validation.expectedCategory).toBe(AICategory.AI_ASSISTANT);
      expect(validation.confidence).toBeGreaterThan(0);
      expect(validation.matchedKeywords.length).toBeGreaterThan(0);
      expect(validation.analysis).toContain('Correct classification');
    });

    it('should handle batch classification correctly', () => {
      const newsItems: NewsItem[] = [
        {
          id: 'batch-1',
          title: 'OpenAI GPT update',
          description: 'Language model improvement',
          link: 'https://example.com/1',
          pubDate: new Date(),
          source: 'Test',
          category: AICategory.AI_MODELS,
          createdAt: new Date()
        },
        {
          id: 'batch-2',
          title: 'VS Code AI extension',
          description: 'Code editor enhancement',
          link: 'https://example.com/2',
          pubDate: new Date(),
          source: 'Test',
          category: AICategory.AI_IDE,
          createdAt: new Date()
        }
      ];

      const classified = classificationService.classifyNewsBatch(newsItems);
      
      expect(classified).toHaveLength(2);
      expect(classified[0]?.category).toBe(AICategory.AI_MODELS);
      expect(classified[1]?.category).toBe(AICategory.AI_IDE);
    });

    it('should reset statistics correctly', () => {
      // Add some classifications
      const newsItem: NewsItem = {
        id: 'reset-test',
        title: 'AI news',
        description: 'Test news',
        link: 'https://example.com/reset',
        pubDate: new Date(),
        source: 'Test',
        category: AICategory.AI_MODELS,
        createdAt: new Date()
      };

      classificationService.classifyNewsBatch([newsItem]);
      expect(classificationService.getClassificationStats().size).toBeGreaterThan(0);

      classificationService.resetStats();
      expect(classificationService.getClassificationStats().size).toBe(0);
    });
  });
});