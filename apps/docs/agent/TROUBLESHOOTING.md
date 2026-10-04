# SYMindX Troubleshooting Guide

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Configuration Problems](#configuration-problems)
4. [Runtime Errors](#runtime-errors)
5. [Performance Issues](#performance-issues)
6. [Memory Provider Issues](#memory-provider-issues)
7. [Portal and AI Provider Issues](#portal-and-ai-provider-issues)
8. [Extension Problems](#extension-problems)
9. [Character and Emotion Issues](#character-and-emotion-issues)
10. [CLI Troubleshooting](#cli-troubleshooting)
11. [Network and Connectivity](#network-and-connectivity)
12. [Database Issues](#database-issues)
13. [Security and Permissions](#security-and-permissions)
14. [Logging and Debugging](#logging-and-debugging)
15. [Common Error Messages](#common-error-messages)
16. [Performance Optimization](#performance-optimization)
17. [Emergency Recovery](#emergency-recovery)
18. [Context Integration Issues](#context-integration-issues)

## Quick Diagnostics

### Health Check Script

Run this quick diagnostic to identify common issues:

```bash
#!/bin/bash
# quick-diagnostics.sh

echo "🔍 SYMindX Quick Diagnostics"
echo "================================"

# Check Node.js/Bun version
echo "📦 Runtime Versions:"
node --version 2>/dev/null && echo "✅ Node.js installed" || echo "❌ Node.js not found"
bun --version 2>/dev/null && echo "✅ Bun installed" || echo "❌ Bun not found"

# Check dependencies
echo -e "\n📚 Dependencies:"
if [ -f "package.json" ]; then
  echo "✅ package.json found"
  if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
  else
    echo "❌ node_modules missing - run 'bun install'"
  fi
else
  echo "❌ package.json not found - wrong directory?"
fi

# Check configuration
echo -e "\n⚙️ Configuration:"
if [ -f "src/core/config/runtime.json" ]; then
  echo "✅ runtime.json found"
else
  echo "❌ runtime.json missing - copy from runtime.example.json"
fi

if [ -f ".env" ]; then
  echo "✅ .env file found"
else
  echo "⚠️ .env file not found - may be using runtime.json"
fi

# Check build status
echo -e "\n🔨 Build Status:"
if [ -d "dist" ]; then
  echo "✅ dist directory exists"
  if [ -f "dist/index.js" ]; then
    echo "✅ Built successfully"
  else
    echo "❌ Incomplete build - run 'bun run build'"
  fi
else
  echo "❌ Not built - run 'bun run build'"
fi

# Check ports
echo -e "\n🌐 Port Availability:"
for port in 3000 3001 3002; do
  if lsof -i :$port >/dev/null 2>&1; then
    echo "⚠️ Port $port is in use"
  else
    echo "✅ Port $port available"
  fi
done

# Check database files
echo -e "\n💾 Database Status:"
if [ -d "data" ]; then
  echo "✅ data directory exists"
  for db in data/*.db; do
    if [ -f "$db" ]; then
      echo "✅ Database found: $(basename $db)"
    fi
  done
else
  echo "⚠️ data directory not found - will be created on first run"
fi

echo -e "\n🏁 Diagnostics complete!"
```

### System Status Check

```bash
# Check system status
bun cli status

# Check specific components
bun cli agents status
bun cli portals status
bun cli extensions status
```

### Health Endpoint Test

```bash
# Test health endpoint (if API extension is running)
curl -f http://localhost:3000/api/system/health || echo "API not responding"

# Detailed health check
curl -s http://localhost:3000/api/system/health | jq '.' || echo "Health check failed"
```

## Installation Issues

### Dependency Installation Problems

#### Issue: `bun install` fails

**Symptoms**:
- Command hangs or fails with timeout
- Missing dependencies
- Version conflicts

**Solutions**:

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install --force

# Use specific registry
bun install --registry https://registry.npmjs.org/

# Install with verbose logging
bun install --verbose

# Fallback to npm
npm install
```

#### Issue: TypeScript compilation errors

**Symptoms**:
- Build fails with TS errors
- Type checking failures
- Import resolution errors

**Solutions**:

```bash
# Install TypeScript dependencies
bun add -D typescript @types/node

# Use skip lib check for development
bun run build:simple

# Check TypeScript configuration
tsc --noEmit --listFiles
```

#### Issue: Permission denied errors

**Symptoms**:
- Cannot write to directories
- Installation fails with EACCES
- Build output permission errors

**Solutions**:

```bash
# Fix ownership
sudo chown -R $USER:$USER node_modules
sudo chown -R $USER:$USER dist

# Use correct permissions
chmod -R 755 scripts/
chmod +x scripts/*.sh

# Fix npm permissions (if using npm)
npm config set prefix ~/.npm-global
```

### Platform-Specific Issues

#### macOS Issues

```bash
# Install Xcode command line tools
xcode-select --install

# Use Homebrew for dependencies
brew install node
brew install postgresql

# Fix permission issues
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Windows Issues

```bash
# Use WSL for best compatibility
wsl --install

# Or use PowerShell with proper execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies via chocolatey
choco install nodejs postgresql
```

#### Linux Issues

```bash
# Update package manager
sudo apt update && sudo apt upgrade

# Install build essentials
sudo apt install build-essential

# Install Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Configuration Problems

### Runtime Configuration Issues

#### Issue: API keys not loaded

**Symptoms**:
- "API key not found" errors
- Portal initialization failures
- Authentication errors

**Solutions**:

1. **Check environment variables**:
   ```bash
   echo $OPENAI_API_KEY
   echo $ANTHROPIC_API_KEY
   
   # Set if missing
   export OPENAI_API_KEY="sk-..."
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

2. **Check runtime.json**:
   ```json
   {
     "portals": {
       "apiKeys": {
         "openai": "sk-...",
         "anthropic": "sk-ant-..."
       }
     }
   }
   ```

3. **Environment variable precedence**:
   ```bash
   # Environment variables override runtime.json
   # Check both sources
   cat src/core/config/runtime.json | jq '.portals.apiKeys'
   ```

#### Issue: Invalid JSON configuration

**Symptoms**:
- "Unexpected token" errors
- Configuration parsing failures
- Character loading errors

**Solutions**:

```bash
# Validate JSON syntax
jq '.' src/core/config/runtime.json
jq '.' src/characters/nyx.json

# Check for common issues
grep -n ",$" src/core/config/runtime.json  # Trailing commas
grep -n "'/'" src/core/config/runtime.json  # Single quotes
```

#### Issue: Character configuration errors

**Symptoms**:
- Character won't load
- Validation errors
- Missing required fields

**Solutions**:

1. **Validate character schema**:
   ```bash
   bun cli validate-character src/characters/my-character.json
   ```

2. **Check required fields**:
   ```json
   {
     "id": "required-unique-string",
     "name": "required-display-name",
     "version": "required-version",
     "enabled": true
   }
   ```

3. **Fix common validation errors**:
   ```json
   {
     "portals": [
       {
         "name": "must-be-unique",
         "type": "valid-portal-type",
         "enabled": true,
         "config": {
           "model": "valid-model-name"
         }
       }
     ]
   }
   ```

### Database Configuration Issues

#### Issue: Database connection failures

**Symptoms**:
- "Connection refused" errors
- Database timeout errors
- Authentication failures

**Solutions**:

1. **Test connection manually**:
   ```bash
   # PostgreSQL
   psql $DATABASE_URL -c "SELECT 1;"
   
   # SQLite
   sqlite3 data/memories.db ".tables"
   
   # Supabase
   curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
   ```

2. **Check connection string format**:
   ```bash
   # PostgreSQL format
   postgresql://username:password@host:port/database
   
   # Supabase format  
   postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

3. **Common connection issues**:
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Check if port is open
   telnet localhost 5432
   
   # Check firewall
   sudo ufw status
   ```

## Runtime Errors

### Application Startup Errors

#### Issue: "Cannot find module" errors

**Symptoms**:
- Import/require failures
- Module resolution errors
- Path not found errors

**Solutions**:

```bash
# Rebuild dependencies
rm -rf node_modules dist
bun install
bun run build

# Check module exports
ls node_modules/@ai-sdk/
grep -r "export" src/types/index.ts

# Use absolute imports
import { Agent } from '../../../types/index.js'
```

#### Issue: Port already in use

**Symptoms**:
- "EADDRINUSE" errors
- Server startup failures
- Port binding errors

**Solutions**:

```bash
# Find process using port
lsof -i :3000
netstat -tlnp | grep :3000

# Kill process
kill $(lsof -t -i:3000)

# Use different port
PORT=3001 bun start

# Update configuration
{
  "extensions": [
    {
      "name": "api",
      "config": {
        "port": 3001
      }
    }
  ]
}
```

#### Issue: Memory allocation errors

**Symptoms**:
- "Out of memory" errors
- Process crashes
- Heap allocation failures

**Solutions**:

```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 dist/index.js

# Use Bun with memory limit
bun --max-old-space-size=4096 start

# Monitor memory usage
top -p $(pgrep -f symindx)
```

### Agent Runtime Errors

#### Issue: Agent initialization failures

**Symptoms**:
- Agent won't start
- Character loading errors
- Module initialization failures

**Solutions**:

1. **Check character configuration**:
   ```bash
   bun cli validate-character src/characters/problematic-character.json
   ```

2. **Test individual modules**:
   ```bash
   # Test memory provider
   bun cli test-memory sqlite
   
   # Test portal connection
   bun cli test-portal openai
   
   # Test extension
   bun cli test-extension api
   ```

3. **Check dependencies**:
   ```json
   {
     "memory": {
       "type": "sqlite",
       "config": {
         "dbPath": "./data/valid-path.db"
       }
     }
   }
   ```

#### Issue: Agent response failures

**Symptoms**:
- No responses generated
- Empty responses
- Response timeout errors

**Solutions**:

1. **Check portal configuration**:
   ```bash
   # Test API connectivity
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

2. **Verify model names**:
   ```json
   {
     "portals": [
       {
         "config": {
           "model": "gpt-4o-mini"  // Use valid model name
         }
       }
     ]
   }
   ```

3. **Check rate limits**:
   ```bash
   # Look for rate limit headers
   curl -I -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/chat/completions
   ```

## Performance Issues

### Slow Response Times

#### Issue: API responses taking too long

**Symptoms**:
- High latency responses
- Timeout errors
- User frustration

**Solutions**:

1. **Optimize portal configuration**:
   ```json
   {
     "portals": [
       {
         "config": {
           "maxTokens": 1000,     // Reduce from 4000
           "temperature": 0.3,    // Lower for faster, more consistent responses
           "timeout": 15000       // 15 second timeout
         }
       }
     ]
   }
   ```

2. **Use faster models**:
   ```json
   {
     "portals": [
       {
         "type": "groq",
         "config": {
           "model": "llama-3.3-70b-versatile"  // Groq for speed
         }
       },
       {
         "type": "openai", 
         "config": {
           "model": "gpt-4o-mini"  // Faster than gpt-4o
         }
       }
     ]
   }
   ```

3. **Implement caching**:
   ```bash
   # Enable Redis caching
   REDIS_URL=redis://localhost:6379
   
   # Configure cache in runtime.json
   {
     "cache": {
       "enabled": true,
       "ttl": 300,     // 5 minute cache
       "redis": {
         "url": "${REDIS_URL}"
       }
     }
   }
   ```

#### Issue: High memory usage

**Symptoms**:
- System slowdown
- Out of memory errors
- Memory leaks

**Solutions**:

1. **Monitor memory usage**:
   ```bash
   # Real-time monitoring
   top -p $(pgrep -f symindx)
   
   # Memory profiling
   node --inspect dist/index.js
   # Then connect Chrome DevTools
   ```

2. **Optimize memory configuration**:
   ```json
   {
     "memory": {
       "config": {
         "maxMemories": 10000,        // Reduce from default
         "compressionThreshold": 5000, // Compress sooner
         "memoryDecayRate": 0.1       // Faster memory decay
       }
     }
   }
   ```

3. **Garbage collection tuning**:
   ```bash
   # Force garbage collection
   node --expose-gc --max-old-space-size=2048 dist/index.js
   
   # Monitor GC
   node --trace-gc dist/index.js
   ```

### Database Performance Issues

#### Issue: Slow database queries

**Symptoms**:
- Slow memory retrieval
- Database timeouts
- High CPU usage

**Solutions**:

1. **Optimize SQLite**:
   ```sql
   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_memories_agent_timestamp 
   ON memories(agent_id, timestamp);
   
   CREATE INDEX IF NOT EXISTS idx_memories_importance 
   ON memories(importance);
   
   -- Optimize database
   VACUUM;
   ANALYZE;
   ```

2. **Optimize PostgreSQL**:
   ```sql
   -- Update statistics
   ANALYZE memories;
   
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_memories_content_trgm 
   ON memories USING gin(content gin_trgm_ops);
   ```

3. **Connection pooling**:
   ```json
   {
     "memory": {
       "config": {
         "connectionPool": {
           "max": 10,           // Maximum connections
           "min": 2,            // Minimum connections
           "idle": 30000        // Idle timeout
         }
       }
     }
   }
   ```

## Memory Provider Issues

### SQLite Issues

#### Issue: Database locked errors

**Symptoms**:
- "Database is locked" errors
- Write operation failures
- Concurrent access issues

**Solutions**:

```bash
# Check for hanging processes
fuser data/memories.db

# Kill hanging processes
fuser -k data/memories.db

# Check file permissions
ls -la data/memories.db
chmod 664 data/memories.db

# Enable WAL mode for better concurrency
sqlite3 data/memories.db "PRAGMA journal_mode=WAL;"
```

#### Issue: Database corruption

**Symptoms**:
- "Database disk image is malformed"
- Read/write errors
- Integrity check failures

**Solutions**:

```bash
# Check database integrity
sqlite3 data/memories.db "PRAGMA integrity_check;"

# Repair database
sqlite3 data/memories.db ".recover" | sqlite3 data/memories_recovered.db

# Backup and restore
cp data/memories.db data/memories_backup.db
sqlite3 data/memories.db ".dump" | sqlite3 data/memories_new.db
```

### PostgreSQL Issues

#### Issue: Connection pool exhaustion

**Symptoms**:
- "Sorry, too many clients already" errors
- Connection timeout errors
- Performance degradation

**Solutions**:

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limits
SHOW max_connections;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < now() - interval '5 minutes';
```

```javascript
// Improve connection management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Increase pool size
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000, // Connection timeout
});
```

### Supabase Issues

#### Issue: API rate limiting

**Symptoms**:
- 429 "Too Many Requests" errors
- Temporary failures
- Performance issues

**Solutions**:

```javascript
// Implement retry logic
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

// Use connection pooling
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    pool: {
      max: 10,
      min: 2
    }
  }
});
```

#### Issue: Authentication errors

**Symptoms**:
- "Invalid API key" errors
- Authentication failures
- Unauthorized access errors

**Solutions**:

```bash
# Verify API keys
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection
curl -H "apikey: $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/"

# Check project settings in Supabase dashboard
# - API URL
# - Service role key vs anon key
# - Row Level Security settings
```

## Portal and AI Provider Issues

### OpenAI Issues

#### Issue: API key authentication failures

**Symptoms**:
- "Incorrect API key provided" errors
- 401 Unauthorized responses
- Authentication errors

**Solutions**:

```bash
# Verify API key format
echo $OPENAI_API_KEY | grep -E '^sk-[a-zA-Z0-9]{48}$'

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check usage and billing
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage
```

#### Issue: Rate limiting and quota exceeded

**Symptoms**:
- 429 "Rate limit exceeded" errors
- 403 "Quota exceeded" errors
- Service unavailable responses

**Solutions**:

```javascript
// Implement exponential backoff
async function makeRequestWithBackoff(requestFn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Use rate limiting
const rateLimit = new Map();
function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const requests = rateLimit.get(key) || [];
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  validRequests.push(now);
  rateLimit.set(key, validRequests);
}
```

### Anthropic Issues

#### Issue: Model not available

**Symptoms**:
- "Model not available" errors
- Invalid model name errors
- Service unavailable responses

**Solutions**:

```bash
# Check available models
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/models

# Use correct model names
# claude-3-5-sonnet-20241022
# claude-3-5-haiku-20241022
# claude-3-opus-20240229
```

```json
{
  "portals": [
    {
      "type": "anthropic",
      "config": {
        "model": "claude-3-5-sonnet-20241022",  // Use specific version
        "maxTokens": 4096,
        "temperature": 0.7
      }
    }
  ]
}
```

### Groq Issues

#### Issue: Context length exceeded

**Symptoms**:
- "Context length exceeded" errors
- Request too large errors
- Truncated responses

**Solutions**:

```javascript
// Implement context management
function manageContext(messages, maxTokens = 8000) {
  let totalTokens = 0;
  const managedMessages = [];
  
  // Always keep system message
  if (messages[0]?.role === 'system') {
    managedMessages.push(messages[0]);
    totalTokens += estimateTokens(messages[0].content);
  }
  
  // Add messages from most recent
  for (let i = messages.length - 1; i >= 1; i--) {
    const messageTokens = estimateTokens(messages[i].content);
    if (totalTokens + messageTokens > maxTokens) break;
    
    managedMessages.unshift(messages[i]);
    totalTokens += messageTokens;
  }
  
  return managedMessages;
}
```

### Local Model Issues (Ollama)

#### Issue: Model not downloaded

**Symptoms**:
- "Model not found" errors
- Download required messages
- Service unavailable

**Solutions**:

```bash
# Check available models
ollama list

# Download model
ollama pull llama3.2

# Check model status
ollama show llama3.2

# Start Ollama service
ollama serve
```

#### Issue: GPU memory issues

**Symptoms**:
- CUDA out of memory errors
- Slow inference
- Model loading failures

**Solutions**:

```bash
# Check GPU memory
nvidia-smi

# Use smaller model
ollama pull llama3.2:8b  # Instead of 70b

# Adjust model parameters
ollama run llama3.2:8b --gpu-memory-limit 4GB

# Use CPU instead of GPU
CUDA_VISIBLE_DEVICES="" ollama serve
```

## Extension Problems

### API Extension Issues

#### Issue: Server won't start

**Symptoms**:
- Port binding failures
- Server startup errors
- Extension initialization failures

**Solutions**:

```bash
# Check port availability
lsof -i :3000

# Try different port
{
  "extensions": [
    {
      "name": "api",
      "config": {
        "port": 3001  // Use different port
      }
    }
  ]
}

# Check firewall
sudo ufw allow 3000
```

#### Issue: CORS errors

**Symptoms**:
- Browser CORS errors
- Cross-origin request failures
- Preflight failures

**Solutions**:

```json
{
  "extensions": [
    {
      "name": "api",
      "config": {
        "cors": {
          "enabled": true,
          "origins": ["http://localhost:3000", "https://yourdomain.com"],
          "methods": ["GET", "POST", "PUT", "DELETE"],
          "headers": ["Content-Type", "Authorization"]
        }
      }
    }
  ]
}
```

### Telegram Extension Issues

#### Issue: Bot not responding

**Symptoms**:
- Bot shows offline
- Messages not received
- No responses to commands

**Solutions**:

```bash
# Verify bot token
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Check webhook status
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# Test bot manually
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
     -d "chat_id=YOUR_CHAT_ID&text=Test message"
```

```json
{
  "extensions": [
    {
      "name": "telegram",
      "enabled": true,
      "config": {
        "autoRespond": true,
        "personalityMode": "full",
        "rateLimiting": {
          "enabled": true,
          "maxMessagesPerMinute": 20
        }
      }
    }
  ]
}
```

#### Issue: Rate limiting by Telegram

**Symptoms**:
- Messages delayed
- 429 errors from Telegram API
- Bot appears slow

**Solutions**:

```javascript
// Implement message queue
class MessageQueue {
  constructor(maxPerSecond = 1) {
    this.queue = [];
    this.processing = false;
    this.interval = 1000 / maxPerSecond;
  }
  
  async add(message) {
    return new Promise((resolve, reject) => {
      this.queue.push({ message, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { message, resolve, reject } = this.queue.shift();
      try {
        const result = await this.sendMessage(message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
    
    this.processing = false;
  }
}
```

## Character and Emotion Issues

### Character Loading Problems

#### Issue: Character validation errors

**Symptoms**:
- Character won't load
- Validation failures
- Configuration errors

**Solutions**:

1. **Check required fields**:
   ```json
   {
     "id": "must-be-present",
     "name": "must-be-present", 
     "version": "must-be-present",
     "enabled": true
   }
   ```

2. **Validate portal configuration**:
   ```json
   {
     "portals": [
       {
         "name": "unique-name",
         "type": "valid-type",
         "enabled": true,
         "config": {
           "model": "valid-model"
         }
       }
     ]
   }
   ```

3. **Check emotion configuration**:
   ```json
   {
     "emotion": {
       "type": "composite",
       "config": {
         "sensitivity": 0.8,  // Must be 0-1
         "emotions": {
           "happy": {
             "sensitivity": 0.7  // Must be 0-1
           }
         }
       }
     }
   }
   ```

### Emotion System Issues

#### Issue: Emotions not triggering

**Symptoms**:
- No emotional responses
- Flat, unemotional behavior
- Emotion state always neutral

**Solutions**:

1. **Check emotion sensitivity**:
   ```json
   {
     "emotion": {
       "config": {
         "sensitivity": 0.8,  // Increase if too low
         "emotions": {
           "happy": {
             "sensitivity": 0.9  // Increase individual sensitivity
           }
         }
       }
     }
   }
   ```

2. **Enable emotion debugging**:
   ```json
   {
     "emotion": {
       "config": {
         "debugMode": true,
         "logTriggers": true,
         "logStateChanges": true
       }
     }
   }
   ```

3. **Test emotion triggers manually**:
   ```bash
   bun cli test-emotion happy 0.8
   bun cli emotion-status
   ```

#### Issue: Emotions too intense

**Symptoms**:
- Overwhelming emotional responses
- Emotions persist too long
- Erratic behavior

**Solutions**:

```json
{
  "emotion": {
    "config": {
      "sensitivity": 0.5,      // Reduce global sensitivity
      "decayRate": 0.2,        // Increase decay rate
      "intensityAmplifier": 0.8, // Reduce amplifier
      "thresholds": {
        "activationThreshold": 0.2,   // Increase activation threshold
        "expressionThreshold": 0.4    // Increase expression threshold
      }
    }
  }
}
```

## CLI Troubleshooting

### CLI Won't Start

#### Issue: Command not found

**Symptoms**:
- "bun cli" command not found
- Permission denied errors
- Script execution failures

**Solutions**:

```bash
# Check if built
ls -la dist/cli/

# Build CLI specifically
bun run build:cli

# Run directly
bun src/cli/ink-cli.tsx

# Check permissions
chmod +x scripts/build-cli.js
```

#### Issue: Terminal compatibility issues

**Symptoms**:
- Rendering problems
- Control characters visible
- Navigation not working

**Solutions**:

```bash
# Check terminal capabilities
echo $TERM

# Use compatible terminal
TERM=xterm-256color bun cli

# Fallback to basic CLI
bun cli --no-interactive

# Use specific commands instead
bun cli status
bun cli agents
```

### CLI Display Issues

#### Issue: Unicode/emoji rendering problems

**Symptoms**:
- Broken emoji display
- Character encoding issues
- Layout problems

**Solutions**:

```bash
# Check locale
locale

# Set UTF-8 locale
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

# Disable emoji in CLI
CLI_NO_EMOJI=true bun cli

# Use simple theme
CLI_THEME=simple bun cli
```

#### Issue: Screen size issues

**Symptoms**:
- Layout breaks on small screens
- Content cut off
- Scrolling problems

**Solutions**:

```bash
# Check terminal size
tput cols
tput lines

# Minimum size recommendations
# Width: 80 columns
# Height: 24 lines

# Use responsive mode
CLI_RESPONSIVE=true bun cli

# Force specific size
stty cols 100 rows 30
```

## Network and Connectivity

### DNS Resolution Issues

#### Issue: Cannot resolve API hostnames

**Symptoms**:
- "ENOTFOUND" errors
- DNS resolution failures
- Network timeouts

**Solutions**:

```bash
# Test DNS resolution
nslookup api.openai.com
dig api.anthropic.com

# Check /etc/hosts
cat /etc/hosts

# Use public DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Test connectivity
curl -I https://api.openai.com
```

### Firewall Issues

#### Issue: Outbound connections blocked

**Symptoms**:
- Connection timeout errors
- "Connection refused" errors
- API request failures

**Solutions**:

```bash
# Check firewall status
sudo ufw status
sudo iptables -L

# Allow outbound HTTPS
sudo ufw allow out 443

# Allow specific domains
sudo ufw allow out to api.openai.com
sudo ufw allow out to api.anthropic.com

# Temporary disable firewall for testing
sudo ufw disable  # Re-enable after testing!
```

### Proxy Issues

#### Issue: Corporate proxy blocking requests

**Symptoms**:
- Proxy authentication failures
- SSL certificate errors
- Connection timeouts

**Solutions**:

```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1

# For authenticated proxy
export HTTPS_PROXY=http://username:password@proxy.company.com:8080

# Verify proxy settings
curl -I --proxy $HTTPS_PROXY https://api.openai.com
```

```javascript
// Configure proxy in application
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);

const response = await fetch('https://api.openai.com/v1/models', {
  agent,
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
```

## Database Issues

### Connection Issues

#### Issue: "Connection refused" errors

**Symptoms**:
- Cannot connect to database
- Timeout errors
- Service unavailable

**Solutions**:

```bash
# Check if database service is running
sudo systemctl status postgresql
sudo systemctl start postgresql

# Check if port is listening
netstat -tlnp | grep :5432

# Test connection manually
psql "postgresql://user:pass@localhost:5432/dbname" -c "SELECT 1;"

# Check firewall
sudo ufw allow 5432
```

### Performance Issues

#### Issue: Slow query performance

**Symptoms**:
- High response times
- Database timeouts
- High CPU usage

**Solutions**:

```sql
-- Check slow queries (PostgreSQL)
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_memories_agent_time 
ON memories(agent_id, timestamp);

-- Update statistics
ANALYZE memories;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'memories';
```

```bash
# SQLite optimization
sqlite3 data/memories.db "VACUUM;"
sqlite3 data/memories.db "ANALYZE;"
sqlite3 data/memories.db "PRAGMA optimize;"
```

### Data Integrity Issues

#### Issue: Database corruption

**Symptoms**:
- Integrity check failures
- Read/write errors
- Unexpected data

**Solutions**:

```sql
-- PostgreSQL integrity check
SELECT pg_check_integrity();

-- Repair corrupted data
REINDEX DATABASE symindx;

-- Check table consistency
SELECT count(*) FROM memories;
SELECT count(DISTINCT id) FROM memories;
```

```bash
# SQLite integrity check
sqlite3 data/memories.db "PRAGMA integrity_check;"

# Repair SQLite database
sqlite3 data/memories.db ".recover" | sqlite3 data/memories_repaired.db
```

## Security and Permissions

### File Permission Issues

#### Issue: Permission denied errors

**Symptoms**:
- Cannot read/write files
- Configuration loading failures
- Database access denied

**Solutions**:

```bash
# Check file permissions
ls -la src/core/config/
ls -la data/

# Fix permissions
chmod 644 src/core/config/runtime.json
chmod 755 data/
chmod 664 data/*.db

# Fix ownership
sudo chown -R $USER:$USER .
```

### API Key Security Issues

#### Issue: API keys exposed in logs

**Symptoms**:
- Keys visible in error messages
- Keys in log files
- Keys in version control

**Solutions**:

```bash
# Remove keys from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch config/runtime.json' \
  --prune-empty --tag-name-filter cat -- --all

# Add to .gitignore
echo "src/core/config/runtime.json" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# Check for exposed keys
grep -r "sk-" . --exclude-dir=node_modules
grep -r "sk-ant-" . --exclude-dir=node_modules
```

```javascript
// Redact sensitive information in logs
function redactSensitiveData(obj) {
  const redacted = { ...obj };
  
  if (redacted.apiKey) {
    redacted.apiKey = redacted.apiKey.substring(0, 8) + '...';
  }
  
  if (redacted.token) {
    redacted.token = '***';
  }
  
  return redacted;
}
```

## Logging and Debugging

### Enable Debug Logging

```json
{
  "logging": {
    "level": "debug",
    "enableFileLogging": true,
    "logFile": "./logs/symindx-debug.log",
    "enableCharacterLogs": true,
    "enableExtensionLogs": true,
    "enablePortalLogs": true
  }
}
```

### Useful Log Commands

```bash
# Follow logs in real-time
tail -f logs/symindx.log

# Search for specific errors
grep -i "error" logs/symindx.log | tail -20

# Filter by component
grep "Portal" logs/symindx.log
grep "Emotion" logs/symindx.log
grep "Memory" logs/symindx.log

# Show recent errors with context
grep -B 5 -A 5 "ERROR" logs/symindx.log | tail -50
```

### Debug Environment Variables

```bash
# Enable debug output
DEBUG=symindx:* bun start

# Node.js debugging
NODE_DEBUG=net,http,fs bun start

# Verbose npm/bun output
npm start --verbose
bun start --verbose
```

## Common Error Messages

### "Cannot find module '@ai-sdk/openai'"

**Cause**: Missing AI SDK dependencies
**Solution**:
```bash
bun add @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/groq ai
```

### "Invalid API key provided"

**Cause**: Incorrect or missing API key
**Solution**:
```bash
# Check API key format
echo $OPENAI_API_KEY | grep -E '^sk-[a-zA-Z0-9]{48}$'

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

### "EADDRINUSE: address already in use"

**Cause**: Port already in use
**Solution**:
```bash
# Find and kill process
lsof -ti :3000 | xargs kill -9

# Use different port
PORT=3001 bun start
```

### "Database is locked"

**Cause**: SQLite database locked by another process
**Solution**:
```bash
# Kill processes using database
fuser -k data/memories.db

# Enable WAL mode
sqlite3 data/memories.db "PRAGMA journal_mode=WAL;"
```

### "Context length exceeded"

**Cause**: Input too long for AI model
**Solution**:
```javascript
// Truncate input
function truncateContext(messages, maxTokens = 4000) {
  // Implementation to manage context length
}
```

### "Rate limit exceeded"

**Cause**: Too many API requests
**Solution**:
```javascript
// Implement exponential backoff
async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

## Performance Optimization

### Memory Optimization

```javascript
// Configure garbage collection
node --max-old-space-size=4096 --expose-gc dist/index.js

// Monitor memory usage
const memUsage = process.memoryUsage();
console.log('Memory usage:', {
  rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
  heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
});
```

### Database Optimization

```sql
-- PostgreSQL optimizations
SET shared_preload_libraries = 'pg_stat_statements';
SET track_activity_query_size = 2048;
SET log_min_duration_statement = 1000;

-- Add useful indexes
CREATE INDEX CONCURRENTLY idx_memories_agent_timestamp 
ON memories(agent_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_memories_importance 
ON memories(importance DESC) WHERE importance > 0.5;
```

### Caching Strategies

```javascript
// Simple in-memory cache
const cache = new Map();

async function getCachedResponse(key, generator, ttl = 300000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.value;
  }
  
  const value = await generator();
  cache.set(key, { value, timestamp: Date.now() });
  return value;
}

// Redis cache
const redis = new Redis(process.env.REDIS_URL);

async function getCachedResponseRedis(key, generator, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const value = await generator();
  await redis.setex(key, ttl, JSON.stringify(value));
  return value;
}
```

## Emergency Recovery

### Complete System Reset

```bash
#!/bin/bash
# emergency-reset.sh

echo "🚨 Emergency System Reset"
echo "This will reset SYMindX to clean state"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Stop all processes
pkill -f symindx
pkill -f "bun.*dist"

# Backup data
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp -r data/ backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# Clean build artifacts
rm -rf dist/
rm -rf node_modules/
rm -f bun.lockb

# Reset configuration
cp src/core/config/runtime.example.json src/core/config/runtime.json

# Reinstall dependencies
bun install

# Rebuild
bun run build

echo "✅ System reset complete"
echo "📝 Configure runtime.json with your API keys"
echo "🚀 Run 'bun start' to begin"
```

### Data Recovery

```bash
#!/bin/bash
# recover-data.sh

echo "💾 Data Recovery Utility"

# Check for backups
if [ -d "backups" ]; then
  echo "Available backups:"
  ls -la backups/
  echo
  read -p "Enter backup directory name to restore: " backup_dir
  
  if [ -d "backups/$backup_dir" ]; then
    cp -r "backups/$backup_dir/"* data/
    echo "✅ Data restored from backup"
  else
    echo "❌ Backup not found"
  fi
else
  echo "❌ No backups found"
fi

# Repair databases
echo "🔧 Repairing databases..."
for db in data/*.db; do
  if [ -f "$db" ]; then
    echo "Checking $db..."
    sqlite3 "$db" "PRAGMA integrity_check;" | head -1
    
    if [ $? -ne 0 ]; then
      echo "Repairing $db..."
      sqlite3 "$db" ".recover" | sqlite3 "${db%.db}_repaired.db"
    fi
  fi
done

echo "✅ Recovery complete"
```

### Health Check and Repair

```bash
#!/bin/bash
# health-repair.sh

echo "🏥 SYMindX Health Check and Repair"

# Check dependencies
echo "📦 Checking dependencies..."
if ! command -v bun &> /dev/null; then
  echo "❌ Bun not installed"
  curl -fsSL https://bun.sh/install | bash
fi

# Check and repair node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  bun install
fi

# Check and repair build
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
  echo "🔨 Building application..."
  bun run build
fi

# Check configuration
if [ ! -f "src/core/config/runtime.json" ]; then
  echo "⚙️ Creating default configuration..."
  cp src/core/config/runtime.example.json src/core/config/runtime.json
  echo "📝 Edit src/core/config/runtime.json with your API keys"
fi

# Check data directory
if [ ! -d "data" ]; then
  echo "💾 Creating data directory..."
  mkdir -p data
fi

# Check database health
for db in data/*.db; do
  if [ -f "$db" ]; then
    echo "🔍 Checking $db..."
    result=$(sqlite3 "$db" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
    if [ "$result" != "ok" ]; then
      echo "⚠️ Database issues found in $db"
    fi
  fi
done

# Test basic functionality
echo "🧪 Testing basic functionality..."
timeout 10s bun dist/index.js --test 2>/dev/null && echo "✅ Basic test passed" || echo "⚠️ Basic test failed"

echo "✅ Health check complete"
```

## Context Integration Issues

### Context System Not Starting

#### Issue: Context system fails to initialize

**Symptoms**:
- "Context system initialization failed" errors
- Agents work but without context features
- Context commands return "not available"

**Solutions**:

```bash
# Check context configuration
bun cli context:status

# Verify configuration
cat mind-agents/src/core/config/runtime.json | grep -A 10 "contextConfig"

# Enable context system
{
  "contextConfig": {
    "enabled": true,
    "migrationPhase": 1
  }
}

# Test basic context functionality
bun cli context:test-basic
```

### High Memory Usage from Context System

#### Issue: Memory usage increases significantly after enabling context

**Symptoms**:
- Memory usage continuously growing
- System becoming unresponsive
- "Out of memory" errors

**Solutions**:

```bash
# Monitor context memory usage
bun cli context:memory-analysis

# Check active contexts
bun cli context:list --active

# Force cleanup
bun cli context:cleanup --force

# Reduce context retention
{
  "contextConfig": {
    "defaultTtl": 900000,      # 15 minutes
    "cleanupInterval": 120000,  # 2 minutes
    "maxContextsPerAgent": 5
  }
}

# Emergency memory cleanup
bun cli context:emergency-cleanup
```

### Context Enrichment Performance Issues

#### Issue: Slow response times after enabling enrichment

**Symptoms**:
- Delayed agent responses
- High CPU usage
- Enrichment timeouts

**Solutions**:

```bash
# Profile enrichment performance
bun cli context:profile-enrichment --duration 300

# Check enricher status
bun cli context:enrichers --status

# Reduce enricher load
{
  "contextConfig": {
    "enrichmentConfig": {
      "maxConcurrency": 2,
      "defaultTimeout": 1500,
      "enabledEnrichers": ["temporal", "environment"]
    }
  }
}

# Test selective enrichment
bun cli context:test-enrichment --selective temporal,environment
```

### Context Not Found Errors

#### Issue: Context lookup failures

**Symptoms**:
- "Context not found" errors
- Agents losing context mid-conversation
- Context data not persisting

**Solutions**:

```bash
# Check context exists
bun cli context:exists <context-id>

# List all contexts for agent
bun cli context:list --agent <agent-id>

# Increase context TTL
{
  "contextConfig": {
    "defaultTtl": 7200000,  # 2 hours
    "cleanupInterval": 600000  # 10 minutes
  }
}

# Debug context lifecycle
bun cli context:debug <context-id> --lifecycle
```

### Cache Performance Issues

#### Issue: Poor cache performance or cache errors

**Symptoms**:
- Low cache hit rates
- High cache miss penalties
- Cache-related errors

**Solutions**:

```bash
# Check cache statistics
bun cli context:cache-stats --detailed

# Test cache functionality
bun cli context:test-cache --duration 300

# Optimize cache configuration
{
  "contextConfig": {
    "cachingConfig": {
      "l1": {
        "maxSize": 50,
        "ttl": 300
      },
      "strategies": {
        "frequencyBased": { "enabled": true }
      }
    }
  }
}

# Clear and rebuild cache
bun cli context:cache-clear
bun cli context:cache-warm
```

### Multi-Agent Context Issues

#### Issue: Context sharing or synchronization problems

**Symptoms**:
- Contexts not shared between agents
- Synchronization conflicts
- Inconsistent shared data

**Solutions**:

```bash
# Check multi-agent status
bun cli context:multi-agent-status

# Debug context sharing
bun cli context:debug-sharing --agent <agent-id>

# Resolve conflicts
bun cli context:resolve-conflicts --strategy priority_based

# Reset multi-agent context
{
  "contextConfig": {
    "multiAgentConfig": {
      "enableContextSharing": false,
      "enableContextSynchronization": false
    }
  }
}
```

### Context Integration Debug Commands

```bash
# Comprehensive context system status
bun cli context:status --detailed --include-metrics

# Debug specific context with full trace
bun cli context:debug <context-id> --include-enrichment --include-cache --include-lifecycle

# Monitor context activity in real-time
bun cli context:monitor --real-time --duration 600

# Test all context features
bun cli context:test-all --verbose

# Export context data for analysis
bun cli context:export <context-id> --format json --include-metadata

# Health check for context system
bun cli context:health-check --include-enrichers --include-cache

# Performance benchmark
bun cli context:benchmark --duration 300 --include-enrichers

# Memory usage breakdown
bun cli context:memory-breakdown --include-cache
```

### Context Configuration Validation

```bash
# Validate context configuration
bun cli context:validate-config

# Test configuration changes
bun cli context:test-config --dry-run

# Migration status check
bun cli context:migration-status

# Reset to safe defaults
bun cli context:reset-config --confirm
```

---

This troubleshooting guide covers the most common issues encountered with SYMindX. For issues not covered here, check the logs, enable debug mode, and consult the community resources or support channels.