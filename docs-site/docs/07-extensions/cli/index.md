---
sidebar_position: 1
title: "CLI Extension"
description: "Command-line interface for SYMindX management"
---

# CLI Extension

The SYMindX CLI provides a comprehensive command-line interface for managing agents, viewing system status, and interacting with the runtime. Built with TypeScript and featuring a beautiful terminal UI with colors, animations, and interactive components.

## Overview

The CLI Extension offers powerful tools for:
- **Agent Management**: Create, start, stop, and monitor agents
- **Interactive Chat**: Direct conversation with agents
- **System Monitoring**: Real-time status and health checks
- **Resource Listing**: View agents, modules, extensions, and capabilities
- **Development Tools**: Debugging and diagnostic commands

## Installation & Setup

The CLI is automatically available when you install SYMindX:

```bash
# Install SYMindX globally
npm install -g symindx

# Or run directly with npx
npx symindx --help
```

## Core Commands

### Agent Management

```bash
# List all agents
symindx agent list
symindx agent ls -v  # verbose output

# Show detailed agent information
symindx agent info <agent-id>
symindx agent show nyx

# Start/stop agents
symindx agent start <agent-id>
symindx agent stop <agent-id> --force

# Create new agent interactively
symindx agent create
symindx agent new --template basic
```

### Interactive Chat

```bash
# Start chat session with an agent
symindx chat <agent-id>
symindx chat nyx

# Within chat session:
# - Type messages to talk with the agent
# - /status - Show agent status
# - /commands - List available commands
# - /action <command> - Execute agent actions
# - /exit - Exit chat session
```

### System Status & Monitoring

```bash
# Show overall system status
symindx status
symindx status --verbose

# Show specific agent status
symindx status agent <agent-id>

# Health check with auto-fix option
symindx status health --fix

# Show system capabilities
symindx status capabilities
```

### Resource Listing

```bash
# List agents with filtering
symindx list agents
symindx ls a --status active --type autonomous

# List modules and extensions
symindx list modules --type emotion
symindx list extensions --enabled
symindx ls ext --agent nyx

# List recent commands
symindx list commands --limit 10
symindx ls cmd --agent nyx --status completed
```

### Fun Commands

```bash
# Show the awesome SYMindX banner
symindx banner

# Matrix rain animation
symindx matrix --duration 5000
```

## CLI Features

### Beautiful UI

The CLI features a modern, colorful interface with:
- **Gradient text**: Eye-catching SYMindX branding
- **Status indicators**: ✅❌⚠️ for clear visual feedback
- **Progress spinners**: Real-time operation feedback
- **Tables**: Organized data display
- **Colors**: Syntax highlighting and status colors

### Interactive Elements

- **Confirmation prompts**: Safe operations with user confirmation
- **Selection menus**: Choose from available options
- **Real-time updates**: Live status monitoring
- **Progress bars**: Long-running operation feedback

### Error Handling

- **Graceful failures**: Helpful error messages
- **Auto-recovery**: Suggestions for fixing issues
- **Detailed logging**: Debug information when needed
- **Fallback options**: Alternative approaches when possible

## Usage Examples

### Basic Agent Workflow

```bash
# 1. Check system status
symindx status

# 2. List available agents
symindx list agents

# 3. Start an agent
symindx agent start nyx

# 4. Chat with the agent
symindx chat nyx

# 5. Monitor agent health
symindx status agent nyx
```

### Development Workflow

```bash
# 1. Check system capabilities
symindx status capabilities

# 2. Run health check
symindx status health --fix

# 3. View system resources
symindx list modules
symindx list extensions

# 4. Monitor command execution
symindx list commands --active
```

### Troubleshooting

```bash
# Check system health
symindx status health

# View recent errors
symindx list commands --status failed

# Show detailed agent info
symindx agent info <agent-id> --verbose

# Check extension status
symindx list extensions --agent <agent-id>
```

## Command Reference

### Agent Commands

| Command | Description | Options |
|---------|-------------|---------|
| `agent list` | List all agents | `--status`, `--type`, `--verbose` |
| `agent info <id>` | Show agent details | `--verbose` |
| `agent start <id>` | Start an agent | `--wait` |
| `agent stop <id>` | Stop an agent | `--force` |
| `agent create` | Create new agent | `--template`, `--interactive` |

### Chat Commands

| Command | Description | Options |
|---------|-------------|---------|
| `chat <agent-id>` | Start chat session | `--agent` |

**In-chat commands:**
- `/status` - Show agent status
- `/commands` - List available commands  
- `/action <cmd>` - Execute agent action
- `/exit` - Exit chat session

### Status Commands

| Command | Description | Options |
|---------|-------------|---------|
| `status` | System overview | `--verbose` |
| `status agent <id>` | Agent status | `--detailed` |
| `status health` | Health check | `--fix` |
| `status capabilities` | System capabilities | - |

### List Commands

| Command | Description | Options |
|---------|-------------|---------|
| `list agents` | List agents | `--status`, `--type`, `--verbose` |
| `list modules` | List modules | `--type`, `--available`, `--loaded` |
| `list extensions` | List extensions | `--enabled`, `--agent` |
| `list commands` | List commands | `--agent`, `--status`, `--limit` |

## Configuration

The CLI respects the same configuration as the runtime:

```json
{
  "cli": {
    "defaultAgent": "nyx",
    "autoStart": false,
    "verboseMode": false,
    "colorOutput": true,
    "animations": true
  }
}
```

### Environment Variables

```bash
# Default agent for commands
export SYMINDX_DEFAULT_AGENT=nyx

# Disable colors for CI/CD
export NO_COLOR=1

# Enable debug logging
export DEBUG=symindx:cli
```

## Integration

The CLI integrates seamlessly with:
- **Runtime**: Direct access to agent runtime
- **Extensions**: Execute extension commands
- **APIs**: REST and WebSocket endpoints
- **Development Tools**: Debugging and monitoring

## Advanced Usage

### Scripting

```bash
#!/bin/bash
# Automated agent management script

# Start multiple agents
for agent in nyx aria; do
  symindx agent start $agent --wait
done

# Check health
symindx status health --fix

# Monitor for 1 hour
timeout 3600 symindx status --watch
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Test SYMindX CLI
  run: |
    symindx status health
    symindx list agents --json | jq '.agents[] | .status'
```

---

The CLI Extension provides a powerful, user-friendly interface for managing your SYMindX agents and system. Its rich feature set and intuitive design make it perfect for both development and production use.

**Last updated July 2nd 2025 by SYMBiEX**
