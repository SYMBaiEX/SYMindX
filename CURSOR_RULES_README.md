# SYMindX Cursor Rules Framework

A comprehensive, hierarchical rules system designed for intelligent AI assistance in the SYMindX project. This framework provides context-aware guidance for development across all aspects of the codebase, enhanced with Cursor v1.2+ features including background agents, git hooks, MCP integration, and advanced context awareness.

## 🚀 Quick Setup

### Prerequisites
- **Cursor IDE 1.2+** (required for latest `.mdc` support, background agents, git hooks, and MCP integration)
- **Git** (for version control of rules)
- **Node.js/Bun** (for MCP server installations)

### Installation Steps

1. **Clone with Rules Included**
   ```bash
   git clone https://github.com/your-org/symindx.git
   cd symindx
   ```

2. **Verify Rules Directory Structure**
   ```bash
   ls -la .cursor/rules/
   # Should show 000-index.mdc + 000-023 core rules (.mdc files) - Updated July 2025
   
   # Verify cross-reference integrity
   node .cursor/tools/verify-rule-links.js
   # Should show 🌟 Excellent cross-referencing status
   ```

3. **Open in Cursor IDE**
   ```bash
   cursor .
   # Rules will auto-load based on file context
   ```

4. **Optional: Configure Editor Settings**
   ```json
   // Add to Cursor settings for better .mdc editing
   "workbench.editorAssociations": {
       "*.mdc": "default"
   }
   ```

## 📋 Rules Framework Overview

### Hierarchical Numbering System

Our rules follow a structured numbering system for optimal organization and precedence:

- **000-099**: Core workspace and foundation rules
- **100-199**: Integration rules (AI portals, platforms, external services)  
- **200-299**: Specialized pattern and workflow rules

### Intelligent Cross-Reference System

The SYMindX rules framework features a comprehensive cross-reference system that ensures agents can navigate efficiently:

**🧭 Master Index** (`000-index.mdc`)
- Central navigation hub for all rules
- Context-based rule selection guidance
- Development scenario mapping
- Rule dependency visualization

**🔗 Cross-References in Every Rule**
- `@rule-name.mdc` syntax for rule linking
- Foundation → Component → Advanced dependency chains
- Component-specific rule combinations
- Integration pattern guidance

**📋 Navigation Patterns**
- **By Development Context**: Starting new features, daily development, automation setup
- **By Component Type**: AI portals, memory systems, extensions, web interface
- **By Development Phase**: Foundation, development, testing, deployment, operations

### Current Core Rules (000-023) - Updated July 2025

| Rule | Focus Area | Description |
|------|------------|-------------|
| `000-index.mdc` | 🧭 Master Index | Intelligent navigation hub for all SYMindX Cursor rules |
| `000-rules.mdc` | 📋 Meta-Framework | Defines how to write all other Cursor rules |
| `001-symindx-workspace.mdc` | 🏗️ Workspace | Core architecture, development standards, constraints |
| `002-cursor-rules-framework.mdc` | 📋 Rules Overview | Current rules system hierarchy and reference |
| `003-typescript-standards.mdc` | 🔧 TypeScript | Bun development patterns, type safety |
| `004-architecture-patterns.mdc` | 🏛️ Architecture | Modular agent system design |
| `005-ai-integration-patterns.mdc` | 🤖 AI Portals | AI provider integration patterns |
| `006-web-interface-patterns.mdc` | 🌐 Web UI | React website and documentation |
| `007-extension-system-patterns.mdc` | 🔌 Extensions | Platform integrations (Discord, Telegram, etc.) |
| `008-testing-and-quality-standards.mdc` | ✅ Testing | Comprehensive testing strategies |
| `009-deployment-and-operations.mdc` | 🚀 DevOps | Docker, monitoring, production |
| `010-security-and-authentication.mdc` | 🔒 Security | Security patterns, auth flows |
| `011-data-management-patterns.mdc` | 💾 Data | Database schemas, migrations |
| `012-performance-optimization.mdc` | ⚡ Performance | Caching, optimization strategies |
| `013-error-handling-logging.mdc` | 🐛 Error Handling | Error patterns, logging |
| `014-cli-and-tooling-patterns.mdc` | 🛠️ CLI/Tools | Command-line interface patterns |
| `015-configuration-management.mdc` | ⚙️ Configuration | Config schemas, env management |
| `016-documentation-standards.mdc` | 📚 Documentation | Documentation requirements |
| `017-community-and-governance.mdc` | 👥 Community | Open source governance |
| `018-git-hooks.mdc` | 🔗 Git Hooks | AI-enhanced commit hooks and automation |
| `019-background-agents.mdc` | ☁️ Background Agents | Cloud-powered parallel task automation |
| `020-mcp-integration.mdc` | 🔌 MCP Tools | Model Context Protocol integration and OAuth |
| `021-advanced-context.mdc` | 🧠 Smart Context | Dynamic rule activation and context awareness |
| `022-workflow-automation.mdc` | 🔄 Workflows | Automated workflow orchestration and action coordination |
| `023-ai-safety-patterns.mdc` | 🛡️ AI Safety | 2025 AI safety, ethics, and responsible AI implementation |

## 🔧 Configuration and Setup

### Rule Types in Cursor IDE

Understanding Cursor's four rule types is crucial for optimal setup:

#### 1. **Always** (`alwaysApply: true`)
- **Usage**: Core patterns that apply to every interaction
- **Best for**: Fundamental coding standards, architecture principles
- **Example**: TypeScript standards, workspace architecture

#### 2. **Auto Attached** (via `globs` patterns)
- **Usage**: Automatically loads when working with matching files
- **Best for**: Technology-specific guidelines (React, API routes, etc.)
- **Example**: `src/portals/**/*.ts` → AI portal patterns

#### 3. **Agent Requested** (description-based)
- **Usage**: AI decides when rules are relevant based on context
- **Best for**: Specialized knowledge that's needed situationally
- **Example**: Performance optimization, security patterns

#### 4. **Manual** (explicit reference needed)
- **Usage**: Rules that require explicit mention to activate
- **Best for**: Advanced patterns, debugging guides
- **Example**: Migration procedures, troubleshooting steps

### Setting Up Rule Types

#### Method 1: Via Cursor IDE Interface

1. **Open Rules Panel**
   - `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "New Cursor Rule" and select

2. **Configure Rule Properties**
   ```yaml
   ---
   description: Brief description for AI context selection
   globs: src/**/*.ts,src/**/*.tsx  # File patterns for auto-attach
   alwaysApply: true  # Set to true for "Always" type rules
   ---
   ```

3. **Add Rule Content** in the main editor area

#### Method 2: Direct File Creation

Create `.mdc` files directly in `.cursor/rules/`:

```yaml
---
description: TypeScript and Bun development patterns
globs: **/*.ts,**/*.tsx,**/package.json,**/bun.lockb
alwaysApply: true
---

# TypeScript Development Standards

## Core Principles
- Use strict TypeScript configuration
- Prefer functional programming patterns
- Implement proper error boundaries
```

### Advanced Configuration

#### Rule Precedence and Conflicts

Higher-numbered rules take precedence:
- `003-typescript-standards.mdc` overrides conflicting guidance in `001-workspace.mdc`
- Specific technology rules (100+) override general patterns

#### Global vs Project Rules

**Project Rules** (our approach):
- Stored in `.cursor/rules/` directory
- Version controlled with the project
- Shared across the entire team
- Automatic with repository clone

**Global Rules** (alternative):
- Stored in Cursor IDE settings
- Apply to all projects
- Local to your machine only
- Good for personal coding preferences

## 🌟 New Cursor v1.2+ Features

### Enhanced Rule Capabilities

#### Git Hooks Integration (018)
- **Pre-commit validation** with AI agents
- **Automatic code quality gates** during commits
- **Branch-specific workflow automation**
- **Post-commit task delegation** to background agents

#### Background Agents (019)
- **Cloud-powered parallel processing** for complex tasks
- **UI fix automation** with automatic PR creation
- **Cost-aware task scheduling** and delegation
- **Multi-agent workflow coordination**

#### MCP Integration (020)
- **One-click tool installation** for external services
- **OAuth authentication flows** with secure token storage
- **Custom SYMindX MCP server** for agent management
- **Dynamic tool registration** based on project dependencies

#### Advanced Context Awareness (021)
- **Dynamic rule activation** based on file type, git status, time of day
- **Intelligent assistance optimization** adapting to your working patterns
- **Project phase detection** (development, testing, optimization)
- **Productivity-based rule selection** for optimal assistance

### Activation Examples

```bash
# Git hooks activate automatically during commits
git commit -m "feat: add new emotion module"
# → Triggers TypeScript validation, testing, and background documentation updates

# Background agents handle complex refactoring
"Using 019-background-agents, extract common interface from all AI portals"
# → Creates branch, implements changes, runs tests, creates PR

# Master index guides development workflows
"Check 000-index for AI portal development"
# → Directs to: @005-ai-integration-patterns.mdc → @012-performance-optimization.mdc → @010-security-and-authentication.mdc

# Cross-references ensure comprehensive coverage
"Working on memory optimization, what rules apply?"
# → @011-data-management-patterns.mdc references @012-performance-optimization.mdc, @010-security-and-authentication.mdc, @004-architecture-patterns.mdc

# MCP tools enable external service integration
"With 020-mcp-integration, set up Supabase database for memory storage"
# → One-click OAuth setup, automatic configuration, connection testing

# Context awareness optimizes assistance
# Working late? → Suggests delegating to background agents
# Debugging? → Activates performance and error handling rules
# New feature? → Emphasizes architecture and integration patterns
```

## 📖 Using the Rules System

### For Developers

#### Starting a New Feature
1. **Review Relevant Rules**: Check which rules apply to your work area
2. **Reference Specific Rules**: Mention rule numbers when asking for help
3. **Follow Patterns**: Use established patterns from the rules
4. **Leverage New Features**: Use background agents for complex tasks

#### Example Interactions
```
"Following 005-ai-integration-patterns, help me add a new AI portal for Claude"

"Based on 008-testing-and-quality-standards, write unit tests for this component"

"Using 004-architecture-patterns, refactor this module to be hot-swappable"

"With 019-background-agents, delegate UI responsive fixes to run in parallel"

"Using 020-mcp-integration, connect to GitHub API for automated issue management"
```

### For Team Leads

#### Maintaining Rules Quality
1. **Regular Reviews**: Monthly rule effectiveness assessments
2. **Update Frequency**: Rules should evolve with the codebase
3. **Team Feedback**: Collect input on rule usefulness and accuracy

#### Adding New Rules
1. **Identify Need**: Repetitive patterns or common mistakes
2. **Draft Rule**: Create comprehensive, actionable guidance
3. **Test Effectiveness**: Use with AI assistant to validate quality
4. **Version Control**: Follow semantic versioning for rule updates

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Rules Not Loading
```bash
# Check file structure
ls -la .cursor/rules/*.mdc

# Verify no syntax errors in frontmatter
head -10 .cursor/rules/001-symindx-workspace.mdc

# Restart Cursor if needed
```

#### Rules Not Applying
1. **Check Glob Patterns**: Ensure patterns match your file paths
2. **Verify Rule Type**: Confirm appropriate rule type for your use case
3. **Review Descriptions**: Make descriptions clear for Agent Requested rules

#### File Conflicts During Saves
⚠️ **Known Issue**: Cursor sometimes has conflicts with `.mdc` file saves

**Solution**:
1. Always make changes through Cursor's Rules UI
2. If changes disappear:
   - Close Cursor completely
   - Select "Override" when prompted about unsaved changes
   - Reopen Cursor

### Performance Optimization

#### Token Usage Optimization
- **Keep Rules Concise**: Under 25 lines per section when possible
- **Use Hierarchical Structure**: Start general, then specific
- **Eliminate Redundancy**: Don't repeat information across rules
- **Prioritize Context**: Most important information first

#### Rule Loading Performance
- **Specific Glob Patterns**: Avoid overly broad patterns like `**/*`
- **Appropriate Rule Types**: Use Auto Attached sparingly
- **Regular Cleanup**: Remove unused or outdated rules

## 🛠️ Advanced Features

### Rule Generation and Automation

#### Using cursor-rules CLI (Optional)
```bash
# Install cursor-rules for automated rule generation
pip install cursor-rules

# Scan project and suggest rules
cursor-rules

# Generate rules for specific libraries
cursor-rules --libraries "react,typescript,bun"
```

#### Custom Rule Templates
Create templates for common rule patterns in `.cursor/tools/`:

```bash
.cursor/tools/
├── rule-template-technology.mdc
├── rule-template-architecture.mdc
└── rule-template-testing.mdc
```

### Integration with Development Workflow

#### Pre-commit Hooks
```bash
# Validate rule syntax before commits
#!/bin/bash
for rule in .cursor/rules/*.mdc; do
    # Check frontmatter syntax
    head -10 "$rule" | grep -q "^---$" || exit 1
done
```

#### CI/CD Integration
```yaml
# .github/workflows/rules-validation.yml
name: Validate Cursor Rules
on: [push, pull_request]
jobs:
  validate-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate rule files
        run: |
          find .cursor/rules -name "*.mdc" -exec echo "Validating {}" \;
```

## 📚 Best Practices

### Rule Writing Guidelines

#### Content Structure
```markdown
---
description: ACTION when TRIGGER to achieve OUTCOME (under 120 chars)
globs: specific/file/patterns/**/*.ext
---

# Rule Title

## Context
- When this rule applies
- Prerequisites or conditions

## Requirements  
- Specific, actionable items
- Each requirement should be testable

## Examples
Good example with explanation

## Anti-patterns
What NOT to do with explanation
```

#### Language Guidelines
- **Be Specific**: Use concrete examples over abstract concepts
- **Be Actionable**: Every guideline should be implementable
- **Be Concise**: Optimize for AI token efficiency
- **Be Current**: Keep rules updated with project evolution

### Team Collaboration

#### Rule Ownership
- **Core Rules (001-099)**: Architecture team responsibility
- **Integration Rules (100-199)**: Platform team ownership
- **Specialized Rules (200-299)**: Domain expert ownership

#### Change Management
1. **Propose Changes**: Use pull requests for rule modifications
2. **Review Process**: Require team review for rule changes
3. **Documentation**: Update rule versions and change logs
4. **Communication**: Notify team of significant rule updates

## 📚 Documentation and Tools Integration

The framework includes comprehensive documentation and development tools that are fully integrated into the cross-reference system:

### Documentation (`.cursor/docs/`)
- **`quick-start.md`** - Developer onboarding and first-time setup guide
- **`architecture.md`** - Detailed system architecture documentation and design decisions
- **`contributing.md`** - Development workflow and contribution guidelines

### Development Tools (`.cursor/tools/`)
- **`verify-rule-links.js`** - Automated cross-reference verification and quality scoring
- **`project-analyzer.md`** - Project structure analysis and code metrics collection
- **`debugging-guide.md`** - Comprehensive debugging strategies and troubleshooting guides
- **`code-generator.md`** - Component templates and code generation patterns

### Cross-Reference Integration

All major component rules now include references to relevant documentation and tools:

```markdown
# Example cross-references in component rules:
### Development Tools and Templates
- @.cursor/docs/architecture.md - System architecture context
- @.cursor/tools/code-generator.md - Template generation patterns
- @.cursor/tools/debugging-guide.md - Troubleshooting strategies
- @.cursor/tools/project-analyzer.md - Performance metrics collection
- @.cursor/docs/contributing.md - Development workflow guidance
```

This integration ensures agents have immediate access to:
- **Architectural Context**: Understanding system design decisions
- **Template Generation**: Consistent code patterns and scaffolding
- **Debugging Support**: Systematic troubleshooting approaches
- **Performance Analysis**: Metrics and optimization guidance
- **Development Process**: Contributing workflows and best practices

## 🔮 Future Enhancements

### Planned Features (v2.0)
- **Rule Analytics**: Track rule usage and effectiveness
- **Automated Rule Generation**: AI-powered rule suggestions
- **Rule Testing Framework**: Validate rule quality automatically
- **Dynamic Rule Loading**: Context-aware rule activation

### Integration Roadmap
- **IDE Extensions**: Enhanced rule management interface
- **Documentation Generation**: Auto-generate docs from rules
- **Team Dashboards**: Rule compliance and usage metrics
- **Rule Marketplace**: Share rules across projects/teams

## 🆘 Support and Resources

### Quick Help
- **Cursor Forum**: [cursor.com/forum](https://cursor.com/forum)
- **Documentation**: [cursor.com/docs](https://cursor.com/docs)
- **Community Discord**: SYMindX community channel

### Project-Specific
- **Rule Issues**: Create GitHub issues with `rules` label
- **Rule Requests**: Use issue template for new rule suggestions  
- **Team Chat**: Internal Slack `#cursor-rules` channel

### External Resources
- **Cursor Rules Collection**: [awesome-cursorrules](https://github.com/patrickjs/awesome-cursorrules)
- **Best Practices**: [cursorrules.org](https://cursorrules.org)
- **Rule Examples**: [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)

---

**Last Updated**: July 2025  
**Framework Version**: 2.0.0  
**Minimum Cursor Version**: 1.2+

For questions about this rules framework, contact the SYMindX architecture team or create an issue in the repository. 