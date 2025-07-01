---
sidebar_position: 1
title: "Common Issues"
description: "Solutions to common problems"
---

# Common Issues

Solutions to common problems

## Common Issues

### Agent Not Starting

#### Symptoms
- Agent shows as 'stopped' in UI
- No response to messages
- Errors in logs

#### Solutions

1. **Check Configuration**
   ```bash
   # Validate config file
   cat config/runtime.json | jq .
   
   # Check character file exists
   ls -la mind-agents/src/characters/
   ```

2. **Verify API Keys**
   ```bash
   # Test API keys
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer "
   ```

3. **Check Logs**
   ```bash
   # View recent logs
   tail -f logs/symindx.log
   
   # Search for errors
   grep ERROR logs/symindx.log
   ```

### Memory Provider Errors

#### SQLite: "Database is locked"
```typescript
// Increase timeout
const memory = createMemoryProvider('sqlite', {
  timeout: 5000, // 5 seconds
  busyTimeout: 5000
});
```

#### PostgreSQL: "Connection refused"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
echo 
```

#### Supabase: "Invalid API key"
```typescript
// Verify credentials
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

### WebSocket Connection Issues

#### "WebSocket is closed"
```javascript
// Implement reconnection
const ws = new ReconnectingWebSocket('ws://localhost:3001/ws', {
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3
});
```

#### CORS Errors
```typescript
// Configure CORS properly
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

### Performance Issues

#### Slow Response Times
1. **Check Portal Latency**
   ```typescript
   const start = Date.now();
   const response = await portal.complete(prompt);
   console.log(`Portal latency: ${Date.now() - start}ms`);
   ```

2. **Optimize Prompts**
   ```typescript
   // Use smaller models for simple tasks
   const response = await agent.think(message, {
     model: 'gpt-3.5-turbo' // Faster than GPT-4
   });
   ```

3. **Enable Caching**
   ```typescript
   const cache = new NodeCache({ stdTTL: 600 });
   
   // Cache frequent queries
   const cached = cache.get(query);
   if (cached) return cached;
   ```

#### High Memory Usage
```bash
# Monitor memory
watch -n 1 'ps aux | grep node'

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" bun start

# Enable memory profiling
node --inspect mind-agents/dist/index.js
```

### Extension Issues

#### Telegram: "Webhook Error"
```bash
# Test webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Set webhook manually
curl https://api.telegram.org/bot<TOKEN>/setWebhook \
  -F "url=https://your-domain.com/telegram/webhook"
```

#### API Server: "Port Already in Use"
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Use different port
API_PORT=3002 bun start
```
