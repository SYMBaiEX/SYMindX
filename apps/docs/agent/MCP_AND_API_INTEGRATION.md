# MCP and API Integration for SYMindX

This document describes the Model Context Protocol (MCP) and HTTP API extensions added to the SYMindX Mind-Agents framework.

## Overview

Two new extensions have been added to enhance the SYMindX framework:

1. **MCP Extension** - Provides Model Context Protocol support for standardized LLM tool integration
2. **API Extension** - Provides HTTP REST API endpoints for direct agent interaction

## Model Context Protocol (MCP) Extension

<mcreference link="https://github.com/modelcontextprotocol/typescript-sdk" index="1">1</mcreference> The MCP extension allows SYMindX agents to expose tools, resources, and prompts to MCP-compatible clients in a standardized way.

### Features

- **Tools**: Execute agent actions and query capabilities
- **Resources**: Access agent memory, status, and configuration data
- **Prompts**: Predefined interaction templates for consistent responses
- **Transport Support**: stdio and HTTP transports
- **Extensible**: Custom tools, resources, and prompts can be registered

### Default Tools

- `get_agent_status` - Get current agent status with optional memory/emotion data
- `query_memory` - Search agent memory with query string and limit
- `chat_with_agent` - Direct chat interface with the agent
- `execute_action` - Execute extension actions programmatically

### Default Resources

- `agent-memory` - Access recent agent memories
- `agent-status` - Current agent status and state information

### Default Prompts

- `creative-response` - Generate responses in the agent's personality style

### Configuration

```json
{
  "mcp": {
    "enabled": true,
    "serverName": "nyx-agent",
    "serverVersion": "1.0.0",
    "transport": "stdio",
    "tools": [],
    "resources": [
      {
        "name": "agent-memory",
        "uri": "memory://agent/recent",
        "description": "Recent agent memories",
        "handler": "getRecentMemories"
      }
    ],
    "prompts": [
      {
        "name": "creative-response",
        "description": "Generate a creative response in agent's style",
        "handler": "generateCreativeResponse"
      }
    ],
    "capabilities": {
      "resources": true,
      "tools": true,
      "prompts": true,
      "logging": true
    }
  }
}
```

### Usage Example

<mcreference link="https://www.npmjs.com/package/@modelcontextprotocol/sdk" index="3">3</mcreference> Once the MCP server is running, clients can connect and use the exposed tools:

```typescript
// Example MCP client usage
import { Client } from '@modelcontextprotocol/sdk/client/index.js'

const client = new Client({
  name: "example-client",
  version: "1.0.0"
})

// Connect to the SYMindX MCP server
await client.connect(transport)

// List available tools
const tools = await client.listTools()

// Call the chat tool
const result = await client.callTool({
  name: "chat_with_agent",
  arguments: {
    message: "Hello, how are you?",
    context: { sessionId: "session_123" }
  }
})
```

## HTTP API Extension

The API extension provides RESTful HTTP endpoints for direct interaction with SYMindX agents.

### Features

- **RESTful Endpoints**: Standard HTTP methods for agent interaction
- **Authentication**: Bearer token and API key support
- **Rate Limiting**: Configurable request throttling
- **CORS Support**: Cross-origin resource sharing configuration
- **Streaming**: Server-sent events for real-time chat responses
- **Health Monitoring**: System health and status endpoints

### Available Endpoints

#### Health Check
```
GET /health
```
Returns system health status and component availability.

#### Agent Status
```
GET /status
```
Returns detailed agent status, extensions, memory, and emotion state.

#### Chat Interface
```
POST /chat
```
Direct chat with the agent.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "context": {
    "sessionId": "session_123",
    "userId": "user_456"
  },
  "options": {
    "includeMemory": true,
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Hello! I'm doing well, thank you for asking...",
  "sessionId": "session_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "tokensUsed": 45,
    "processingTime": 1250,
    "emotion": "curious",
    "memoryUpdated": true
  }
}
```

#### Streaming Chat
```
POST /chat/stream
```
Real-time streaming chat responses using Server-Sent Events.

#### Memory Query
```
POST /memory/query
```
Search agent memory with semantic queries.

**Request Body:**
```json
{
  "query": "conversations about AI",
  "limit": 10,
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  }
}
```

#### Recent Memories
```
GET /memory/recent?limit=10
```
Get the most recent agent memories.

#### Execute Actions
```
POST /actions/execute
```
Execute extension actions programmatically.

**Request Body:**
```json
{
  "extension": "slack",
  "action": "sendMessage",
  "parameters": {
    "channel": "#general",
    "message": "Hello from the agent!"
  }
}
```

#### List Actions
```
GET /actions/list
```
Get all available actions from loaded extensions.

### Configuration

```json
{
  "api": {
    "enabled": true,
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["*"],
      "credentials": false
    },
    "auth": {
      "enabled": false,
      "type": "bearer",
      "secret": "your-secret-token"
    },
    "rateLimit": {
      "enabled": true,
      "windowMs": 900000,
      "maxRequests": 100
    },
    "endpoints": {
      "chat": true,
      "status": true,
      "memory": true,
      "actions": true,
      "health": true
    }
  }
}
```

### Authentication

When authentication is enabled, include the appropriate header:

**Bearer Token:**
```
Authorization: Bearer your-secret-token
```

**API Key:**
```
Authorization: ApiKey your-api-key
```

### Usage Examples

#### Basic Chat
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What can you help me with?",
    "options": {
      "includeMemory": true
    }
  }'
```

#### Query Memory
```bash
curl -X POST http://localhost:3000/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "recent conversations",
    "limit": 5
  }'
```

#### Check Status
```bash
curl http://localhost:3000/status
```

#### Execute Action
```bash
curl -X POST http://localhost:3000/actions/execute \
  -H "Content-Type: application/json" \
  -d '{
    "extension": "mcp",
    "action": "getMcpStatus",
    "parameters": {}
  }'
```

## Integration Benefits

### For Developers

1. **Standardized Integration**: <mcreference link="https://developers.redhat.com/blog/2025/01/22/quick-look-mcp-large-language-models-and-nodejs" index="2">2</mcreference> MCP provides a standard way to integrate with various LLM frameworks
2. **Direct API Access**: HTTP endpoints allow easy integration with web applications
3. **Flexible Authentication**: Multiple auth methods for different security requirements
4. **Real-time Capabilities**: Streaming support for responsive user interfaces

### For AI Applications

1. **Tool Interoperability**: MCP tools work across different AI frameworks
2. **Resource Access**: Standardized way to access agent data and capabilities
3. **Prompt Templates**: Reusable interaction patterns
4. **Multi-modal Support**: Text, image, and binary data handling

### For System Integration

1. **Health Monitoring**: Built-in health checks and status reporting
2. **Rate Limiting**: Protection against abuse and resource exhaustion
3. **CORS Support**: Easy web application integration
4. **Extensible Architecture**: Custom tools and endpoints can be added

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install @modelcontextprotocol/sdk cors express-rate-limit zod
   ```

2. **Update Character Configuration**:
   Add MCP and API configurations to your character file (see examples above).

3. **Start the Agent**:
   ```bash
   npm start
   ```

4. **Test the API**:
   ```bash
   curl http://localhost:3000/health
   ```

5. **Connect MCP Client**:
   Use any MCP-compatible client to connect to the stdio transport.

## Advanced Usage

### Custom MCP Tools

```typescript
// Register a custom tool handler
mcpExtension.registerToolHandler('custom_tool', async (context, params) => {
  // Your custom logic here
  return {
    content: [{
      type: 'text',
      text: 'Custom tool result'
    }]
  }
})
```

### Custom API Endpoints

```typescript
// Add custom routes to the API extension
apiExtension.app.get('/custom', (req, res) => {
  res.json({ message: 'Custom endpoint' })
})
```

### Environment Variables

```bash
# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
API_AUTH_SECRET=your-secret-token

# MCP Configuration
MCP_SERVER_NAME=my-agent
MCP_TRANSPORT=stdio
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the API port in configuration
2. **MCP Connection Failed**: Check transport configuration and client compatibility
3. **Authentication Errors**: Verify token/API key configuration
4. **Rate Limit Exceeded**: Adjust rate limiting settings or implement backoff

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=symindx:mcp,symindx:api
```

### Health Checks

Monitor system health:
```bash
# Check API health
curl http://localhost:3000/health

# Check agent status
curl http://localhost:3000/status
```

## Security Considerations

1. **Enable Authentication**: Always use authentication in production
2. **Configure CORS**: Restrict origins to trusted domains
3. **Rate Limiting**: Implement appropriate rate limits
4. **Input Validation**: All inputs are validated using Zod schemas
5. **Error Handling**: Sensitive information is not exposed in error messages

## Performance Optimization

1. **Memory Management**: Configure appropriate memory retention policies
2. **Connection Pooling**: Use connection pooling for database operations
3. **Caching**: Implement caching for frequently accessed data
4. **Monitoring**: Use health endpoints for system monitoring

## Future Enhancements

1. **WebSocket Support**: Real-time bidirectional communication
2. **GraphQL API**: More flexible query capabilities
3. **Plugin System**: Dynamic loading of custom tools and endpoints
4. **Metrics Collection**: Detailed usage and performance metrics
5. **Multi-agent Support**: Coordination between multiple agents

This integration brings SYMindX into the modern AI ecosystem with standardized protocols and easy-to-use APIs, making it compatible with a wide range of tools and frameworks while maintaining the flexibility and extensibility that makes SYMindX unique.