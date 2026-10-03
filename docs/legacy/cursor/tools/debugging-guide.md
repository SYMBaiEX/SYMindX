# SYMindX Debugging Guide

This guide provides comprehensive debugging strategies, common issue resolution, and troubleshooting workflows for the SYMindX project.

## Quick Debugging Checklist

### 1. First Steps
```bash
# Check system status
bun --version                    # Verify Bun runtime
node --version                   # Verify Node.js compatibility
git status                       # Check repository state

# Verify dependencies
bun install                      # Ensure all dependencies installed
bun run type-check              # Check TypeScript compilation
bun test --run                  # Run test suite

# Check configuration
cat .env.local                  # Verify environment variables
bun run config:validate         # Validate configuration
```

### 2. Application Health Check
```bash
# Core services status
bun run health:core             # Check core runtime
bun run health:portals          # Check AI portals
bun run health:memory           # Check memory providers
bun run health:extensions       # Check extensions

# Network connectivity
bun run test:connectivity       # Test external API access
bun run test:database          # Test database connections
```

## Common Issues and Solutions

### 1. Agent Initialization Issues

**Symptom**: Agent fails to start or initialize
```
Error: Agent initialization failed
```

**Debugging Steps**:
```bash
# Check core configuration
echo "=== Agent Configuration ==="
cat src/config/agent-config.ts

# Verify required environment variables
echo "=== Environment Variables ==="
env | grep -E "(API_KEY|DATABASE|OPENAI|ANTHROPIC)"

# Check agent logs
echo "=== Agent Logs ==="
tail -f logs/agent.log | grep -E "(ERROR|FATAL|initialization)"

# Test minimal agent creation
bun run debug:minimal-agent
```

**Common Causes**:
- Missing API keys
- Invalid configuration schema
- Network connectivity issues
- Database connection failures

**Solutions**:
```bash
# Fix missing API keys
cp .env.example .env.local
# Edit .env.local with your API keys

# Validate configuration
bun run config:validate

# Test network connectivity
curl -I https://api.openai.com/v1/models
curl -I https://api.anthropic.com/v1/complete
```

### 2. AI Portal Connection Issues

**Symptom**: AI provider requests failing
```
Error: OpenAI portal connection failed: 401 Unauthorized
```

**Debugging Steps**:
```bash
# Test specific portal
echo "=== Testing AI Portals ==="
bun run debug:portal openai
bun run debug:portal anthropic
bun run debug:portal groq

# Check API key validity
echo "=== API Key Test ==="
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Inspect portal configuration
echo "=== Portal Configuration ==="
cat src/portals/openai-portal.ts | grep -A 10 "constructor"
```

**Portal-Specific Debugging**:
```typescript
// Debug OpenAI Portal
import { OpenAIPortal } from './src/portals/openai-portal.js';

async function debugOpenAI() {
  try {
    const portal = new OpenAIPortal({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview'
    });

    await portal.initialize();
    console.log('✅ OpenAI portal initialized');

    const response = await portal.chat({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    console.log('✅ Chat response:', response);
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    console.error('Stack:', error.stack);
  }
}
```

### 3. Memory Provider Issues

**Symptom**: Memory operations failing
```
Error: SQLite memory provider: database is locked
```

**Debugging Steps**:
```bash
# Check database status
echo "=== Database Status ==="
ls -la data/*.db
file data/*.db

# Test database connectivity
echo "=== Database Connection Test ==="
bun run debug:memory sqlite
bun run debug:memory postgres

# Check database locks
echo "=== Database Locks ==="
lsof data/memory.db 2>/dev/null || echo "No locks found"

# Inspect memory provider logs
echo "=== Memory Provider Logs ==="
grep -E "(memory|database)" logs/app.log | tail -20
```

**Memory Provider Test Script**:
```typescript
// Debug Memory Provider
import { SQLiteMemory } from './src/memory/sqlite-memory.js';

async function debugMemory() {
  try {
    const memory = new SQLiteMemory({
      database: 'data/test-memory.db'
    });

    await memory.initialize();
    console.log('✅ Memory provider initialized');

    const id = await memory.store({
      content: 'Test memory',
      agentId: 'test-agent',
      embedding: new Array(1536).fill(0.1)
    });
    console.log('✅ Memory stored:', id);

    const results = await memory.query({
      type: 'keyword',
      query: 'test',
      limit: 1
    });
    console.log('✅ Memory queried:', results);
  } catch (error) {
    console.error('❌ Memory error:', error.message);
    console.error('Stack:', error.stack);
  }
}
```

### 4. Extension Connection Issues

**Symptom**: Platform extensions not receiving messages
```
Error: Discord extension: WebSocket connection closed
```

**Debugging Steps**:
```bash
# Check extension status
echo "=== Extension Status ==="
bun run debug:extensions

# Test platform connectivity
echo "=== Platform Connectivity ==="
curl -I https://discord.com/api/v10/gateway
curl -I https://api.telegram.org/bot$TELEGRAM_TOKEN/getMe

# Inspect extension logs
echo "=== Extension Logs ==="
grep -E "(extension|discord|telegram)" logs/app.log | tail -20

# Check WebSocket connections
echo "=== WebSocket Status ==="
netstat -an | grep -E "443|8080|9000"
```

### 5. Performance Issues

**Symptom**: Slow response times or high memory usage
```
Response time: 15000ms (expected: <2000ms)
Memory usage: 2.1GB (expected: <500MB)
```

**Performance Debugging**:
```bash
# Memory usage analysis
echo "=== Memory Analysis ==="
bun run analyze:memory
node --inspect-brk src/index.ts  # For detailed profiling

# Response time analysis
echo "=== Performance Metrics ==="
bun run benchmark:portals
bun run benchmark:memory
bun run benchmark:extensions

# Database performance
echo "=== Database Performance ==="
bun run analyze:database-queries
```

**Performance Monitoring Script**:
```typescript
// Performance monitoring
class PerformanceMonitor {
  static async measurePortalResponse(portal: string, message: string) {
    const start = performance.now();
    try {
      const response = await this.testPortal(portal, message);
      const duration = performance.now() - start;
      console.log(`${portal}: ${duration.toFixed(2)}ms`);
      return { success: true, duration, response };
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${portal}: ERROR after ${duration.toFixed(2)}ms - ${error.message}`);
      return { success: false, duration, error: error.message };
    }
  }

  static async measureMemoryUsage() {
    const usage = process.memoryUsage();
    console.log('Memory Usage:');
    console.log(`  RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
    return usage;
  }
}
```

## Debugging Tools and Scripts

### 1. Interactive Debugger

```typescript
// src/debug/interactive-debugger.ts
import readline from 'readline';
import { SYMindXAgent } from '../core/agent.js';

export class InteractiveDebugger {
  private agent: SYMindXAgent;
  private rl: readline.Interface;

  constructor(agent: SYMindXAgent) {
    this.agent = agent;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🔧 SYMindX Interactive Debugger');
    console.log('Available commands:');
    console.log('  status - Show agent status');
    console.log('  portals - List AI portals');
    console.log('  memory - Test memory operations');
    console.log('  chat <message> - Test chat functionality');
    console.log('  config - Show configuration');
    console.log('  logs - Show recent logs');
    console.log('  exit - Exit debugger\n');

    this.prompt();
  }

  private prompt() {
    this.rl.question('debug> ', async (input) => {
      await this.handleCommand(input.trim());
      this.prompt();
    });
  }

  private async handleCommand(command: string) {
    const [cmd, ...args] = command.split(' ');

    try {
      switch (cmd) {
        case 'status':
          await this.showStatus();
          break;
        case 'portals':
          await this.listPortals();
          break;
        case 'memory':
          await this.testMemory();
          break;
        case 'chat':
          await this.testChat(args.join(' '));
          break;
        case 'config':
          this.showConfig();
          break;
        case 'logs':
          this.showLogs();
          break;
        case 'exit':
          this.rl.close();
          process.exit(0);
          break;
        default:
          console.log(`Unknown command: ${cmd}`);
      }
    } catch (error) {
      console.error(`Error executing ${cmd}:`, error.message);
    }
  }

  private async showStatus() {
    const status = await this.agent.getStatus();
    console.log('Agent Status:', JSON.stringify(status, null, 2));
  }

  private async listPortals() {
    const portals = this.agent.getPortals();
    console.log('Available Portals:');
    portals.forEach(portal => {
      console.log(`  - ${portal.name}: ${portal.status}`);
    });
  }

  private async testMemory() {
    try {
      const memory = this.agent.getMemory();
      const testId = await memory.store({
        content: 'Debug test memory',
        agentId: this.agent.getId(),
        embedding: new Array(1536).fill(0.1)
      });
      console.log('✅ Memory store test passed:', testId);

      const results = await memory.query({
        type: 'keyword',
        query: 'debug',
        limit: 1
      });
      console.log('✅ Memory query test passed:', results.length, 'results');
    } catch (error) {
      console.error('❌ Memory test failed:', error.message);
    }
  }

  private async testChat(message: string) {
    if (!message) {
      console.log('Usage: chat <message>');
      return;
    }

    try {
      const response = await this.agent.chat(message);
      console.log('Response:', response);
    } catch (error) {
      console.error('Chat error:', error.message);
    }
  }

  private showConfig() {
    const config = this.agent.getConfig();
    console.log('Configuration:', JSON.stringify(config, null, 2));
  }

  private showLogs() {
    // Implementation to show recent logs
    console.log('Recent logs would be shown here');
  }
}
```

### 2. Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "🏥 SYMindX Health Check"
echo "======================="

# Function to check command success
check_command() {
    if $1 > /dev/null 2>&1; then
        echo "✅ $2"
    else
        echo "❌ $2"
        return 1
    fi
}

# Function to check service
check_service() {
    local service=$1
    local command=$2
    echo "Checking $service..."
    
    if eval "$command" > /dev/null 2>&1; then
        echo "✅ $service is healthy"
    else
        echo "❌ $service has issues"
        echo "   Command: $command"
        eval "$command" 2>&1 | sed 's/^/   /'
    fi
    echo
}

# Basic system checks
echo "🔧 System Checks"
echo "----------------"
check_command "which bun" "Bun runtime available"
check_command "which node" "Node.js available"
check_command "which git" "Git available"
echo

# Dependency checks
echo "📦 Dependency Checks"
echo "-------------------"
check_command "bun install --frozen-lockfile" "Dependencies installed"
check_command "bunx tsc --noEmit" "TypeScript compilation"
echo

# Service checks
echo "🚀 Service Checks"
echo "----------------"
check_service "Core Agent" "bun run health:core"
check_service "AI Portals" "bun run health:portals"
check_service "Memory Providers" "bun run health:memory"
check_service "Extensions" "bun run health:extensions"

# Network checks
echo "🌐 Network Checks"
echo "----------------"
check_service "OpenAI API" "curl -f -s https://api.openai.com/v1/models -H 'Authorization: Bearer $OPENAI_API_KEY'"
check_service "Anthropic API" "curl -f -s https://api.anthropic.com/v1/complete -H 'x-api-key: $ANTHROPIC_API_KEY'"

echo "Health check complete!"
```

### 3. Log Analysis Tool

```bash
#!/bin/bash
# analyze-logs.sh

LOG_FILE=${1:-logs/app.log}
LINES=${2:-100}

echo "📊 Log Analysis for $LOG_FILE"
echo "================================"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    exit 1
fi

# Error analysis
echo "🚨 Recent Errors (last $LINES lines):"
tail -n $LINES "$LOG_FILE" | grep -E "(ERROR|FATAL)" | tail -10

echo
echo "⚠️  Recent Warnings:"
tail -n $LINES "$LOG_FILE" | grep "WARN" | tail -10

echo
echo "📈 Log Summary:"
echo "  Total lines: $(wc -l < "$LOG_FILE")"
echo "  Errors: $(grep -c "ERROR" "$LOG_FILE")"
echo "  Warnings: $(grep -c "WARN" "$LOG_FILE")"
echo "  Info: $(grep -c "INFO" "$LOG_FILE")"

echo
echo "🔍 Most Common Errors:"
grep "ERROR" "$LOG_FILE" | sed 's/.*ERROR.*: //' | sort | uniq -c | sort -nr | head -5

echo
echo "⏰ Recent Activity (last 10 entries):"
tail -10 "$LOG_FILE"
```

## Debugging Workflows

### 1. New Issue Workflow

```
1. Reproduce Issue
   ├── Minimal reproduction case
   ├── Record exact error messages
   └── Note environment details

2. Gather Information
   ├── Check logs (app.log, error.log)
   ├── Run health checks
   ├── Test individual components
   └── Check system resources

3. Isolate Component
   ├── Test core agent separately
   ├── Test AI portals individually
   ├── Test memory providers
   └── Test extensions

4. Debug Component
   ├── Add debug logging
   ├── Use interactive debugger
   ├── Check configuration
   └── Test edge cases

5. Fix and Verify
   ├── Implement fix
   ├── Add test case
   ├── Verify in isolation
   └── Test full integration
```

### 2. Performance Issue Workflow

```
1. Measure Baseline
   ├── Record current metrics
   ├── Identify bottlenecks
   └── Set performance targets

2. Profile Application
   ├── Use Node.js profiler
   ├── Monitor memory usage
   ├── Analyze database queries
   └── Check network latency

3. Optimize Critical Path
   ├── Optimize AI portal calls
   ├── Improve memory operations
   ├── Cache frequently used data
   └── Optimize database queries

4. Test and Validate
   ├── Run performance benchmarks
   ├── Compare before/after metrics
   ├── Test under load
   └── Verify functionality unchanged
```

## Advanced Debugging Techniques

### 1. Memory Leak Detection

```typescript
// Memory leak detector
class MemoryLeakDetector {
  private snapshots: any[] = [];
  private interval: NodeJS.Timeout;

  start(intervalMs = 5000) {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      this.snapshots.push({
        timestamp: Date.now(),
        ...usage
      });

      // Keep only last 20 snapshots
      if (this.snapshots.length > 20) {
        this.snapshots.shift();
      }

      // Check for memory leak
      this.analyzeSnapshots();
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private analyzeSnapshots() {
    if (this.snapshots.length < 5) return;

    const recent = this.snapshots.slice(-5);
    const trend = this.calculateTrend(recent.map(s => s.heapUsed));

    if (trend > 1024 * 1024) { // 1MB increase per snapshot
      console.warn('🚨 Potential memory leak detected');
      console.warn(`Heap usage trend: +${(trend / 1024 / 1024).toFixed(2)}MB per snapshot`);
    }
  }

  private calculateTrend(values: number[]): number {
    // Simple linear regression slope
    const n = values.length;
    const x = values.map((_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}
```

### 2. Circuit Breaker Pattern for Debugging

```typescript
// Circuit breaker for AI portals
class DebugCircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private onStateChange?: (state: string) => void
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker: HALF_OPEN');
        this.onStateChange?.('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      console.log('✅ Circuit breaker: CLOSED');
      this.onStateChange?.('CLOSED');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log('🚨 Circuit breaker: OPEN');
      this.onStateChange?.('OPEN');
    }
  }
}
```

This debugging guide provides a comprehensive foundation for identifying, diagnosing, and resolving issues in the SYMindX system. Regular use of these tools and workflows helps maintain system reliability and performance. 