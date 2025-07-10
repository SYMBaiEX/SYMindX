#!/bin/bash

echo "🔨 Building CLI with relaxed type checking..."

# Create dist directory
mkdir -p dist/cli

# Copy all TypeScript files as JavaScript with simple transpilation
echo "📝 Transpiling TypeScript files..."

# Use Bun to bundle the CLI
bun build src/cli/cli.tsx \
  --outdir=dist/cli \
  --target=node \
  --format=esm \
  --sourcemap=external \
  --external ink \
  --external react \
  --external chalk \
  --external @anthropic-ai/sdk \
  --external @ai-sdk/openai \
  --external @ai-sdk/anthropic \
  --external @ai-sdk/groq \
  --external @ai-sdk/google \
  --external ai

# Make the CLI executable
chmod +x dist/cli/cli.js

echo "✅ CLI build complete!"
echo "📦 Output: dist/cli/cli.js"
echo ""
echo "Run with: node dist/cli/cli.js"