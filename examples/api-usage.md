# API Usage Examples

This document demonstrates how to use the AI News Aggregator API endpoints.

## Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### Health Check

Check if the server is running:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

### Get All News

Retrieve all news items:

```bash
curl http://localhost:3000/api/news
```

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "news-1",
        "title": "ChatGPT-4の新機能発表",
        "description": "OpenAIが新しいマルチモーダル機能を発表",
        "link": "https://example.com/news-1",
        "pubDate": "2025-07-16T01:00:00.000Z",
        "source": "AINOW",
        "category": "AIモデル",
        "createdAt": "2025-07-16T01:00:00.000Z"
      }
    ],
    "total": 1,
    "category": "all"
  },
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

### Filter News by Category

Get news items filtered by a specific AI category:

```bash
# Get AI model news
curl "http://localhost:3000/api/news?category=AIモデル"

# Get AI assistant news
curl "http://localhost:3000/api/news?category=AIアシスタント"

# Get AI IDE news
curl "http://localhost:3000/api/news?category=AI%20IDE"
```

### Pagination

Use limit and offset parameters for pagination:

```bash
# Get first 10 items
curl "http://localhost:3000/api/news?limit=10"

# Get next 10 items (skip first 10)
curl "http://localhost:3000/api/news?limit=10&offset=10"
```

### Filter by Source

Get news from a specific source:

```bash
curl "http://localhost:3000/api/news?source=AINOW"
```

### Date Range Filtering

Filter news by publication date:

```bash
# Get news from the last 24 hours
curl "http://localhost:3000/api/news?startDate=2025-07-15T00:00:00Z"

# Get news from a specific date range
curl "http://localhost:3000/api/news?startDate=2025-07-15T00:00:00Z&endDate=2025-07-16T00:00:00Z"
```

### Get Specific News Item

Retrieve a specific news item by ID:

```bash
curl http://localhost:3000/api/news/news-1
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "news-1",
    "title": "ChatGPT-4の新機能発表",
    "description": "OpenAIが新しいマルチモーダル機能を発表",
    "link": "https://example.com/news-1",
    "pubDate": "2025-07-16T01:00:00.000Z",
    "source": "AINOW",
    "category": "AIモデル",
    "createdAt": "2025-07-16T01:00:00.000Z"
  },
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

## Available AI Categories

The system supports the following AI categories:

- `AIモデル` - AI Models (LLM, etc.)
- `AIアシスタント` - AI Assistants
- `AIエージェント` - AI Agents
- `AI IDE` - AI IDEs
- `AI CLIツール` - AI CLI Tools
- `AI検索・ナレッジベース` - AI Search & Knowledge Base
- `AI統合ツール` - AI Integration Tools (SaaS integration)
- `AI音声・マルチモーダル` - AI Voice & Multimodal
- `AIノーコードツール` - AI No-code Tools
- `AIデータ分析` - AI Data Analysis

## Error Responses

When an error occurs, the API returns a standardized error response:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## CORS Support

The API includes CORS support and can be accessed from web applications running on different domains. The CORS origin can be configured using the `CORS_ORIGIN` environment variable.

### Get Categories with Counts

Retrieve all AI categories with their news counts:

```bash
curl http://localhost:3000/api/categories
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "category": "AIモデル",
      "count": 15
    },
    {
      "category": "AIアシスタント",
      "count": 8
    },
    {
      "category": "AIエージェント",
      "count": 3
    },
    {
      "category": "AI IDE",
      "count": 12
    },
    {
      "category": "AI CLIツール",
      "count": 5
    },
    {
      "category": "AI検索・ナレッジベース",
      "count": 7
    },
    {
      "category": "AI統合ツール",
      "count": 9
    },
    {
      "category": "AI音声・マルチモーダル",
      "count": 4
    },
    {
      "category": "AIノーコードツール",
      "count": 6
    },
    {
      "category": "AIデータ分析",
      "count": 11
    }
  ],
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

### Manual News Collection

Trigger manual news collection from all RSS sources:

```bash
curl -X POST http://localhost:3000/api/collect
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "News collection completed successfully",
    "collected": 25,
    "saved": 18,
    "sources": [
      "AINOW",
      "Publickey",
      "ITmedia NEWS",
      "CodeZine",
      "日経クロステック",
      "Qiita"
    ]
  },
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

### Get System Status

Retrieve detailed system status information:

```bash
curl http://localhost:3000/api/status
```

Response:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "lastCollection": "2025-07-16T00:45:00.000Z",
    "totalNews": 80,
    "categoryCounts": [
      {
        "category": "AIモデル",
        "count": 15
      },
      {
        "category": "AIアシスタント",
        "count": 8
      }
    ],
    "storage": {
      "totalItems": 80,
      "memoryUsage": 2048576,
      "oldestItem": "2025-07-09T10:00:00.000Z",
      "newestItem": "2025-07-16T00:45:00.000Z"
    },
    "sources": [
      {
        "name": "AINOW",
        "url": "https://ainow.ai/feed/",
        "defaultCategory": "AIモデル"
      },
      {
        "name": "Publickey",
        "url": "https://www.publickey1.jp/atom.xml",
        "defaultCategory": "AIデータ分析"
      }
    ],
    "uptime": 3600,
    "nodeVersion": "v18.17.0",
    "platform": "win32"
  },
  "timestamp": "2025-07-16T01:00:00.000Z"
}
```

## JavaScript/TypeScript Usage Examples

### Using fetch API

```javascript
// Get all news
const getAllNews = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/news');
    const data = await response.json();
    
    if (data.success) {
      console.log('News items:', data.data.items);
      console.log('Total count:', data.data.total);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Get categories with counts
const getCategories = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/categories');
    const data = await response.json();
    
    if (data.success) {
      data.data.forEach(category => {
        console.log(`${category.category}: ${category.count} items`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Trigger manual collection
const collectNews = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      console.log('Collection completed:', data.data.message);
      console.log('Collected:', data.data.collected);
      console.log('Saved:', data.data.saved);
    } else {
      console.error('Collection failed:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Get system status
const getStatus = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/status');
    const data = await response.json();
    
    if (data.success) {
      console.log('System status:', data.data);
      console.log('Total news:', data.data.totalNews);
      console.log('Memory usage:', data.data.storage.memoryUsage, 'bytes');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Using axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
});

// Get filtered news
const getFilteredNews = async (category, limit = 20) => {
  try {
    const response = await api.get('/news', {
      params: { category, limit }
    });
    
    return response.data.data.items;
  } catch (error) {
    console.error('Error fetching news:', error.response?.data?.error || error.message);
    return [];
  }
};

// Example usage
getFilteredNews('AIモデル', 10).then(news => {
  console.log('AI Model news:', news);
});
```

## Security Features

The API includes several security features:
- Helmet.js for security headers
- Request logging with Morgan
- Input validation and sanitization
- Error handling to prevent information leakage
- CORS configuration for cross-origin requests
- JSON parsing error handling
- Standardized error responses