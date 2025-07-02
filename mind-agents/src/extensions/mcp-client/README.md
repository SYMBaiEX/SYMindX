# MCP Client Extension

Connect to external MCP (Model Context Protocol) servers and access their tools, resources, and prompts dynamically.

## Features

- **Dynamic Tool Discovery**: Automatically discover and use tools from MCP servers
- **Resource Access**: Read and process resources from connected servers
- **Prompt Templates**: Access reusable prompt templates from servers
- **AI SDK Integration**: Seamlessly integrate MCP tools with the AI SDK
- **Health Monitoring**: Monitor server health and auto-reconnect
- **Server Management**: Add, remove, and manage multiple MCP servers

## Configuration

```typescript
{
  "name": "mcp-client",
  "enabled": true,
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"],
      "autoReconnect": true,
      "retryAttempts": 3
    },
    {
      "name": "git",
      "command": "mcp-server-git",
      "args": ["--repository", "/path/to/repo"],
      "autoReconnect": true
    }
  ],
  "globalTimeout": 30000,
  "maxRetries": 3,
  "enableAutoReconnect": true,
  "aiSDKIntegration": true
}
```

## Usage

### Basic Tool Execution

```typescript
const mcpClient = agent.getExtension('mcp-client')

// Execute a tool
const result = await mcpClient.executeTool('filesystem:read_file', {
  path: '/path/to/file.txt'
})

// Read a resource
const resource = await mcpClient.readResource('file:///path/to/resource')

// Get a prompt template
const prompt = await mcpClient.getPrompt('git:commit_message', {
  changes: 'Added new feature'
})
```

### Server Management

```typescript
// Add a new server
await mcpClient.addServer({
  name: 'database',
  command: 'mcp-server-postgres',
  args: ['--connection-string', 'postgresql://...'],
  autoReconnect: true
})

// Remove a server
await mcpClient.removeServer('database')

// Check server status
const status = mcpClient.getServerStatus()
console.log(status)
```

### Available Tools

```typescript
// Get all available tools
const tools = mcpClient.getAvailableTools()

for (const [toolName, tool] of tools) {
  console.log(`Tool: ${toolName}`)
  console.log(`Description: ${tool.description}`)
  console.log(`Server: ${tool.server}`)
}
```

## MCP Server Examples

### Filesystem Server
Provides file system operations like reading, writing, and listing files.

```bash
npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/directory
```

### Git Server
Provides Git operations like status, commit, and branch management.

```bash
npx -y @modelcontextprotocol/server-git --repository /path/to/repo
```

### SQLite Server
Provides database operations for SQLite databases.

```bash
npx -y @modelcontextprotocol/server-sqlite --db-path /path/to/database.db
```

### Brave Search Server
Provides web search capabilities through Brave Search API.

```bash
npx -y @modelcontextprotocol/server-brave-search
```

## Tool Categories

MCP tools are automatically categorized for better organization:

- **File Operations**: read_file, write_file, list_files
- **Git Operations**: git_status, git_commit, git_branch
- **Database**: query, insert, update, delete
- **Search**: web_search, image_search
- **System**: exec, ps, env

## Error Handling

The extension includes comprehensive error handling:

- **Connection Failures**: Automatic retry with exponential backoff
- **Tool Execution Errors**: Detailed error messages and fallback options
- **Health Monitoring**: Periodic health checks with auto-reconnection
- **Timeout Handling**: Configurable timeouts for all operations

## Security Considerations

- **Sandboxing**: MCP servers run in isolated processes
- **Resource Limits**: Configurable timeouts and resource limits
- **Access Control**: Tools can be filtered by category or permission level
- **Audit Logging**: All tool executions are logged for security auditing

## Performance

- **Connection Pooling**: Reuse connections for better performance
- **Caching**: Cache tool schemas and server capabilities
- **Parallel Execution**: Execute multiple tools concurrently when possible
- **Health Checks**: Efficient health monitoring with minimal overhead

## Troubleshooting

### Common Issues

1. **Server Not Starting**
   - Check that the MCP server executable is available
   - Verify command and arguments are correct
   - Check environment variables and permissions

2. **Connection Timeouts**
   - Increase globalTimeout in configuration
   - Check network connectivity to server
   - Verify server is responding to requests

3. **Tool Execution Failures**
   - Validate tool arguments against schema
   - Check server logs for detailed error messages
   - Ensure required permissions are granted

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
{
  "name": "mcp-client",
  "enabled": true,
  "debug": true,
  "servers": [...]
}
```

## API Reference

### MCPClientExtension

#### Methods

- `addServer(config: MCPServerConfig): Promise<void>`
- `removeServer(serverName: string): Promise<void>`
- `getAvailableTools(): Map<string, MCPTool>`
- `getAvailableResources(): Map<string, MCPResource>`
- `getAvailablePrompts(): Map<string, MCPPrompt>`
- `executeTool(toolName: string, args: Record<string, any>): Promise<any>`
- `readResource(resourceUri: string): Promise<any>`
- `getPrompt(promptName: string, args?: Record<string, any>): Promise<string>`
- `getServerStatus(): Array<ServerStatus>`

### Types

See `types.ts` for complete type definitions including:
- `MCPServerConfig`
- `MCPTool`
- `MCPResource`
- `MCPPrompt`
- `MCPToolResult`