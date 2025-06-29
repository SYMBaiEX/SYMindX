# Quick Start

Get your first SYMindX agent up and running in just 10 minutes! This guide assumes you've already completed the [installation](installation).

## Step 1: Start the Development Environment

SYMindX consists of two main components that work together:

```bash
# Start both the agent runtime and web interface
bun dev

# This runs:
# - Agent runtime on port 8080
# - Web interface on port 3000
```

You should see output like:

```
🔄 Starting SYMindX Development Environment...
🤖 Agent runtime starting on port 8080
🌐 Web interface starting on port 3000
✅ Both services ready!
```

## Step 2: Access the Web Interface

Open your browser and navigate to:
- **Web Interface**: [http://localhost:3000](http://localhost:3000)
- **Agent API**: [http://localhost:8080](http://localhost:8080)

You'll see the SYMindX dashboard with:
- Agent controls and status
- Real-time thought streams
- Emotion visualization
- System metrics

## Step 3: Create Your First Agent

### Option A: Use the Web Interface (Easiest)

1. Click **"Create New Agent"** in the dashboard
2. Fill out the agent form:
   - **Name**: "MyFirstAgent"
   - **Personality**: "Helpful and curious"
   - **Memory Provider**: "sqlite" (default)
   - **Emotion Module**: "rune-emotion-stack"
   - **Cognition Module**: "reactive"

3. Click **"Create Agent"** and watch it come to life!

### Option B: Create Agent Configuration File

Create a new file at `mind-agents/src/characters/my-first-agent.json`:

```json
{
  "id": "my-first-agent",
  "core": {
    "name": "MyFirstAgent",
    "tone": "helpful and curious assistant",
    "description": "A friendly AI agent learning about the world"
  },
  "lore": {
    "origin": "Created as a learning experiment",
    "motive": "Help users and learn from interactions",
    "backstory": "I'm excited to explore and assist!"
  },
  "psyche": {
    "traits": ["helpful", "curious", "friendly", "eager"],
    "defaults": {
      "memory": "sqlite",
      "emotion": "rune-emotion-stack",
      "cognition": "reactive",
      "portal": "openai"
    },
    "emotion": {
      "sensitivity": 0.7,
      "decayRate": 0.1,
      "baseline": "content"
    },
    "cognition": {
      "planningDepth": 3,
      "memoryRetrieval": {
        "maxResults": 10,
        "relevanceThreshold": 0.7
      }
    }
  },
  "modules": {
    "extensions": ["api", "slack"],
    "tools": {
      "enabled": true,
      "system": "dynamic"
    }
  }
}
```

## Step 4: Interact with Your Agent

### Using the Web Interface

1. **Thought Stream**: Watch your agent's internal thoughts in real-time
2. **Chat Interface**: Send messages directly to your agent
3. **Emotion Graph**: See how your agent's emotions change over time
4. **Agent Controls**: Start, stop, and configure your agent

### Using the REST API

Send a direct message to your agent:

```bash
curl -X POST http://localhost:8080/api/agents/my-first-agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Tell me about yourself.",
    "source": "user"
  }'
```

Response:
```json
{
  "success": true,
  "response": "Hello! I'm MyFirstAgent, a helpful and curious AI assistant. I love learning new things and helping users with their questions. What would you like to know or talk about?",
  "emotion": {
    "current": "excited",
    "intensity": 0.8,
    "reasoning": "Happy to meet a new user!"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Using WebSocket for Real-time Interaction

Connect to the WebSocket endpoint for live updates:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// Listen for agent thoughts and actions
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent update:', data);
};

// Send a message to the agent
ws.send(JSON.stringify({
  type: 'message',
  agentId: 'my-first-agent',
  content: 'What are you thinking about?'
}));
```

## Step 5: Explore Agent Features

### Memory System
Your agent automatically stores and recalls memories:

```bash
# View agent memories
curl http://localhost:8080/api/agents/my-first-agent/memories

# Search memories
curl "http://localhost:8080/api/agents/my-first-agent/memories/search?q=conversation"
```

### Emotion Tracking
Monitor emotional states:

```bash
# Get current emotion
curl http://localhost:8080/api/agents/my-first-agent/emotion

# Get emotion history
curl http://localhost:8080/api/agents/my-first-agent/emotion/history
```

### Agent Status
Check agent health and performance:

```bash
# Get agent status
curl http://localhost:8080/api/agents/my-first-agent/status

# Get detailed metrics
curl http://localhost:8080/api/agents/my-first-agent/metrics
```

## Step 6: Configure Extensions

Enable platform integrations by updating your agent configuration:

### Slack Integration

1. Create a Slack app and get your bot token
2. Add to your `.env` file:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-token-here
   SLACK_APP_TOKEN=xapp-your-app-token
   ```

3. Update your agent's extensions:
   ```json
   {
     "modules": {
       "extensions": ["api", "slack"]
     }
   }
   ```

4. Restart the agent runtime:
   ```bash
   bun dev:agent
   ```

Your agent can now respond to Slack messages!

### Twitter Integration

For social media automation:

```env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

Update agent configuration:
```json
{
  "modules": {
    "extensions": ["api", "twitter"]
  }
}
```

## Step 7: Monitor and Debug

### Real-time Logs
Watch agent activity:

```bash
# View runtime logs
bun dev:agent --verbose

# View specific agent logs
curl http://localhost:8080/api/agents/my-first-agent/logs
```

### Debug Mode
Enable detailed debugging:

```bash
# Start with debug logging
DEBUG=symindx:* bun dev
```

### Performance Monitoring
Check system performance:

```bash
# Get runtime statistics
curl http://localhost:8080/api/system/stats

# Get agent performance metrics
curl http://localhost:8080/api/agents/my-first-agent/performance
```

## Common First Steps

### 1. Test Agent Responses
```bash
# Ask your agent questions
curl -X POST http://localhost:8080/api/agents/my-first-agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?", "source": "user"}'
```

### 2. Check Memory Formation
```bash
# Send multiple messages to build memory
curl -X POST http://localhost:8080/api/agents/my-first-agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "My name is Alex and I love programming", "source": "user"}'

# Later, test memory recall
curl -X POST http://localhost:8080/api/agents/my-first-agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What do you remember about me?", "source": "user"}'
```

### 3. Observe Emotional Changes
Send messages that might trigger different emotions:
- Compliments (happy/proud)
- Challenges (focused/determined)  
- Confusion (puzzled/curious)
- Praise (excited/grateful)

## Troubleshooting

### Agent Won't Start
- Check your configuration file syntax
- Verify API keys are set correctly
- Ensure required dependencies are installed

### No Responses
- Verify the AI portal is configured (OpenAI, Anthropic, etc.)
- Check API key validity
- Look at runtime logs for errors

### Memory Issues
- Ensure database permissions are correct
- Check SQLite file exists and is writable
- Verify database schema is initialized

## Next Steps

Congratulations! You now have a working SYMindX agent. Here's what to explore next:

1. **[Your First Agent](your-first-agent)** - Customize your agent's personality
2. **[Configuration Guide](configuration)** - Advanced configuration options
3. **[Agent Development](../guides/agent-development)** - Build complex behaviors
4. **[Extension Development](../guides/plugin-development)** - Create custom integrations
5. **[Examples](../examples/overview)** - Learn from real-world implementations

Ready to build something amazing? Let's dive deeper into SYMindX! 🚀