#!/bin/bash

# Create the new documentation structure for SYMindX
# This script creates all 26 categories with their subcategories

DOCS_DIR="/home/cid/CursorProjects/symindx/docs-site/docs"

echo "🚀 Creating SYMindX documentation structure..."

# Create the base directories for all 26 categories
mkdir -p "$DOCS_DIR"/{01-overview,02-getting-started,03-api-reference,04-core-concepts,05-agents,06-modules,07-extensions,08-portals,09-security,10-deployment,11-monitoring,12-testing,13-performance,14-troubleshooting,15-migration,16-integrations,17-examples,18-tutorials,19-advanced-topics,20-architecture,21-development,22-community,23-changelog,24-roadmap,25-support,26-resources}

# Create subdirectories for each category

# 01. Overview
mkdir -p "$DOCS_DIR/01-overview"/{introduction,use-cases,roadmap}

# 02. Getting Started
mkdir -p "$DOCS_DIR/02-getting-started"/{installation,quick-start,prerequisites,first-agent}

# 03. API Reference
mkdir -p "$DOCS_DIR/03-api-reference"/{rest-api,websocket-api,typescript-sdk,openapi,graphql}
mkdir -p "$DOCS_DIR/03-api-reference/rest-api"/{authentication,agents,chat,extensions,memory,events,health}
mkdir -p "$DOCS_DIR/03-api-reference/websocket-api"/{connection,events,commands,streaming}
mkdir -p "$DOCS_DIR/03-api-reference/typescript-sdk"/{installation,agents,extensions,modules,runtime,types}

# 04. Core Concepts
mkdir -p "$DOCS_DIR/04-core-concepts"/{runtime,registry,event-bus,plugin-system,lifecycle}

# 05. Agents
mkdir -p "$DOCS_DIR/05-agents"/{configuration,character-system,multi-agent,lifecycle,communication}

# 06. Modules
mkdir -p "$DOCS_DIR/06-modules"/{memory,emotion,cognition,consciousness,behavior,tools}
mkdir -p "$DOCS_DIR/06-modules/memory"/{providers,sqlite,postgres,supabase,neon}
mkdir -p "$DOCS_DIR/06-modules/emotion"/{emotion-stack,custom-emotions}
mkdir -p "$DOCS_DIR/06-modules/cognition"/{htn-planner,reactive,hybrid}

# 07. Extensions
mkdir -p "$DOCS_DIR/07-extensions"/{api-server,telegram,slack,discord,twitter,web-ui,cli}

# 08. Portals
mkdir -p "$DOCS_DIR/08-portals"/{openai,anthropic,google,groq,xai,ollama,custom}

# 09. Security
mkdir -p "$DOCS_DIR/09-security"/{authentication,authorization,rbac,compliance,encryption}

# 10. Deployment
mkdir -p "$DOCS_DIR/10-deployment"/{docker,kubernetes,cloud,on-premise,configuration}

# 11. Monitoring
mkdir -p "$DOCS_DIR/11-monitoring"/{logging,metrics,tracing,alerts,dashboards}

# 12. Testing
mkdir -p "$DOCS_DIR/12-testing"/{unit-tests,integration-tests,e2e-tests,benchmarks,ci-cd}

# 13. Performance
mkdir -p "$DOCS_DIR/13-performance"/{optimization,benchmarks,scaling,caching,profiling}

# 14. Troubleshooting
mkdir -p "$DOCS_DIR/14-troubleshooting"/{common-issues,debugging,logs,faq}

# 15. Migration
mkdir -p "$DOCS_DIR/15-migration"/{version-upgrades,data-migration,breaking-changes}

# 16. Integrations
mkdir -p "$DOCS_DIR/16-integrations"/{mcp,langchain,llama-index,vector-stores,databases}

# 17. Examples
mkdir -p "$DOCS_DIR/17-examples"/{basic,advanced,use-cases,templates}

# 18. Tutorials
mkdir -p "$DOCS_DIR/18-tutorials"/{beginner,intermediate,advanced,video-tutorials}

# 19. Advanced Topics
mkdir -p "$DOCS_DIR/19-advanced-topics"/{autonomous-agents,multi-modal,fine-tuning,custom-portals}

# 20. Architecture
mkdir -p "$DOCS_DIR/20-architecture"/{system-design,data-flow,scalability,patterns}

# 21. Development
mkdir -p "$DOCS_DIR/21-development"/{contributing,code-style,plugin-development,debugging}

# 22. Community
mkdir -p "$DOCS_DIR/22-community"/{forums,discord,contributors,showcase}

# 23. Changelog
mkdir -p "$DOCS_DIR/23-changelog"/{releases,migration-guides,breaking-changes}

# 24. Roadmap
mkdir -p "$DOCS_DIR/24-roadmap"/{features,timeline,vision}

# 25. Support
mkdir -p "$DOCS_DIR/25-support"/{documentation,community,enterprise,contact}

# 26. Resources
mkdir -p "$DOCS_DIR/26-resources"/{glossary,references,tools,learning}

echo "✅ Directory structure created successfully!"

# Create index.md files for each category with proper frontmatter
echo "📝 Creating index.md files for all categories..."

# Function to create an index.md file with frontmatter
create_index() {
    local path=$1
    local title=$2
    local description=$3
    local position=$4
    
    cat > "$path/index.md" << EOF
---
sidebar_position: $position
sidebar_label: "$title"
title: "$title"
description: "$description"
---

# $title

$description

## In This Section

*This section is being developed. Content will be added soon.*
EOF
}

# Create main category index files
create_index "$DOCS_DIR/01-overview" "Overview" "Introduction to SYMindX and its capabilities" 1
create_index "$DOCS_DIR/02-getting-started" "Getting Started" "Quick start guide and installation instructions" 2
create_index "$DOCS_DIR/03-api-reference" "API Reference" "Complete API documentation for all interfaces" 3
create_index "$DOCS_DIR/04-core-concepts" "Core Concepts" "Fundamental concepts and architecture" 4
create_index "$DOCS_DIR/05-agents" "Agents" "Creating and managing AI agents" 5
create_index "$DOCS_DIR/06-modules" "Modules" "Core modules: memory, emotion, cognition" 6
create_index "$DOCS_DIR/07-extensions" "Extensions" "Platform integrations and extensions" 7
create_index "$DOCS_DIR/08-portals" "Portals" "AI provider integrations" 8
create_index "$DOCS_DIR/09-security" "Security" "Authentication, authorization, and compliance" 9
create_index "$DOCS_DIR/10-deployment" "Deployment" "Deployment options and configurations" 10
create_index "$DOCS_DIR/11-monitoring" "Monitoring" "Observability and monitoring" 11
create_index "$DOCS_DIR/12-testing" "Testing" "Testing strategies and tools" 12
create_index "$DOCS_DIR/13-performance" "Performance" "Performance optimization and benchmarks" 13
create_index "$DOCS_DIR/14-troubleshooting" "Troubleshooting" "Common issues and solutions" 14
create_index "$DOCS_DIR/15-migration" "Migration" "Version upgrades and migration guides" 15
create_index "$DOCS_DIR/16-integrations" "Integrations" "Third-party integrations" 16
create_index "$DOCS_DIR/17-examples" "Examples" "Code examples and templates" 17
create_index "$DOCS_DIR/18-tutorials" "Tutorials" "Step-by-step tutorials" 18
create_index "$DOCS_DIR/19-advanced-topics" "Advanced Topics" "Advanced concepts and techniques" 19
create_index "$DOCS_DIR/20-architecture" "Architecture" "System architecture and design patterns" 20
create_index "$DOCS_DIR/21-development" "Development" "Development guidelines and best practices" 21
create_index "$DOCS_DIR/22-community" "Community" "Community resources and support" 22
create_index "$DOCS_DIR/23-changelog" "Changelog" "Release notes and change history" 23
create_index "$DOCS_DIR/24-roadmap" "Roadmap" "Future plans and feature roadmap" 24
create_index "$DOCS_DIR/25-support" "Support" "Getting help and support options" 25
create_index "$DOCS_DIR/26-resources" "Resources" "Additional resources and references" 26

# Create subcategory index files (showing a few examples)

# Overview subcategories
create_index "$DOCS_DIR/01-overview/introduction" "Introduction" "What is SYMindX?" 1
create_index "$DOCS_DIR/01-overview/use-cases" "Use Cases" "Real-world applications of SYMindX" 2
create_index "$DOCS_DIR/01-overview/roadmap" "Product Roadmap" "Future development plans" 3

# Getting Started subcategories
create_index "$DOCS_DIR/02-getting-started/prerequisites" "Prerequisites" "System requirements and dependencies" 1
create_index "$DOCS_DIR/02-getting-started/installation" "Installation" "Step-by-step installation guide" 2
create_index "$DOCS_DIR/02-getting-started/quick-start" "Quick Start" "Get up and running in 5 minutes" 3
create_index "$DOCS_DIR/02-getting-started/first-agent" "Your First Agent" "Create your first AI agent" 4

# API Reference subcategories
create_index "$DOCS_DIR/03-api-reference/rest-api" "REST API" "RESTful API endpoints" 1
create_index "$DOCS_DIR/03-api-reference/websocket-api" "WebSocket API" "Real-time WebSocket interface" 2
create_index "$DOCS_DIR/03-api-reference/typescript-sdk" "TypeScript SDK" "TypeScript SDK documentation" 3
create_index "$DOCS_DIR/03-api-reference/openapi" "OpenAPI" "OpenAPI specification" 4

# Module subcategories
create_index "$DOCS_DIR/06-modules/memory" "Memory Modules" "Memory storage and retrieval systems" 1
create_index "$DOCS_DIR/06-modules/emotion" "Emotion Modules" "Emotion processing and management" 2
create_index "$DOCS_DIR/06-modules/cognition" "Cognition Modules" "Decision-making and planning systems" 3
create_index "$DOCS_DIR/06-modules/consciousness" "Consciousness Modules" "Advanced consciousness simulation" 4
create_index "$DOCS_DIR/06-modules/behavior" "Behavior Modules" "Agent behavior patterns" 5
create_index "$DOCS_DIR/06-modules/tools" "Tools" "Utility modules and helpers" 6

echo "✅ Index files created successfully!"

# Make the script executable
chmod +x "$0"

echo "🎉 Documentation restructuring complete!"
echo ""
echo "Next steps:"
echo "1. Run the migration script to move existing content"
echo "2. Update sidebars.ts to reflect the new structure"
echo "3. Update docusaurus.config.ts if needed"
echo "4. Test the documentation site with 'npm run start'"