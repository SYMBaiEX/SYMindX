# Installation

This guide will help you install and set up SYMindX on your local development environment.

## Prerequisites

Before installing SYMindX, ensure you have the following software installed:

### Required
- **Node.js** 18+ or **Bun** (recommended)
- **Git** for version control
- **A code editor** (VS Code recommended)

### Optional
- **Docker** for containerized deployments
- **PostgreSQL** for advanced memory providers
- **Redis** for caching (performance optimization)

## Installation Methods

### Method 1: Using Bun (Recommended)

Bun provides the fastest installation and runtime performance:

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Clone the SYMindX repository
git clone https://github.com/symindx/symindx.git
cd symindx

# Install all dependencies
bun install

# Verify installation
bun --version
```

### Method 2: Using Node.js and npm

If you prefer to use Node.js:

```bash
# Ensure you have Node.js 18+ installed
node --version

# Clone the repository
git clone https://github.com/symindx/symindx.git
cd symindx

# Install dependencies
npm install

# For Yarn users
yarn install
```

### Method 3: Using Docker

For a containerized setup:

```bash
# Clone the repository
git clone https://github.com/symindx/symindx.git
cd symindx

# Build and run with Docker Compose
docker-compose up --build
```

## Project Structure

After installation, your project structure should look like this:

```
symindx/
├── 📁 mind-agents/          # Core AI agent runtime
│   ├── src/
│   │   ├── core/           # Runtime engine
│   │   ├── modules/        # Memory, emotion, cognition
│   │   ├── extensions/     # Platform integrations
│   │   ├── portals/        # AI provider interfaces
│   │   └── characters/     # Agent definitions
│   └── package.json
├── 📁 website/             # React web interface
│   ├── src/
│   │   ├── components/     # UI components
│   │   └── App.tsx         # Main application
│   └── package.json
├── 📁 config/              # Configuration files
│   ├── runtime.example.json
│   └── runtime.json
├── 📁 docs-site/           # Documentation site
└── package.json            # Root package configuration
```

## Configuration Setup

### 1. Create Runtime Configuration

Copy the example configuration file:

```bash
cp config/runtime.example.json config/runtime.json
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy environment template
cp .env.example .env
```

Edit the `.env` file with your specific configuration:

```env
# Memory Providers
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEON_DATABASE_URL=your_neon_database_url

# AI Portals (at least one required)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key
XAI_API_KEY=your_xai_api_key

# Extensions (optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# Development
NODE_ENV=development
LOG_LEVEL=info
```

### 3. Initialize Database (if using SQLite)

Create the data directory and initialize the database:

```bash
mkdir -p data
touch data/memories.db
```

### 4. Verify Installation

Test that everything is working:

```bash
# Test the agent runtime
cd mind-agents
bun run build
bun run test

# Test the web interface
cd ../website
bun run build
```

## Development Environment Setup

### VS Code Configuration

Install recommended extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

Add to your VS Code settings:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Git Configuration

Configure Git hooks for code quality:

```bash
# Install husky for Git hooks
bun add -D husky lint-staged

# Initialize Git hooks
bunx husky install
```

## Troubleshooting

### Common Issues

#### 1. Permission Errors
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $USER /usr/local/lib/node_modules
```

#### 2. Port Already in Use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

#### 3. Bun Installation Issues
```bash
# Reinstall Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### 4. Database Connection Errors
- Verify your database URLs are correct
- Ensure database services are running
- Check firewall settings for cloud databases

### Getting Help

If you encounter issues:

1. **Check the logs**: Look at console output for error messages
2. **Verify configuration**: Ensure all required environment variables are set
3. **Check permissions**: Ensure you have read/write access to project directories
4. **Visit our GitHub**: Check existing issues or create a new one
5. **Join our Discord**: Get help from the community

## Next Steps

Once installation is complete:

1. **[Quick Start Guide](quick-start)** - Run your first agent
2. **[Configuration Guide](configuration)** - Detailed configuration options
3. **[Your First Agent](your-first-agent)** - Create a custom AI character
4. **[Architecture Overview](../architecture/overview)** - Understand the system design

Congratulations! You're ready to start building with SYMindX! 🎉