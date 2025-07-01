---
sidebar_position: 2
sidebar_label: "Getting Started"
title: "Getting Started"
description: "Quick start guide and installation instructions"
---

# Getting Started

Quick start guide and installation instructions

## Welcome to SYMindX

SYMindX is a powerful, modular AI agent runtime system designed to create intelligent, autonomous agents with memory, emotional processing, and cognitive capabilities. This guide will help you get up and running with SYMindX in minutes.

## Overview

SYMindX provides a clean, type-safe architecture for building AI agents that can:
- **Remember**: Persistent memory across sessions using SQLite, PostgreSQL, or cloud databases
- **Feel**: Emotional state processing and personality modeling
- **Think**: Cognitive planning with HTN planners and reactive systems
- **Act**: Interact through various platforms (Discord, Telegram, Slack, Twitter)
- **Learn**: Autonomous self-improvement and adaptation

## Quick Start

The fastest way to get started with SYMindX is using the following commands:

```bash
# Clone the repository
git clone https://github.com/yourusername/symindx.git
cd symindx

# Install dependencies (using Bun - recommended)
bun install

# Copy the example configuration
cp config/runtime.example.json config/runtime.json

# Start the development environment
bun dev
```

This will start both the agent runtime system and the web interface for monitoring and control.

## What You'll Need

Before installing SYMindX, make sure you have:
1. **Runtime Environment**: Node.js 18+ or Bun (recommended)
2. **Database**: SQLite (included) or PostgreSQL/Supabase/Neon for production
3. **AI Provider**: At least one API key (OpenAI, Anthropic, Groq, or xAI)
4. **Operating System**: Windows, macOS, or Linux

## Installation Options

### Option 1: Using Bun (Recommended)
```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Install SYMindX
bun install
bun dev
```

### Option 2: Using Node.js and npm
```bash
# Ensure Node.js 18+ is installed
node --version

# Install dependencies
npm install

# Start development
npm run dev
```

## Project Structure

After installation, you'll find two main components:

- **`mind-agents/`**: Core agent runtime system (TypeScript)
  - Character definitions
  - Module implementations
  - Extension plugins
  - Type-safe APIs

- **`website/`**: React web interface
  - Real-time agent monitoring
  - Configuration management
  - Live thought streams
  - Performance metrics

## Next Steps

1. **[Check Prerequisites](./prerequisites)**: Ensure your system meets all requirements
2. **[Installation Guide](./installation)**: Detailed installation instructions
3. **[Quick Start Tutorial](./quick-start)**: Build your first agent in 5 minutes
4. **[Your First Agent](./your-first-agent)**: Create a custom AI agent

## Getting Help

- **Documentation**: You're already here! Browse through our guides
- **Examples**: Check the `examples/` directory for sample implementations
- **Community**: Join our Discord server for support
- **Issues**: Report bugs on our GitHub repository

## Key Features at a Glance

### Modular Architecture
- Plug-and-play modules for memory, emotion, and cognition
- Hot-swappable components during runtime
- Clean separation of concerns

### Type Safety
- Full TypeScript support with centralized type definitions
- Compile-time error checking
- IntelliSense support in modern IDEs

### Multi-Platform Support
- Deploy on Windows, macOS, or Linux
- Cloud-ready with Docker support
- Edge deployment capabilities

### Extensible Design
- Easy-to-build custom extensions
- Platform integrations (Discord, Telegram, Slack)
- AI provider flexibility (OpenAI, Anthropic, local models)

Ready to dive in? Let's start with checking your [system prerequisites](./prerequisites)!
