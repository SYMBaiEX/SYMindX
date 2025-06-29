# SYMindX CLI and Web Interfaces

This document describes the comprehensive CLI and Web interfaces for human interaction with autonomous agents in SYMindX.

## Overview

The SYMindX system now provides two main interfaces for human interaction:

1. **Command Line Interface (CLI)** - Terminal-based interaction with full agent management capabilities
2. **Web Interface** - Browser-based dashboard with real-time monitoring and chat functionality

Both interfaces are built on top of a unified **Command System** that handles agent instruction processing, queuing, and execution.

## Command Line Interface (CLI)

### Installation and Setup

```bash
# Build the project
bun build

# Install CLI globally (optional)
npm link

# Run CLI directly
bun cli

# Or use the npm script
npm run cli
```

### CLI Commands

#### Core Commands

```bash
# Interactive mode with menu-driven interface
symindx interactive
symindx i

# Quick chat with an agent
symindx quick-chat "Hello there!" --agent agent_123

# Start/stop runtime
symindx start-runtime
symindx stop-runtime
```

#### Agent Management

```bash
# List all agents
symindx agent list
symindx agent ls -v  # verbose output
symindx a ls -s active  # filter by status

# Start/stop agents
symindx agent start <agentId>
symindx agent stop <agentId> --force
symindx agent restart <agentId>

# Create new agents
symindx agent create  # interactive
symindx agent create --template autonomous
symindx agent create --file ./my-agent.json

# Remove agents
symindx agent remove <agentId>
symindx agent rm <agentId> --force

# Agent information
symindx agent info <agentId>
symindx agent config <agentId>
```

#### Interactive Chat

```bash
# Start chat session
symindx chat start [agentId]
symindx c start --websocket  # use WebSocket for real-time

# Send single messages
symindx chat message <agentId> "Hello!"
symindx chat msg <agentId> "What's your status?" --wait

# Send commands
symindx chat command <agentId> "/action get_status"
symindx chat cmd <agentId> "!memory search recent" --priority high

# View chat history
symindx chat history [agentId] --limit 50
```

#### System Monitoring

```bash
# Monitor specific agent
symindx monitor agent <agentId>
symindx m agent <agentId> --events --performance

# Monitor all agents
symindx monitor all
symindx monitor all --filter "agent_updates" --verbose

# Monitor system events
symindx monitor events --type "command_*" --limit 100

# Performance monitoring
symindx monitor performance --interval 3000
symindx monitor perf --agent <agentId>

# Command monitoring
symindx monitor commands --agent <agentId> --status pending

# Tail logs
symindx monitor logs --follow
```

#### Status and Information

```bash
# System overview
symindx status

# Detailed system status
symindx status system --verbose
symindx status runtime
symindx status health --fix

# Agent status
symindx status agent <agentId>

# System capabilities
symindx status capabilities --json
```

#### List Resources

```bash
# List agents
symindx list agents --verbose --status active
symindx ls a --type autonomous --json

# List modules
symindx list modules --type emotion
symindx ls m --available

# List extensions
symindx list extensions --enabled
symindx ls ext --agent <agentId>

# List commands
symindx list commands --agent <agentId> --limit 50
symindx ls cmd --active --status processing

# List portals
symindx list portals --configured

# List events
symindx list events --type "system_*" --limit 20

# List capabilities
symindx list capabilities --json
```

### Interactive Chat Features

When in chat mode, you can use special commands:

```bash
/help          # Show available commands
/exit          # Exit chat
/status        # Show agent status
/emotion       # Show agent emotion
/switch <id>   # Switch to different agent
/clear         # Clear screen
/memory <query> # Query agent memory
/commands      # Show available agent commands
```

## Web Interface

### Access

Once the API extension is running:

```bash
# Start the runtime with API extension
bun start

# Access web interface
http://localhost:3000/ui
```

### Web Interface Features

#### 1. Dashboard (`/ui/`)

- **System Overview**: Runtime status, uptime, memory usage
- **Agent Summary**: Total agents, status distribution
- **Command Statistics**: Success rates, active commands
- **Quick Actions**: Direct links to chat, agent management, monitoring

#### 2. Chat Interface (`/ui/chat`)

- **Real-time Chat**: WebSocket-based chat with agents
- **Agent Sidebar**: List of available agents with status indicators
- **Message History**: Persistent chat history per agent
- **Connection Status**: Live connection status indicator
- **Multi-agent Support**: Easy switching between agents

#### 3. Agent Management (`/ui/agents`)

- **Agent Cards**: Visual representation of each agent
- **Status Indicators**: Real-time status, emotion, and activity
- **Extension Management**: View enabled/disabled extensions
- **Quick Actions**: Chat, view details, restart, remove agents
- **Agent Creation**: Guided agent creation process

#### 4. System Monitor (`/ui/monitor`)

- **Real-time Metrics**: System resources, memory, uptime
- **Agent Monitoring**: Live agent status and performance
- **Command Statistics**: Success rates, execution times
- **Recent Commands**: Live command execution log
- **Auto-refresh**: Configurable automatic updates

### WebSocket API

The enhanced WebSocket server provides real-time communication:

#### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

#### Message Types

```javascript
// Chat with agent
ws.send(JSON.stringify({
  type: 'chat',
  targetAgent: 'agent_123',
  data: { message: 'Hello!' }
}));

// Execute command
ws.send(JSON.stringify({
  type: 'command',
  targetAgent: 'agent_123',
  data: { command: '/action get_status' },
  priority: 'high'
}));

// Subscribe to updates
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { topic: 'agent_updates' }
}));

// Request status
ws.send(JSON.stringify({
  type: 'status',
  data: { agentId: 'agent_123' }
}));

// Start monitoring
ws.send(JSON.stringify({
  type: 'monitor',
  data: { 
    action: 'start',
    topics: ['agent_updates', 'command_updates']
  }
}));
```

## Command System

### Architecture

The unified Command System handles all agent interactions:

```typescript
// Command types
enum CommandType {
  CHAT = 'chat',
  ACTION = 'action', 
  MEMORY_QUERY = 'memory_query',
  MEMORY_STORE = 'memory_store',
  STATUS = 'status',
  CONTROL = 'control'
}

// Priority levels
enum CommandPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}
```

### Command Parsing

The system automatically parses different command formats:

- **Chat messages**: Regular text becomes chat commands
- **Action commands**: `/action <name>` or `!action <name>`
- **Memory queries**: `/memory <query>` or `/remember <query>`
- **Status requests**: `/status` or `/info`
- **Control commands**: `/pause`, `/resume`, `/stop`
- **Memory storage**: `/store <content>`

### Integration

Both CLI and Web interfaces use the same Command System:

```typescript
// Send a command
const command = await commandSystem.sendCommand(
  agentId,
  'Hello, how are you?',
  { 
    priority: CommandPriority.NORMAL,
    async: false 
  }
);

// Get command result
if (command.result?.success) {
  console.log(command.result.response);
}
```

## Configuration

### Runtime Configuration

Add to your `config/runtime.json`:

```json
{
  "extensions": {
    "api": {
      "enabled": true,
      "settings": {
        "port": 3000,
        "websocket": {
          "enabled": true,
          "path": "/ws"
        }
      }
    }
  }
}
```

### Environment Variables

```bash
# API Configuration
SYMINDX_API_URL=http://localhost:3000
SYMINDX_WS_URL=ws://localhost:3000/ws
SYMINDX_AUTO_CONNECT=true
SYMINDX_DEFAULT_AGENT=agent_123
SYMINDX_VERBOSE=true

# Disable colors in CLI
NO_COLOR=true
```

## Usage Examples

### 1. Quick Agent Chat via CLI

```bash
# Start interactive chat
symindx chat start

# Select agent from list
# Type messages normally
# Use /commands to see available actions
# Use /exit to quit
```

### 2. System Monitoring

```bash
# Real-time monitoring of all agents
symindx monitor all --verbose

# Performance monitoring with 3-second updates
symindx monitor performance --interval 3000

# Command execution monitoring
symindx monitor commands --active
```

### 3. Agent Management Workflow

```bash
# List current agents
symindx agent list --verbose

# Create a new autonomous agent
symindx agent create --template autonomous

# Start the agent
symindx agent start <new-agent-id> --wait

# Chat with the agent
symindx chat start <new-agent-id>

# Monitor the agent
symindx monitor agent <new-agent-id> --events --performance
```

### 4. Web-based Interaction

1. Open `http://localhost:3000/ui` in browser
2. View system dashboard for overview
3. Go to Chat interface
4. Select an agent from sidebar
5. Start chatting in real-time
6. Monitor system via Monitor page

## Features Summary

### CLI Interface
- ✅ Interactive menu-driven interface
- ✅ Comprehensive agent management
- ✅ Real-time chat with agents
- ✅ System monitoring and logging
- ✅ Command execution and queuing
- ✅ Status reporting and health checks
- ✅ WebSocket integration
- ✅ Configurable output and colors

### Web Interface  
- ✅ Real-time dashboard
- ✅ Interactive chat interface
- ✅ Agent status monitoring
- ✅ System metrics display
- ✅ Command execution tracking
- ✅ WebSocket live updates
- ✅ Responsive design
- ✅ Multi-agent support

### Command System
- ✅ Unified command processing
- ✅ Priority-based queuing
- ✅ Asynchronous execution
- ✅ Progress tracking
- ✅ Error handling
- ✅ WebSocket integration
- ✅ Command parsing
- ✅ Result management

## Development and Extension

### Adding New CLI Commands

```typescript
// In src/cli/commands/my-command.ts
export class MyCommand {
  getCommand(): Command {
    return new Command('my-command')
      .description('My custom command')
      .action(async () => {
        // Implementation
      });
  }
}
```

### Adding WebSocket Message Types

```typescript
// In src/extensions/api/websocket.ts
case 'my_message_type':
  await this.handleMyMessage(connectionId, message);
  break;
```

### Adding Web Interface Pages

```typescript
// In src/extensions/api/webui/index.ts
this.app.get('/my-page', (req, res) => {
  res.send(this.generateMyPageHTML());
});
```

The CLI and Web interfaces provide comprehensive tools for interacting with autonomous agents, from simple chat conversations to complex system administration and monitoring tasks.