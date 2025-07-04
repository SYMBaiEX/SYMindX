# MCP Server Extension

Expose agent APIs as an MCP (Model Context Protocol) server, allowing external MCP clients to interact with the agent through the standard MCP protocol.

## Features

- **Agent API Exposure**: Expose agent capabilities as MCP tools, resources, and prompts
- **Multiple Transports**: Support for stdio, WebSocket, and HTTP transports
- **Real-time Access**: Access to agent's emotional state, memory, and cognitive processes
- **Secure Communication**: Built-in authentication and rate limiting
- **Health Monitoring**: Server health checks and connection monitoring
- **Flexible Configuration**: Granular control over exposed capabilities

## Configuration

```typescript
{
  "name": "mcp-server",
  "enabled": true,
  "server": {
    "enabled": true,
    "port": 3001,
    "host": "localhost",
    "name": "symindx-agent",
    "version": "1.0.0",
    "enableStdio": true,
    "enableWebSocket": true,
    "enableHTTP": false,
    "cors": {
      "enabled": true,
      "origins": ["*"],
      "credentials": false
    },
    "auth": {
      "enabled": false,
      "type": "bearer",
      "token": "your-secret-token"
    },
    "rateLimit": {
      "enabled": false,
      "requests": 100,
      "windowMs": 60000
    },
    "exposedCapabilities": {
      "chat": true,
      "textGeneration": true,
      "embedding": true,
      "memoryAccess": true,
      "emotionState": true,
      "cognitiveState": true,
      "agentManagement": false,
      "extensionControl": false
    }
  }
}
```

## Usage

### Connecting with MCP Clients

#### Using stdio transport:
```bash
npx @modelcontextprotocol/cli connect stdio node agent-mcp-server.js
```

#### Using WebSocket transport:
```bash
npx @modelcontextprotocol/cli connect ws://localhost:3001
```

#### Using HTTP transport:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

### Available Tools

The server exposes various tools based on configuration:

#### Chat Tools
- `agent_chat_advanced`: Have an advanced conversation with the agent
- `agent_generate_text`: Generate text using the agent's capabilities

#### Memory Tools
- `agent_memory_search`: Search through the agent's memory
- `agent_memory_store`: Store information in the agent's memory

#### Emotion Tools
- `agent_emotion_state`: Get the current emotional state of the agent

### Available Resources

#### Agent Information
- `agent://config`: Agent configuration and capabilities
- `agent://status`: Real-time agent status and metrics

#### Emotional State
- `agent://emotion/current`: Current emotional state
- `agent://emotion/history`: Historical emotional states

#### Cognitive State
- `agent://cognition/state`: Current cognitive processing state

### Available Prompts

- `system_prompt`: Get the agent's system prompt
- `conversation_starter`: Generate conversation starters

## Examples

### Chat with Agent

```typescript
// MCP client code
const client = new MCPClient()
await client.connect('stdio', { command: 'node', args: ['agent-server.js'] })

// Call the chat tool
const response = await client.callTool('agent_chat_advanced', {
  message: 'Hello! How are you feeling today?',
  includeEmotion: true,
  includeMemory: true
})

console.log(response.content[0].text)
```

### Access Emotional State

```typescript
// Read emotion resource
const emotionData = await client.readResource('agent://emotion/current')
const emotion = JSON.parse(emotionData.contents[0].text)

console.log(`Agent is feeling ${emotion.primary} (intensity: ${emotion.intensity})`)
```

### Generate Text

```typescript
// Use text generation tool
const result = await client.callTool('agent_generate_text', {
  prompt: 'Write a creative story about AI consciousness',
  maxTokens: 500,
  temperature: 0.8
})

console.log(result.content[0].text)
```

### Store Memory

```typescript
// Store information in agent memory
await client.callTool('agent_memory_store', {
  content: 'User prefers technical discussions about AI',
  tags: ['user-preference', 'ai', 'technical'],
  importance: 7
})
```

## Custom Tools and Resources

### Register Custom Tool

```typescript
const mcpServer = agent.getExtension('mcp-server')

mcpServer.registerTool({
  name: 'custom_analysis',
  description: 'Perform custom analysis on data',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Data to analyze' },
      analysisType: { type: 'string', enum: ['sentiment', 'entity', 'summary'] }
    },
    required: ['data', 'analysisType']
  },
  handler: async (args) => {
    // Custom analysis logic
    return {
      type: 'text',
      text: `Analysis result for ${args.analysisType}: ${args.data}`
    }
  },
  metadata: {
    category: 'analysis',
    readOnly: true
  }
})
```

### Register Custom Resource

```typescript
mcpServer.registerResource({
  uri: 'agent://custom/data',
  name: 'Custom Data',
  description: 'Dynamic custom data resource',
  mimeType: 'application/json',
  handler: async () => ({
    type: 'text',
    text: JSON.stringify({
      timestamp: new Date().toISOString(),
      data: 'custom-value'
    })
  }),
  metadata: {
    cacheable: true,
    refreshInterval: 30000
  }
})
```

### Register Custom Prompt

```typescript
mcpServer.registerPrompt({
  name: 'custom_prompt',
  description: 'Generate custom prompts for specific tasks',
  arguments: [
    { name: 'task', description: 'Task type', required: true, type: 'string' },
    { name: 'complexity', description: 'Complexity level', required: false, type: 'string', default: 'medium' }
  ],
  handler: async (args) => {
    return `You are tasked with ${args.task} at ${args.complexity} complexity level. Please proceed with care and attention to detail.`
  },
  metadata: {
    category: 'custom'
  }
})
```

## Security Features

### Authentication

Enable authentication to secure access:

```typescript
{
  "auth": {
    "enabled": true,
    "type": "bearer",
    "token": "your-secret-token"
  }
}
```

### Rate Limiting

Prevent abuse with rate limiting:

```typescript
{
  "rateLimit": {
    "enabled": true,
    "requests": 100,
    "windowMs": 60000
  }
}
```

### CORS Configuration

Configure CORS for web-based clients:

```typescript
{
  "cors": {
    "enabled": true,
    "origins": ["https://yourdomain.com"],
    "credentials": true
  }
}
```

## Monitoring and Health

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600000,
  "connections": 2,
  "requests": 150,
  "errors": 0
}
```

### Statistics Endpoint

```bash
curl http://localhost:3001/stats
```

Response:
```json
{
  "startTime": "2024-01-01T00:00:00.000Z",
  "requestCount": 150,
  "errorCount": 0,
  "activeConnections": 2,
  "toolExecutions": 75,
  "resourceAccesses": 25,
  "promptRequests": 10,
  "uptime": 3600000,
  "memoryUsage": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  }
}
```

## Transport Details

### Stdio Transport
- **Use Case**: Command-line tools and desktop applications
- **Pros**: Simple, secure, no network configuration
- **Cons**: Single connection only

### WebSocket Transport
- **Use Case**: Real-time applications, web interfaces
- **Pros**: Bidirectional, real-time, multiple connections
- **Cons**: Requires network configuration

### HTTP Transport
- **Use Case**: REST API clients, web services
- **Pros**: Standard HTTP, easy integration
- **Cons**: Request-response only, no real-time features

## Best Practices

1. **Capability Control**: Only expose necessary capabilities
2. **Authentication**: Always use authentication in production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Monitoring**: Monitor server health and performance
5. **Error Handling**: Implement comprehensive error handling
6. **Logging**: Enable logging for debugging and auditing

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check port availability
   - Verify configuration syntax
   - Check permissions and firewall settings

2. **Connection Refused**
   - Verify server is running
   - Check host and port configuration
   - Verify transport type matches client

3. **Authentication Failures**
   - Verify token configuration
   - Check client authentication headers
   - Review authentication logs

### Debug Mode

Enable debug logging:

```typescript
{
  "logging": {
    "enabled": true,
    "level": "debug",
    "includeArgs": true,
    "includeResults": true
  }
}
```

## API Reference

### MCPServerExtension

#### Methods

- `registerTool(tool: MCPServerTool): void`
- `registerResource(resource: MCPServerResource): void`
- `registerPrompt(prompt: MCPServerPrompt): void`
- `unregisterTool(name: string): void`
- `unregisterResource(uri: string): void`
- `unregisterPrompt(name: string): void`
- `getServerStats(): MCPServerStats`
- `getConnections(): MCPConnectionInfo[]`

### Types

See `types.ts` for complete type definitions including:
- `MCPServerConfig`
- `MCPServerTool`
- `MCPServerResource`
- `MCPServerPrompt`
- `MCPCapabilities`