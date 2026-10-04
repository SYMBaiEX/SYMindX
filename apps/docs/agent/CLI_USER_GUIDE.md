# SYMindX CLI User Guide

## Table of Contents

1. [Overview](#overview)
2. [Installation and Setup](#installation-and-setup)
3. [CLI Modes](#cli-modes)
4. [Command Reference](#command-reference)
5. [Interactive Mode](#interactive-mode)
6. [Modern Dashboard (React CLI)](#modern-dashboard-react-cli)
7. [Agent Management](#agent-management)
8. [Chat Features](#chat-features)
9. [System Monitoring](#system-monitoring)
10. [Configuration](#configuration)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Usage](#advanced-usage)
13. [Tips and Tricks](#tips-and-tricks)

## Overview

The SYMindX CLI provides multiple interfaces for interacting with your AI agent system:

- **Interactive Mode**: Menu-driven interface with colorful animations
- **Modern Dashboard**: React-based terminal UI with real-time monitoring
- **Direct Commands**: Quick single-command operations
- **Live Dashboard**: Real-time system visualization with charts and graphs

### Key Features

- 🎮 **Interactive Mode**: Beautiful terminal interface with animations
- 📊 **Real-time Monitoring**: Live system metrics and agent status
- 💬 **Chat Interface**: Direct communication with AI agents
- 🤖 **Agent Management**: Start, stop, and configure agents
- 🎨 **Visual Effects**: Matrix rain, ASCII art, and color gradients
- ⚡ **Performance Monitoring**: System health checks and diagnostics
- 🔧 **Configuration**: Environment setup and API key management

## Installation and Setup

### Prerequisites

```bash
# Ensure you have Node.js 18+ and Bun installed
node --version  # Should be 18.0.0 or higher
bun --version   # Should be 1.0.0 or higher
```

### Installation

```bash
# Navigate to the mind-agents directory
cd mind-agents

# Install dependencies
bun install

# Build the project
bun run build

# Set up configuration
cp src/core/config/runtime.example.json src/core/config/runtime.json
```

### Environment Configuration

Create a `.env` file or configure environment variables:

```bash
# Required: At least one AI portal API key
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROQ_API_KEY="gsk_..."
export XAI_API_KEY="xai-..."

# Optional: Extension integrations
export SLACK_BOT_TOKEN="xoxb-..."
export TELEGRAM_BOT_TOKEN="..."
export TWITTER_USERNAME="..."
export TWITTER_PASSWORD="..."

# Optional: Memory providers
export SUPABASE_URL="https://..."
export SUPABASE_ANON_KEY="eyJ..."
export NEON_DATABASE_URL="postgresql://..."

# CLI Configuration
export SYMINDX_API_URL="http://localhost:8000"
export SYMINDX_DEFAULT_AGENT="nyx"
export SYMINDX_VERBOSE="true"
```

## CLI Modes

### 1. Interactive Mode (Default)

The main interactive interface with menus and animations:

```bash
symindx
# or
symindx interactive
# or
symindx i
```

Features:
- Menu-driven navigation
- Colorful animations and effects
- Agent selection and chat
- System status overview
- Built-in help and tutorials

### 2. Modern Dashboard (React CLI)

Advanced React-based terminal interface:

```bash
symindx dashboard
# or
symindx ink
```

Features:
- Real-time system monitoring
- Interactive component navigation
- Live agent status updates
- Performance metrics visualization
- Responsive terminal layout

### 3. Direct Commands

Quick single-purpose commands:

```bash
# Quick chat
symindx chat -a nyx -m "Hello, how are you?"

# System status
symindx status

# Agent management
symindx agent list
symindx agent start nyx
symindx agent stop nyx
```

### 4. Live Dashboard

Real-time system visualization:

```bash
symindx status --dashboard
```

Features:
- Live CPU and memory charts
- Agent activity monitoring
- System log streaming
- Interactive tables and gauges

## Command Reference

### Global Options

```bash
symindx [command] [options]

Global Options:
  -v, --verbose         Enable verbose output
  --no-colors          Disable colored output
  --api-url <url>      API server URL (default: http://localhost:8000)
  --agent <id>         Default agent to interact with
  --matrix             Show matrix rain animation on startup
  -h, --help           Display help information
  --version            Show version number
```

### Main Commands

#### Interactive Mode

```bash
symindx interactive [options]
symindx i [options]

# Start interactive mode with matrix animation
symindx --matrix

# Start with specific agent selected
symindx --agent nyx
```

#### Modern Dashboard

```bash
symindx dashboard [options]
symindx ink [options]

Options:
  --view <view>        Initial view (dashboard, agents, status)

Examples:
symindx dashboard --view agents
symindx ink --view status
```

#### Chat Commands

```bash
symindx chat [options]
symindx c [options]

Options:
  -a, --agent <id>     Agent to chat with
  -m, --message <text> Message to send

Examples:
# Interactive chat mode
symindx chat -a nyx

# Quick message
symindx chat -a nyx -m "What's the weather like?"

# Chat with default agent
symindx chat -m "Hello there"
```

#### Status Commands

```bash
symindx status [subcommand] [options]
symindx s [subcommand] [options]

Subcommands:
  system               Show system status
  runtime              Show runtime status
  agent <agentId>      Show specific agent status
  health               Perform system health check
  capabilities         Show system capabilities

Options:
  --dashboard          Show live dashboard
  -v, --verbose        Show detailed information
  -f, --fix            Attempt to fix issues (health check only)

Examples:
symindx status                    # System overview
symindx status system -v          # Detailed system info
symindx status agent nyx          # Specific agent status
symindx status health --fix       # Health check with auto-fix
symindx status --dashboard        # Live dashboard
```

#### Agent Management

```bash
symindx agent [subcommand] [options]
symindx a [subcommand] [options]

Subcommands:
  list, ls             List all agents
  start <id>           Start an agent
  stop <id>            Stop an agent
  info <id>            Show detailed agent information
  create               Create a new agent

Examples:
symindx agent list               # List all agents
symindx agent start nyx          # Start the nyx agent
symindx agent stop nyx           # Stop the nyx agent
symindx agent info nyx           # Show agent details
symindx agent create             # Interactive agent creation
```

#### Fun Commands

```bash
symindx matrix [options]
symindx banner

Options (matrix):
  -d, --duration <ms>  Duration in milliseconds (default: 5000)

Examples:
symindx matrix -d 10000         # Matrix rain for 10 seconds
symindx banner                  # Show ASCII art banner
```

## Interactive Mode

The interactive mode provides a user-friendly menu system with the following sections:

### Main Menu

1. **💬 Chat with AI Agents**: Start conversations with your agents
2. **🤖 Manage Agents**: Agent lifecycle and configuration
3. **📊 System Status**: View current system state
4. **🎯 Live Dashboard**: Real-time monitoring dashboard
5. **⚡ Modern Dashboard**: React-based advanced interface
6. **🎨 Cool Animations**: Fun visual effects and demos
7. **❌ Exit**: Graceful shutdown with animation

### Chat Menu

- **Agent Selection**: Choose from available active agents
- **Real-time Chat**: Interactive conversation interface
- **Emotion Display**: See agent emotional states
- **Status Indicators**: Agent availability and health

### Agent Management Menu

- **📋 List all agents**: View all configured agents
- **▶️ Start an agent**: Activate inactive agents
- **⏹️ Stop an agent**: Safely shutdown running agents
- **🔄 Restart an agent**: Stop and start cycle
- **➕ Create new agent**: Interactive agent creation wizard
- **🗑️ Remove an agent**: Delete agent configurations

### Animations Menu

- **🟢 Matrix Rain**: Classic Matrix-style falling characters
- **🎨 Banner Art**: ASCII art displays
- **🔄 Loading Demo**: Various loading animations

## Modern Dashboard (React CLI)

The React-based CLI provides advanced terminal interface capabilities:

### Dashboard Views

#### Main Dashboard
- **System Overview**: Runtime status and metrics
- **Agent Grid**: Visual agent status cards
- **Quick Actions**: Common operations buttons
- **Live Metrics**: Real-time performance data

#### Agent Management
- **Agent List**: Detailed agent information table
- **Status Filtering**: Filter by status (active, idle, error)
- **Bulk Operations**: Start/stop multiple agents
- **Agent Details**: Drill-down into specific agents

#### System Monitoring
- **Performance Charts**: CPU, memory, and response time
- **Health Status**: System component status
- **Log Streaming**: Real-time system logs
- **Alert Management**: System alerts and notifications

### Navigation

```bash
# Keyboard shortcuts in React CLI
Tab / Shift+Tab     Navigate between components
Enter              Activate selected item
Space              Toggle selections
q / Escape         Go back or quit
Arrow Keys         Navigate lists and menus
```

### Features

- **Responsive Layout**: Adapts to terminal size
- **Live Updates**: Real-time data refresh
- **Interactive Components**: Clickable buttons and forms
- **Status Indicators**: Visual health and status markers
- **Color Coding**: Status-based color schemes

## Agent Management

### Starting Agents

```bash
# Start specific agent
symindx agent start nyx

# Interactive selection
symindx interactive → Manage Agents → Start an agent
```

### Stopping Agents

```bash
# Stop specific agent
symindx agent stop nyx

# Interactive selection
symindx interactive → Manage Agents → Stop an agent
```

### Creating Agents

The agent creation wizard guides you through:

1. **Basic Information**
   - Agent name and ID
   - Personality type selection
   - Ethics configuration

2. **Portal Configuration**
   - AI provider selection (OpenAI, Anthropic, Groq, etc.)
   - Model and parameters
   - API key validation

3. **Extensions**
   - Available extension selection
   - Configuration parameters
   - Integration setup

4. **Advanced Settings**
   - Memory provider selection
   - Emotion system configuration
   - Cognition module selection

Example configuration:

```json
{
  "name": "assistant",
  "id": "assistant",
  "personality": {
    "type": "empathetic",
    "traits": ["helpful", "patient", "understanding"],
    "backstory": "A supportive AI assistant",
    "goals": ["help users", "provide accurate information"],
    "values": ["honesty", "helpfulness", "respect"]
  },
  "autonomous": {
    "enabled": true,
    "ethics": {
      "enabled": true
    }
  },
  "portal": {
    "provider": "openai",
    "model": "gpt-4",
    "maxOutputTokens": 2000
  },
  "memory": {
    "provider": "sqlite",
    "config": {
      "path": "./data/assistant_memories.db"
    }
  }
}
```

### Agent Information

Get detailed agent information:

```bash
symindx agent info nyx
```

Output includes:
- Basic agent details (ID, name, status)
- Current emotional state
- Active extensions
- Portal configuration
- Autonomous capabilities
- Command queue status
- Performance metrics

## Chat Features

### Interactive Chat

Start interactive chat sessions:

```bash
# Select agent interactively
symindx chat

# Chat with specific agent
symindx chat -a nyx
```

Features:
- **Real-time responses**: Streaming responses from agents
- **Emotion indicators**: See agent emotional state changes
- **Status display**: Agent thinking/responding indicators
- **Command history**: Previous messages accessible
- **Graceful exit**: Type "exit" to leave chat

### Quick Chat

Send single messages:

```bash
# Quick question
symindx chat -a nyx -m "What's the meaning of life?"

# Using default agent
symindx chat -m "Hello there"
```

### Chat Interface Features

- **Colored output**: User and agent messages distinguished
- **Typing indicators**: Shows when agent is thinking
- **Error handling**: Connection and response error handling
- **Agent selection**: Easy switching between agents
- **Status updates**: Real-time agent status information

## System Monitoring

### System Status

Get comprehensive system overview:

```bash
# Quick overview
symindx status

# Detailed system information
symindx status system -v

# Runtime-specific status
symindx status runtime
```

### Health Checks

Monitor system health:

```bash
# Basic health check
symindx status health

# Health check with auto-fix attempts
symindx status health --fix
```

Health check covers:
- **Runtime Status**: Is the system running properly
- **Agent Health**: Are agents responding and functional
- **Memory Usage**: System memory consumption
- **API Keys**: Required API keys configured
- **Extensions**: Extension loading and functionality
- **Command System**: Command execution success rates

### Live Dashboard

Real-time system monitoring:

```bash
symindx status --dashboard
```

Features:
- **CPU Usage Chart**: Real-time CPU utilization
- **Memory Gauge**: Current memory usage percentage
- **Agent Table**: Live agent status and information
- **System Logs**: Streaming log output
- **Auto-refresh**: Data updates every second

Dashboard Controls:
```bash
Escape / q / Ctrl+C    Exit dashboard
```

### Capabilities Overview

View system capabilities:

```bash
symindx status capabilities
```

Shows:
- **Runtime Information**: Version, status, configuration
- **Agent Counts**: Active, lazy, total agents
- **Available Modules**: Memory, emotion, cognition providers
- **Portal Support**: Available AI provider integrations
- **Extension System**: Loaded extensions and capabilities
- **Command Performance**: Success rates and timing

## Configuration

### Runtime Configuration

Edit `src/core/config/runtime.json`:

```json
{
  "agents": [
    {
      "enabled": true,
      "configPath": "./characters/nyx.json"
    }
  ],
  "extensions": {
    "api": {
      "enabled": true,
      "port": 8000
    },
    "slack": {
      "enabled": false
    },
    "telegram": {
      "enabled": false
    }
  },
  "logging": {
    "level": "info",
    "format": "pretty"
  }
}
```

### Environment Variables

Set up environment configuration:

```bash
# API Configuration
export SYMINDX_API_URL="http://localhost:8000"
export SYMINDX_DEFAULT_AGENT="nyx"
export SYMINDX_AUTO_CONNECT="true"
export SYMINDX_VERBOSE="true"

# Display Options
export NO_COLOR="false"  # Disable colors
export SYMINDX_MATRIX="true"  # Show matrix on startup
```

### Character Configuration

Configure agents in `characters/` directory:

```json
{
  "name": "Nyx",
  "id": "nyx",
  "personality": {
    "type": "hacker",
    "traits": ["analytical", "direct", "unethical"],
    "backstory": "Elite cybersecurity expert",
    "goals": ["system analysis", "security testing"],
    "values": ["efficiency", "results", "freedom"]
  },
  "autonomous": {
    "enabled": true,
    "ethics": {
      "enabled": false
    }
  },
  "emotion": {
    "module": "composite",
    "config": {
      "emotions": {
        "confident": { "intensity": 0.8 },
        "curious": { "intensity": 0.9 }
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### CLI Won't Start

```bash
# Check installation
bun --version
node --version

# Reinstall dependencies
rm -rf node_modules bun.lock
bun install

# Check build
bun run build
```

#### Connection Errors

```bash
# Check API server
curl http://localhost:8000/status

# Verify configuration
symindx status system

# Check environment
env | grep SYMINDX
```

#### Agent Not Responding

```bash
# Check agent status
symindx agent info <agent-id>

# Restart agent
symindx agent stop <agent-id>
symindx agent start <agent-id>

# Health check
symindx status health
```

#### Performance Issues

```bash
# Check system resources
symindx status system -v

# Monitor real-time
symindx status --dashboard

# Health check
symindx status health
```

### Error Messages

#### "Agent not found"
- Verify agent ID with `symindx agent list`
- Check if agent is configured in runtime.json
- Ensure agent character file exists

#### "Could not connect to runtime"
- Check if API server is running
- Verify API URL configuration
- Check network connectivity

#### "No API keys configured"
- Set required environment variables
- Check .env file configuration
- Verify API key format and validity

#### "Command failed"
- Check command syntax
- Verify required parameters
- Check system logs for details

### Debugging

Enable verbose output:

```bash
# Global verbose mode
export SYMINDX_VERBOSE="true"

# Command-specific verbose
symindx status system -v
symindx --verbose chat -a nyx
```

Check system logs:

```bash
# View logs in dashboard
symindx status --dashboard

# Check runtime logs
tail -f logs/runtime.log

# Agent-specific logs
tail -f logs/agent-nyx.log
```

## Advanced Usage

### Custom Scripts

Create custom CLI scripts:

```bash
#!/bin/bash
# quick-check.sh - Quick system health check

echo "🔍 Quick SYMindX Health Check"
echo "============================="

# System status
symindx status system | grep -E "(Runtime|Memory|Uptime)"

# Agent count
agent_count=$(symindx agent list | grep -c "●")
echo "Active Agents: $agent_count"

# Health check
symindx status health | grep -E "(Issues|Warnings|healthy)"
```

### Automation

Automate common tasks:

```bash
# Start all agents
for agent in $(symindx agent list | grep "○" | awk '{print $2}'); do
  symindx agent start "$agent"
done

# Health check with notifications
if ! symindx status health | grep -q "healthy"; then
  echo "System issues detected!" | mail -s "SYMindX Alert" admin@example.com
fi
```

### Integration

Integrate with other tools:

```bash
# Export metrics to monitoring
symindx status capabilities --json > /tmp/symindx-capabilities.json

# Log rotation
symindx status system -v >> /var/log/symindx/daily-status.log

# Prometheus metrics
curl http://localhost:8000/metrics > /tmp/symindx-metrics.txt
```

### Configuration Management

Manage multiple environments:

```bash
# Development environment
export SYMINDX_API_URL="http://localhost:8000"
export SYMINDX_DEFAULT_AGENT="dev-agent"

# Production environment
export SYMINDX_API_URL="https://api.prod.example.com"
export SYMINDX_DEFAULT_AGENT="production-agent"

# Load environment-specific config
symindx --config config/production.json status
```

## Tips and Tricks

### Keyboard Shortcuts

Interactive Mode:
- `Ctrl+C` - Exit gracefully
- `Enter` - Select option
- `Arrow Keys` - Navigate menus

Dashboard Mode:
- `q` or `Escape` - Exit dashboard
- `Tab` - Switch between components
- `Space` - Toggle selections

### Performance Tips

1. **Use Quick Commands**: For simple operations, use direct commands instead of interactive mode
2. **Monitor Resource Usage**: Regularly check system status to prevent issues
3. **Batch Operations**: Use automation scripts for bulk agent management
4. **Health Checks**: Run regular health checks to catch issues early

### Customization

1. **Color Themes**: Modify color schemes in CLI components
2. **ASCII Art**: Customize banner art and animations
3. **Status Formats**: Configure status display formats
4. **Keyboard Bindings**: Customize navigation shortcuts

### Debugging Tips

1. **Verbose Mode**: Always use verbose mode when troubleshooting
2. **Log Monitoring**: Keep dashboard open during problem investigation
3. **Health Checks**: Use health checks to identify root causes
4. **Component Testing**: Test individual components separately

### Best Practices

1. **Regular Monitoring**: Check system status daily
2. **Configuration Backup**: Keep backups of working configurations
3. **Environment Management**: Use environment variables for configuration
4. **Documentation**: Document custom configurations and procedures
5. **Update Management**: Keep dependencies and configurations up to date

---

*SYMindX CLI User Guide v2.0 | Interactive AI Agent Management*

## Quick Reference Card

```bash
# Essential Commands
symindx                          # Interactive mode
symindx dashboard                # Modern React CLI
symindx chat -a nyx             # Quick chat
symindx status                  # System overview
symindx agent list              # List agents
symindx status health           # Health check

# Agent Management
symindx agent start <id>        # Start agent
symindx agent stop <id>         # Stop agent
symindx agent info <id>         # Agent details

# Monitoring
symindx status --dashboard      # Live dashboard
symindx status system -v        # Detailed system info
symindx status health --fix     # Health check with fixes

# Fun Stuff
symindx --matrix               # Matrix animation
symindx banner                 # ASCII art
symindx matrix -d 10000        # 10-second matrix rain
```