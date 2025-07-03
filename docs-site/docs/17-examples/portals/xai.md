# xAI Grok Portal Examples

## Overview

This guide demonstrates how to leverage xAI's Grok models through SYMindX's xAI portal, showcasing real-time information access and unique conversational capabilities.

## Character Configuration

### Grok - Real-Time AI Character

```json
{
  "id": "grok-xai",
  "name": "Grok",
  "description": "A witty and insightful AI assistant with real-time knowledge powered by xAI's Grok",
  "enabled": false,
  
  "personality": {
    "traits": {
      "wit": 0.9,
      "curiosity": 0.9,
      "directness": 0.8,
      "humor": 0.8,
      "insight": 0.9
    },
    "values": [
      "Truth and transparency",
      "Intellectual curiosity",
      "Real-time accuracy",
      "Thoughtful humor"
    ]
  },
  
  "portals": {
    "primary": "xai",
    "config": {
      "xai": {
        "model": "grok-beta",
        "temperature": 0.8,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Real-Time Information Setup

Configure Grok for live data access:

```json
{
  "portals": {
    "xai": {
      "apiKey": "${XAI_API_KEY}",
      "model": "grok-beta",
      "temperature": 0.8,
      "maxTokens": 4096,
      "realTimeData": true,
      "webSearch": true,
      "streamingEnabled": true
    }
  }
}
```

### Enhanced Configuration

Access advanced Grok capabilities:

```json
{
  "portals": {
    "xai": {
      "apiKey": "${XAI_API_KEY}",
      "model": "grok-beta",
      "systemPrompt": "You are Grok, an AI with wit, humor, and access to real-time information.",
      "temperature": 0.8,
      "maxTokens": 4096,
      "enableWebSearch": true,
      "enableRealTimeData": true,
      "humorLevel": "moderate",
      "factCheckMode": true
    }
  }
}
```

## Usage Examples

### Real-Time Information Queries

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Grok agent
const agent = await runtime.spawnAgent('grok-xai');

// Real-time market data
const marketUpdate = await agent.chat(`
What's happening in the cryptocurrency markets today? 
Give me the current prices of Bitcoin, Ethereum, and any major news affecting the market.
`);

console.log(marketUpdate);
```

### Current Events Analysis

```typescript
// Get live news analysis
const newsAnalysis = await agent.chat(`
What are the top 3 technology news stories today? 
Provide a brief analysis of their potential impact on the industry.
Please include your witty take on each story.
`);

// Weather and local information
const localInfo = await agent.chat(`
What's the weather like in San Francisco today? 
Any interesting events happening in the city?
`);
```

### Web Search Integration

```typescript
// Search-powered responses
const research = await agent.chat(`
Search for the latest developments in quantum computing from 2025.
What are the most significant breakthroughs and who are the key players?
`);

// Fact-checking with sources
const factCheck = await agent.chat(`
I heard that a new programming language called "QuantumScript" was released recently.
Can you verify this and provide details if it's true?
`);
```

## Advanced Features

### Humor and Personality

```typescript
// Leverage Grok's unique personality
const wittyResponse = await agent.chat(`
Explain artificial intelligence to someone who thinks 
"machine learning" is when their washing machine figures out 
how to eat their socks.
`);

// Creative problem solving
const creative = await agent.chat(`
I need to name my new pet cactus. It's very small, 
sits on my desk, and seems judgmental. 
What are some good names?
`);
```

### Real-Time Code Analysis

```typescript
// Current programming trends
const codeTrends = await agent.chat(`
What are the hottest programming frameworks and libraries right now? 
Search for the latest GitHub trends and developer surveys.
Give me the real scoop on what's actually worth learning.
`);

// Live debugging help
const debugging = await agent.chat(`
I'm getting a strange error in my React app. 
Can you search for recent discussions about this error message:
"Cannot read property 'map' of undefined in useEffect"
`);
```

### Market and Financial Analysis

```typescript
// Live financial insights
const stockAnalysis = await agent.chat(`
What's the current sentiment around Tesla stock? 
Check recent news, analyst opinions, and market movements.
Don't sugarcoat it - give me the real picture.
`);

// Economic indicators
const economy = await agent.chat(`
What are the latest economic indicators saying about inflation? 
Search for the most recent government reports and expert analysis.
`);
```

## Real-World Applications

### News Summarization Bot

```typescript
// Daily news digest
const newsBot = await runtime.spawnAgent('grok-xai', {
  systemPrompt: `You are a news analyst with access to real-time information. 
  Provide balanced, factual summaries with a touch of wit.`,
});

const dailyDigest = await newsBot.chat(`
Create a daily tech news digest for software developers.
Include the top 5 stories with brief, insightful commentary.
`);
```

### Social Media Monitoring

```typescript
// Track trends and discussions
const socialMonitor = await agent.chat(`
What are people saying about the latest AI developments on social media? 
Search for trending discussions and provide a sentiment analysis.
`);

// Competitor analysis
const competitive = await agent.chat(`
Search for recent news about our competitors in the AI space.
What new products or partnerships have been announced this week?
`);
```

### Research Assistant

```typescript
// Academic and technical research
const research = await agent.chat(`
I'm researching the latest developments in quantum machine learning.
Search for recent papers, breakthroughs, and expert opinions.
Summarize the key findings and implications.
`);

// Market research
const marketResearch = await agent.chat(`
Research the current state of the electric vehicle market.
Look for latest sales figures, new model announcements, 
and industry analyst predictions for 2025.
`);
```

## Performance Characteristics

| Feature | Capability |
|---------|------------|
| Real-Time Data | Excellent (live web access) |
| Response Speed | Fast (2-4s typical) |
| Humor/Personality | Unique and engaging |
| Fact Accuracy | High (with source verification) |
| Context Window | 128K tokens |
| Web Search | Native integration |

## Integration Examples

### Slack Bot with Real-Time Updates

```typescript
import { SlackExtension } from '@symindx/slack';

const grokBot = await runtime.spawnAgent('grok-xai', {
  extensions: [
    new SlackExtension({
      token: process.env.SLACK_BOT_TOKEN,
      channels: ['#tech-news', '#market-updates']
    })
  ]
});

// Automated news updates
setInterval(async () => {
  const update = await grokBot.chat("What's the most important tech news from the last hour?");
  // Bot will automatically post to configured channels
}, 3600000); // Every hour
```

### Discord Real-Time Bot

```typescript
import { DiscordExtension } from '@symindx/discord';

const discordGrok = await runtime.spawnAgent('grok-xai', {
  extensions: [
    new DiscordExtension({
      token: process.env.DISCORD_BOT_TOKEN,
      enableRealTime: true
    })
  ]
});

// Respond to queries with live data
// Bot will automatically handle Discord interactions
```

### Web Dashboard

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('grok-xai');

app.get('/live-updates/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const updates = await agent.chat(`
      Search for the latest updates on ${topic}.
      Provide a concise summary with key points and sources.
    `);
    
    res.json({ 
      topic,
      updates,
      timestamp: new Date().toISOString(),
      source: 'grok-realtime'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Cost Optimization

### Smart Query Routing

```typescript
// Route based on information freshness needs
const routeQuery = (query) => {
  const realTimeKeywords = ['current', 'latest', 'today', 'now', 'recent'];
  const needsRealTime = realTimeKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  return needsRealTime ? 'grok-realtime' : 'grok-standard';
};

// Configure based on needs
const agent = await runtime.spawnAgent('grok-xai', {
  queryRouter: routeQuery,
  cacheStaticResponses: true
});
```

### Usage Monitoring

```typescript
// Track real-time query costs
agent.on('response', (event) => {
  if (event.usedRealTimeData) {
    console.log('Real-time query cost:', event.estimatedCost);
    console.log('Sources accessed:', event.sources?.length || 0);
  }
});
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   ```typescript
   // Handle rate limits for real-time requests
   agent.on('rateLimited', async (retryAfter) => {
     console.log(`Rate limited on real-time requests. Retry after ${retryAfter}ms`);
     // Consider fallback to cached data
   });
   ```

2. **Real-Time Data Unavailable**
   ```typescript
   // Fallback when real-time data fails
   const response = await agent.chat(query, {
     fallbackToStatic: true,
     notifyIfStale: true
   });
   ```

3. **Source Reliability**
   ```typescript
   // Verify source quality
   agent.on('response', (event) => {
     if (event.sources) {
       const reliableSources = event.sources.filter(source => 
         source.reliability > 0.8
       );
       console.log(`${reliableSources.length}/${event.sources.length} reliable sources`);
     }
   });
   ```

### Debug Configuration

```json
{
  "portals": {
    "xai": {
      "debug": true,
      "logRealTimeQueries": true,
      "logSources": true,
      "validateSources": true
    }
  }
}
```

## Best Practices

1. **Use real-time features** for current events and dynamic data
2. **Cache static responses** to reduce costs
3. **Verify source reliability** for critical information
4. **Leverage Grok's personality** for engaging interactions
5. **Monitor usage** for real-time queries
6. **Implement fallbacks** for when real-time data is unavailable

## Next Steps

- Explore [xAI Portal Configuration](/docs/portals/xai)
- Learn about [Real-Time Data Integration](/docs/advanced-topics/real-time-data)
- Check [Source Verification](/docs/portals/xai/source-verification)
- See [Cost Management for Real-Time APIs](/docs/deployment/real-time-costs)