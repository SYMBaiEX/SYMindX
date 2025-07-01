# Documentation Migration Plan

## Overview
This document outlines the migration of existing documentation content to the new 26-category structure.

## Migration Mapping

### From: `introduction.md`
**To:** `01-overview/introduction/index.md`
- Main introduction content
- Add links to use cases and roadmap

### From: `getting-started/installation.md`
**To:** `02-getting-started/installation/index.md`
- Keep existing content
- Add prerequisites section link

### From: `getting-started/quick-start.md`
**To:** `02-getting-started/quick-start/index.md`
- Keep existing content
- Update navigation links

### From: `getting-started/your-first-agent.md`
**To:** `02-getting-started/first-agent/index.md`
- Keep existing content
- Add more examples

### From: `architecture/overview.md`
**To:** `20-architecture/system-design/index.md`
- Move architecture overview
- Split into system design, data flow, scalability

### From: `guides/plugin-development.md`
**To:** `21-development/plugin-development/index.md`
- Move plugin development guide
- Add code style guidelines

### From: `guides/multi-agent-systems.md`
**To:** `05-agents/multi-agent/index.md`
- Move multi-agent guide
- Expand with communication patterns

### From: `api/` directory
**To:** `03-api-reference/` directory
- Maintain existing structure under new numbering
- Add GraphQL documentation placeholder

### API Content Migration:

#### REST API (`api/rest/`)
**To:** `03-api-reference/rest-api/`
- `authentication.md` → `authentication/index.md`
- `agents.md` → `agents/index.md`
- `chat.md` → `chat/index.md`
- `extensions.md` → `extensions/index.md`
- `memory.md` → `memory/index.md`
- `events.md` → `events/index.md`
- `health.md` → `health/index.md`

#### WebSocket API (`api/websocket/`)
**To:** `03-api-reference/websocket-api/`
- `connection.md` → `connection/index.md`
- `events.md` → `events/index.md`
- `commands.md` → `commands/index.md`
- `streaming.md` → `streaming/index.md`

#### TypeScript SDK (`api/typescript/`)
**To:** `03-api-reference/typescript-sdk/`
- All files maintain same structure

#### Plugin API (`api/plugins/`)
**To:** Split across multiple categories:
- `extension-interface.md` → `07-extensions/api-server/index.md`
- `memory-provider.md` → `06-modules/memory/providers/index.md`
- `emotion-module.md` → `06-modules/emotion/index.md`
- `cognition-module.md` → `06-modules/cognition/index.md`
- `portal-interface.md` → `08-portals/custom/index.md`
- `lifecycle.md` → `05-agents/lifecycle/index.md`

### From: Main repository docs (`../mind-agents/docs/`)
Content to be distributed across new structure:

#### `ADVANCED_AI_INTEGRATION.md`
**To:** `19-advanced-topics/`
- Split into autonomous agents, multi-modal sections

#### `ARCHITECTURE.md`
**To:** `20-architecture/`
- Expand into system design, data flow, patterns

#### `MCP_AND_API_INTEGRATION.md`
**To:** `16-integrations/mcp/`
- Create dedicated MCP integration guide

#### `MIGRATION.md`
**To:** `15-migration/version-upgrades/`
- Version migration guide

#### `PRD.md`
**To:** `01-overview/roadmap/`
- Product requirements and vision

#### Configuration Guides:
- `CONFIGURATION_GUIDE.md` → `10-deployment/configuration/`
- `PORTAL_SWITCHING_GUIDE.md` → `08-portals/`
- `TELEGRAM_SETUP.md` → `07-extensions/telegram/`

## New Content to Create

### High Priority:
1. `04-core-concepts/` - All core concept documentation
2. `06-modules/` - Detailed module documentation
3. `09-security/` - Security and compliance guides
4. `11-monitoring/` - Monitoring and observability
5. `12-testing/` - Testing documentation

### Medium Priority:
1. `13-performance/` - Performance guides
2. `14-troubleshooting/` - Common issues and FAQ
3. `17-examples/` - Code examples
4. `18-tutorials/` - Step-by-step tutorials

### Low Priority:
1. `22-community/` - Community resources
2. `23-changelog/` - Release history
3. `24-roadmap/` - Detailed roadmap
4. `25-support/` - Support documentation
5. `26-resources/` - Additional resources

## Migration Steps

1. **Backup Current Documentation**
   ```bash
   cp -r docs-site/docs docs-site/docs-backup
   ```

2. **Run Restructure Script**
   ```bash
   cd docs-site
   chmod +x restructure-docs.sh
   ./restructure-docs.sh
   ```

3. **Move Existing Content**
   ```bash
   # Run migration script (to be created)
   ./migrate-content.sh
   ```

4. **Update Sidebars Configuration**
   - Replace `sidebars.ts` with new structure
   - Update `sidebars-api.ts` if needed

5. **Update Navigation**
   - Update all internal links
   - Add breadcrumbs
   - Update search index

6. **Test Documentation**
   ```bash
   npm run start
   # Check all links work
   # Verify navigation
   ```

## Timeline

- **Phase 1 (Immediate)**: Structure creation and content migration
- **Phase 2 (Week 1)**: Create high-priority new content
- **Phase 3 (Week 2-3)**: Medium priority content
- **Phase 4 (Month 2)**: Low priority content and polish

## Success Criteria

- [ ] All existing content migrated
- [ ] No broken links
- [ ] Clear navigation structure
- [ ] Search functionality works
- [ ] Mobile responsive
- [ ] Load time under 3 seconds