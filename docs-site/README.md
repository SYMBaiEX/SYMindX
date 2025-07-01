# SYMindX Documentation Site

This is the official documentation site for SYMindX, built with Docusaurus.

## 📚 Documentation Structure

The documentation is organized into 26 main categories for easy navigation:

```
docs/
├── 01-overview/          # Introduction, use cases, roadmap
├── 02-getting-started/   # Prerequisites, installation, quick start
├── 03-api-reference/     # REST, WebSocket, TypeScript SDK, OpenAPI
├── 04-core-concepts/     # Runtime, registry, event bus, plugins
├── 05-agents/            # Configuration, character system, multi-agent
├── 06-modules/           # Memory, emotion, cognition, consciousness
├── 07-extensions/        # API server, Telegram, Slack, Discord, etc.
├── 08-portals/           # AI provider integrations
├── 09-security/          # Authentication, authorization, compliance
├── 10-deployment/        # Docker, Kubernetes, cloud, on-premise
├── 11-monitoring/        # Logging, metrics, tracing, alerts
├── 12-testing/           # Unit, integration, E2E, benchmarks
├── 13-performance/       # Optimization, scaling, caching
├── 14-troubleshooting/   # Common issues, debugging, FAQ
├── 15-migration/         # Version upgrades, data migration
├── 16-integrations/      # MCP, LangChain, vector stores
├── 17-examples/          # Basic, advanced, use cases, templates
├── 18-tutorials/         # Beginner to advanced tutorials
├── 19-advanced-topics/   # Autonomous agents, multi-modal
├── 20-architecture/      # System design, patterns
├── 21-development/       # Contributing, code style, debugging
├── 22-community/         # Forums, Discord, contributors
├── 23-changelog/         # Releases, migration guides
├── 24-roadmap/           # Features, timeline, vision
├── 25-support/           # Documentation, community, enterprise
└── 26-resources/         # Glossary, references, tools
```

### Quick Navigation

- **Getting Started**: Start with [02-getting-started](docs/02-getting-started/) for installation and quick start
- **API Reference**: Complete API documentation in [03-api-reference](docs/03-api-reference/)
- **Core Concepts**: Understand the architecture in [04-core-concepts](docs/04-core-concepts/)
- **Examples**: Working examples in [17-examples](docs/17-examples/)

## 🚀 Development

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

```bash
# Install dependencies
bun install
# or
npm install
```

### Local Development

```bash
# Start development server
bun start
# or
npm start
```

This command starts a local development server at http://localhost:3000. Most changes are reflected live without having to restart the server.

### Build

```bash
# Build static site
bun build
# or
npm run build
```

This command generates static content into the `build` directory.

### Deployment

```bash
# Test production build locally
bun serve
# or
npm run serve
```

## 📝 Content Guidelines

### Adding New Documentation

1. Choose the appropriate category (01-26)
2. Create a new `.md` file in the correct directory
3. Add frontmatter with title and description
4. Update sidebar if needed

### Frontmatter Template

```markdown
---
sidebar_position: 1
title: "Page Title"
description: "Brief description of the page content"
---

# Page Title

Your content here...
```

### Writing Style

- **Clear Structure** - Use consistent heading hierarchy
- **Code Examples** - Include working code examples
- **Cross-references** - Link to related documentation
- **Visuals** - Add diagrams and screenshots where helpful

## 🎨 Features

- 📚 **26 organized categories** for comprehensive coverage
- 🔍 **Full-text search** (Algolia ready)
- 📱 **Mobile-responsive** design
- 🌙 **Dark mode** support
- 📝 **MDX support** for interactive content
- 🔗 **Versioning** support
- 🌐 **i18n ready** for internationalization

## 🔧 Configuration

- `docusaurus.config.ts` - Main configuration file
- `sidebars.ts` - Sidebar navigation structure
- `src/css/custom.css` - Custom styling

## 🚢 Deployment

The documentation can be deployed to any static hosting provider:

- **GitHub Pages** - Automatic deployment from repository
- **Netlify** - Connect repository for automatic builds
- **Vercel** - Git integration with preview deployments
- **AWS S3** - Static website hosting
- **Azure Static Web Apps** - Integrated CI/CD

### GitHub Actions Example

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths: ['docs-site/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: cd docs-site && npm ci
        
      - name: Build documentation
        run: cd docs-site && npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs-site/build
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test locally with `npm start`
5. Submit a pull request

### Documentation Standards

- Follow existing content structure
- Include code examples for all features
- Add screenshots for UI-related content
- Update navigation in `sidebars.ts` if adding new pages
- Test all links and code examples

## 📊 Analytics and Search

### Analytics
Configure Google Analytics in `docusaurus.config.ts`:
```typescript
gtag: {
  trackingID: 'G-XXXXXXXXXX',
  anonymizeIP: true,
}
```

### Search
Configure Algolia DocSearch:
```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'symindx',
}
```

## 🏗️ Migration Note

This documentation was restructured from 6-8 monolithic pages to 26 well-organized categories. The migration is complete with:

- ✅ 174 documentation files
- ✅ Comprehensive sidebar navigation
- ✅ All existing content migrated
- ✅ Symbolic links for backward compatibility
- ✅ Archive of migration artifacts in `migration-archive-YYYYMMDD/`

## 📚 Resources

### Docusaurus
- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Markdown Features](https://docusaurus.io/docs/markdown-features)
- [Deployment Guide](https://docusaurus.io/docs/deployment)

### SYMindX
- [SYMindX Repository](https://github.com/symindx/symindx)
- [Community Discord](https://discord.gg/symindx)
- [Issue Tracker](https://github.com/symindx/symindx/issues)

## 📄 License

This documentation is part of the SYMindX project and follows the same license.