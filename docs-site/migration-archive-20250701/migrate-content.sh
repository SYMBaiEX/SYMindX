#!/bin/bash

# Migration script to move existing content to new structure
DOCS_DIR="/home/cid/CursorProjects/symindx/docs-site/docs"

echo "🚀 Starting content migration..."

# Check if backup exists
if [ ! -d "$DOCS_DIR-backup" ]; then
    echo "Creating backup of existing docs..."
    cp -r "$DOCS_DIR" "$DOCS_DIR-backup"
fi

# Function to safely move files
move_file() {
    local src=$1
    local dst=$2
    
    if [ -f "$src" ]; then
        echo "Moving: $src → $dst"
        cp "$src" "$dst"
    else
        echo "Warning: Source file not found: $src"
    fi
}

# Migrate main documentation files
echo "📄 Migrating main documentation..."

# Introduction
move_file "$DOCS_DIR/introduction.md" "$DOCS_DIR/01-overview/introduction/index.md"

# Getting Started
move_file "$DOCS_DIR/getting-started/installation.md" "$DOCS_DIR/02-getting-started/installation/index.md"
move_file "$DOCS_DIR/getting-started/quick-start.md" "$DOCS_DIR/02-getting-started/quick-start/index.md"
move_file "$DOCS_DIR/getting-started/your-first-agent.md" "$DOCS_DIR/02-getting-started/first-agent/index.md"

# Architecture
move_file "$DOCS_DIR/architecture/overview.md" "$DOCS_DIR/20-architecture/system-design/index.md"

# Guides
move_file "$DOCS_DIR/guides/plugin-development.md" "$DOCS_DIR/21-development/plugin-development/index.md"
move_file "$DOCS_DIR/guides/multi-agent-systems.md" "$DOCS_DIR/05-agents/multi-agent/index.md"

# API Documentation
echo "📚 Migrating API documentation..."

# Overview
move_file "$DOCS_DIR/api/overview.md" "$DOCS_DIR/03-api-reference/index.md"

# REST API
move_file "$DOCS_DIR/api/rest/authentication.md" "$DOCS_DIR/03-api-reference/rest-api/authentication/index.md"
move_file "$DOCS_DIR/api/rest/agents.md" "$DOCS_DIR/03-api-reference/rest-api/agents/index.md"
move_file "$DOCS_DIR/api/rest/chat.md" "$DOCS_DIR/03-api-reference/rest-api/chat/index.md"
move_file "$DOCS_DIR/api/rest/extensions.md" "$DOCS_DIR/03-api-reference/rest-api/extensions/index.md"
move_file "$DOCS_DIR/api/rest/memory.md" "$DOCS_DIR/03-api-reference/rest-api/memory/index.md"
move_file "$DOCS_DIR/api/rest/events.md" "$DOCS_DIR/03-api-reference/rest-api/events/index.md"
move_file "$DOCS_DIR/api/rest/health.md" "$DOCS_DIR/03-api-reference/rest-api/health/index.md"

# WebSocket API
move_file "$DOCS_DIR/api/websocket/connection.md" "$DOCS_DIR/03-api-reference/websocket-api/connection/index.md"
move_file "$DOCS_DIR/api/websocket/events.md" "$DOCS_DIR/03-api-reference/websocket-api/events/index.md"
move_file "$DOCS_DIR/api/websocket/commands.md" "$DOCS_DIR/03-api-reference/websocket-api/commands/index.md"
move_file "$DOCS_DIR/api/websocket/streaming.md" "$DOCS_DIR/03-api-reference/websocket-api/streaming/index.md"

# TypeScript SDK
move_file "$DOCS_DIR/api/typescript/installation.md" "$DOCS_DIR/03-api-reference/typescript-sdk/installation/index.md"
move_file "$DOCS_DIR/api/typescript/agents.md" "$DOCS_DIR/03-api-reference/typescript-sdk/agents/index.md"
move_file "$DOCS_DIR/api/typescript/extensions.md" "$DOCS_DIR/03-api-reference/typescript-sdk/extensions/index.md"
move_file "$DOCS_DIR/api/typescript/modules.md" "$DOCS_DIR/03-api-reference/typescript-sdk/modules/index.md"
move_file "$DOCS_DIR/api/typescript/runtime.md" "$DOCS_DIR/03-api-reference/typescript-sdk/runtime/index.md"
move_file "$DOCS_DIR/api/typescript/types.md" "$DOCS_DIR/03-api-reference/typescript-sdk/types/index.md"

# OpenAPI
move_file "$DOCS_DIR/api/openapi/overview.md" "$DOCS_DIR/03-api-reference/openapi/overview/index.md"
move_file "$DOCS_DIR/api/openapi/endpoints.md" "$DOCS_DIR/03-api-reference/openapi/endpoints/index.md"
move_file "$DOCS_DIR/api/openapi/schemas.md" "$DOCS_DIR/03-api-reference/openapi/schemas/index.md"
move_file "$DOCS_DIR/api/openapi/examples.md" "$DOCS_DIR/03-api-reference/openapi/examples/index.md"

# Plugin API - distribute to appropriate sections
move_file "$DOCS_DIR/api/plugins/extension-interface.md" "$DOCS_DIR/07-extensions/api-server/extension-interface.md"
move_file "$DOCS_DIR/api/plugins/memory-provider.md" "$DOCS_DIR/06-modules/memory/providers/api.md"
move_file "$DOCS_DIR/api/plugins/emotion-module.md" "$DOCS_DIR/06-modules/emotion/api.md"
move_file "$DOCS_DIR/api/plugins/cognition-module.md" "$DOCS_DIR/06-modules/cognition/api.md"
move_file "$DOCS_DIR/api/plugins/portal-interface.md" "$DOCS_DIR/08-portals/custom/api.md"
move_file "$DOCS_DIR/api/plugins/lifecycle.md" "$DOCS_DIR/05-agents/lifecycle/api.md"

# Import documentation from mind-agents/docs
echo "📦 Importing documentation from mind-agents/docs..."

MIND_AGENTS_DOCS="/home/cid/CursorProjects/symindx/mind-agents/docs"

# Advanced AI Integration
if [ -f "$MIND_AGENTS_DOCS/ADVANCED_AI_INTEGRATION.md" ]; then
    cp "$MIND_AGENTS_DOCS/ADVANCED_AI_INTEGRATION.md" "$DOCS_DIR/19-advanced-topics/autonomous-agents/advanced-ai.md"
fi

# Architecture
if [ -f "$MIND_AGENTS_DOCS/ARCHITECTURE.md" ]; then
    cp "$MIND_AGENTS_DOCS/ARCHITECTURE.md" "$DOCS_DIR/20-architecture/patterns/mind-agents-architecture.md"
fi

# MCP Integration
if [ -f "$MIND_AGENTS_DOCS/MCP_AND_API_INTEGRATION.md" ]; then
    cp "$MIND_AGENTS_DOCS/MCP_AND_API_INTEGRATION.md" "$DOCS_DIR/16-integrations/mcp/api-integration.md"
fi

# Migration Guide
if [ -f "$MIND_AGENTS_DOCS/MIGRATION.md" ]; then
    cp "$MIND_AGENTS_DOCS/MIGRATION.md" "$DOCS_DIR/15-migration/version-upgrades/v1-migration.md"
fi

# PRD
if [ -f "$MIND_AGENTS_DOCS/PRD.md" ]; then
    cp "$MIND_AGENTS_DOCS/PRD.md" "$DOCS_DIR/01-overview/roadmap/product-requirements.md"
fi

# Plugin Development
if [ -f "$MIND_AGENTS_DOCS/plugin-development.md" ]; then
    cp "$MIND_AGENTS_DOCS/plugin-development.md" "$DOCS_DIR/21-development/plugin-development/guide.md"
fi

# Configuration Guides from root
echo "📋 Importing configuration guides..."

ROOT_DOCS="/home/cid/CursorProjects/symindx/mind-agents"

if [ -f "$ROOT_DOCS/CONFIGURATION_GUIDE.md" ]; then
    cp "$ROOT_DOCS/CONFIGURATION_GUIDE.md" "$DOCS_DIR/10-deployment/configuration/guide.md"
fi

if [ -f "$ROOT_DOCS/PORTAL_SWITCHING_GUIDE.md" ]; then
    cp "$ROOT_DOCS/PORTAL_SWITCHING_GUIDE.md" "$DOCS_DIR/08-portals/portal-switching.md"
fi

if [ -f "$ROOT_DOCS/TELEGRAM_SETUP.md" ]; then
    cp "$ROOT_DOCS/TELEGRAM_SETUP.md" "$DOCS_DIR/07-extensions/telegram/setup.md"
fi

# Update sidebar configuration
echo "📑 Updating sidebar configuration..."
if [ -f "$DOCS_DIR/../sidebars-new.ts" ]; then
    mv "$DOCS_DIR/../sidebars.ts" "$DOCS_DIR/../sidebars-old.ts"
    mv "$DOCS_DIR/../sidebars-new.ts" "$DOCS_DIR/../sidebars.ts"
    echo "Sidebar configuration updated"
fi

# Create a migration report
echo "📊 Creating migration report..."
cat > "$DOCS_DIR/../MIGRATION_REPORT.md" << EOF
# Migration Report

Generated: $(date)

## Migration Summary

### Files Migrated
- Introduction → 01-overview/introduction/
- Getting Started (3 files) → 02-getting-started/
- API Documentation (28 files) → 03-api-reference/
- Architecture → 20-architecture/
- Guides → Various categories

### New Structure Created
- 26 main categories
- 100+ subcategories
- Proper index.md files with frontmatter

### Next Steps
1. Review migrated content
2. Update internal links
3. Create missing documentation
4. Test navigation
5. Update search index

### Notes
- Original docs backed up to: $DOCS_DIR-backup
- Some content split across multiple categories
- Plugin API distributed to relevant sections
EOF

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review the migration report: MIGRATION_REPORT.md"
echo "2. Test the documentation site: cd docs-site && npm run start"
echo "3. Fix any broken links or navigation issues"
echo "4. Start creating new content for empty sections"

# Make script executable
chmod +x "$0"