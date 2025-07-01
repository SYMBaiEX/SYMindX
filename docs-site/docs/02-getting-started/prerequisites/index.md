---
sidebar_position: 1
sidebar_label: "Prerequisites"
title: "Prerequisites"
description: "System requirements and dependencies"
---

# Prerequisites

System requirements and dependencies

## System Requirements

Before installing SYMindX, ensure your system meets the following requirements. SYMindX is designed to be lightweight and run on most modern systems, but certain features may require specific configurations.

## Runtime Environment

### Option 1: Bun (Recommended)
- **Version**: Latest stable release
- **Why Bun?**: Faster installation, built-in TypeScript support, better performance
- **Installation**: 
  ```bash
  # macOS, Linux, WSL
  curl -fsSL https://bun.sh/install | bash
  
  # Verify installation
  bun --version
  ```

### Option 2: Node.js
- **Version**: 18.0.0 or higher (LTS recommended)
- **NPM**: 8.0.0 or higher
- **Installation**:
  ```bash
  # Check current version
  node --version
  npm --version
  
  # Install via Node Version Manager (recommended)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install 18
  nvm use 18
  ```

## Operating System

SYMindX supports all major operating systems:

### Windows
- Windows 10 version 1903+ or Windows 11
- Windows Subsystem for Linux (WSL2) recommended for best performance
- PowerShell 5.1+ or Windows Terminal

### macOS
- macOS 10.15 (Catalina) or later
- Xcode Command Line Tools required:
  ```bash
  xcode-select --install
  ```

### Linux
- Ubuntu 20.04+, Debian 10+, Fedora 34+, or equivalent
- Build essentials required:
  ```bash
  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install build-essential
  
  # Fedora
  sudo dnf groupinstall "Development Tools"
  ```

## Database Requirements

SYMindX supports multiple database backends. Choose based on your needs:

### SQLite (Default)
- **Included**: No additional installation required
- **Use case**: Development, testing, single-agent deployments
- **Storage**: Local file system
- **Performance**: Good for up to 100k memory records

### PostgreSQL
- **Version**: 12.0 or higher
- **Use case**: Production, multi-agent deployments
- **Installation**:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install postgresql
  
  # macOS
  brew install postgresql
  ```

### Cloud Databases (Optional)
- **Supabase**: Free tier available, built on PostgreSQL
- **Neon**: Serverless PostgreSQL, great for scalability
- **Requirements**: Account and project creation on respective platforms

## AI Provider Requirements

You'll need at least one AI provider API key:

### Supported Providers
1. **OpenAI**
   - GPT-4, GPT-3.5 Turbo support
   - Sign up at: https://platform.openai.com
   - Pricing: Pay-per-token usage

2. **Anthropic**
   - Claude 3 Opus, Sonnet, Haiku support
   - Sign up at: https://console.anthropic.com
   - Pricing: Pay-per-token usage

3. **Groq**
   - Fast inference for open models
   - Sign up at: https://console.groq.com
   - Free tier available

4. **xAI**
   - Grok model support
   - Sign up at: https://x.ai
   - Limited availability

### API Key Setup
Store your API keys securely:
```bash
# Option 1: Environment variables (recommended)
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Option 2: In runtime.json configuration
{
  "portals": {
    "openai": {
      "apiKey": "sk-..."
    }
  }
}
```

## Hardware Requirements

### Minimum Specifications
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 1 GB free space
- **Network**: Stable internet connection

### Recommended Specifications
- **CPU**: 4+ cores, 3.0 GHz
- **RAM**: 8 GB or more
- **Storage**: 10 GB free space (for logs and memory storage)
- **Network**: Low-latency connection for real-time interactions

## Development Tools (Optional)

For the best development experience:

### Code Editor
- **VS Code**: Recommended for TypeScript IntelliSense
- **Cursor**: AI-powered coding assistant
- **WebStorm**: Full IDE support

### Version Control
- **Git**: Version 2.20 or higher
- **GitHub CLI**: Optional but helpful
  ```bash
  # Install GitHub CLI
  brew install gh  # macOS
  sudo apt install gh  # Ubuntu/Debian
  ```

### Docker (Optional)
- For containerized deployments
- Docker Desktop or Docker Engine 20.10+
- Docker Compose 2.0+

## Network Requirements

### Firewall and Ports
- **HTTP API**: Port 3000 (configurable)
- **WebSocket**: Port 3001 (configurable)
- **Web Interface**: Port 5173 (Vite dev server)

### SSL/TLS (Production)
- Valid SSL certificate for HTTPS
- Reverse proxy setup (Nginx/Caddy recommended)

## Troubleshooting Common Issues

### Node.js Version Mismatch
```bash
# Error: Node version too old
nvm install 18
nvm use 18
nvm alias default 18
```

### Permission Errors
```bash
# npm permission errors
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Database Connection Issues
```bash
# PostgreSQL connection refused
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
```

### Memory Issues
If you encounter out-of-memory errors:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Next Steps

Once you've verified all prerequisites:
1. **[Installation Guide](../installation)**: Step-by-step installation process
2. **[Configuration Setup](../configuration)**: Configure your first agent
3. **[Quick Start Tutorial](../quick-start)**: Run your first agent

## Verification Checklist

Before proceeding, verify:
- [ ] Runtime environment installed (Bun or Node.js 18+)
- [ ] Operating system is supported
- [ ] At least one AI provider API key obtained
- [ ] Database system chosen (SQLite default is fine)
- [ ] Network ports are available
- [ ] Sufficient disk space and RAM

Ready? Let's move on to the [installation guide](../installation)!
