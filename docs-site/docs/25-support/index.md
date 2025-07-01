---
sidebar_position: 25
sidebar_label: "Support"
title: "Support"
description: "Getting help and support options"
---

# Support

Getting help and support options

## Overview

Need help with SYMindX? We offer multiple support channels to ensure you get the assistance you need, whether you're troubleshooting an issue, learning the framework, or deploying to production. Our community and support team are here to help you succeed.

## Support Channels

### 🆓 Community Support

**Discord Community**
- Instant help from 5,000+ community members
- Active core team participation
- Real-time troubleshooting
- [Join Discord](https://discord.gg/symindx)

**GitHub Discussions**
- Searchable Q&A format
- Long-form technical discussions
- Feature requests and ideas
- [Visit Discussions](https://github.com/symindx/symindx/discussions)

**Stack Overflow**
- Tagged questions with `symindx`
- SEO-friendly for future searches
- Community-driven answers
- [Ask on Stack Overflow](https://stackoverflow.com/questions/tagged/symindx)

### 📚 Documentation Support

**Official Documentation**
- Comprehensive guides and API references
- Regular updates with each release
- Search functionality
- [docs.symindx.com](https://docs.symindx.com)

**API Reference**
- Auto-generated from source code
- Type definitions and examples
- Interactive playground
- [api.symindx.com](https://api.symindx.com)

**Video Tutorials**
- Step-by-step walkthroughs
- Best practices demonstrations
- Community contributions
- [YouTube Channel](https://youtube.com/symindx)

### 🎫 Issue Tracking

**Bug Reports**
Report bugs directly on GitHub:
- [Create Bug Report](https://github.com/symindx/symindx/issues/new?template=bug_report.md)
- Include minimal reproduction
- Follow issue template
- Track resolution progress

**Feature Requests**
Suggest new features:
- [Request Feature](https://github.com/symindx/symindx/issues/new?template=feature_request.md)
- Describe use case
- Participate in discussion
- Vote on proposals

### 💼 Enterprise Support

**Professional Support Plans**
For businesses requiring guaranteed support:

**Starter Plan** ($499/month)
- Email support (48h response)
- Monthly office hours
- Priority bug fixes
- Setup assistance

**Business Plan** ($1,999/month)
- Priority email support (24h response)
- Weekly office hours
- Custom feature requests
- Architecture reviews
- Dedicated Slack channel

**Enterprise Plan** (Custom pricing)
- 24/7 dedicated support
- SLA guarantees
- On-site training
- Custom development
- Direct engineering access

[Contact Sales](mailto:enterprise@symindx.com)

## Getting Help Effectively

### Before Asking for Help

1. **Search Existing Resources**
   - Check documentation
   - Search GitHub issues
   - Review Discord history
   - Browse Stack Overflow

2. **Attempt Basic Troubleshooting**
   - Update to latest version
   - Check configuration
   - Review error logs
   - Isolate the problem

3. **Prepare Your Question**
   - Clear problem description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Writing Good Questions

**Good Question Example:**
```markdown
Title: Memory search returns empty results after upgrade to v2.0

Environment:
- SYMindX version: 2.0.0
- Node.js version: 18.17.0
- OS: Ubuntu 22.04
- Memory provider: SQLite

Problem:
After upgrading from v1.5 to v2.0, memory.search() always returns empty array.

Steps to reproduce:
1. Create agent with SQLite memory
2. Save memory: await agent.remember("test")
3. Search: await agent.memory.search({ query: "test" })
4. Returns: []

Expected: Array with saved memory
Actual: Empty array

Code:
```typescript
const agent = await createAgent({
  memory: { provider: 'sqlite', config: { dbPath: './test.db' } }
});
await agent.remember("test memory");
const results = await agent.memory.search({ query: "test" });
console.log(results); // []
```

What I've tried:
- Verified database file exists
- Checked migration logs
- Tested with fresh database
```

### Debugging Checklist

Before requesting support, try these steps:

- [ ] Check error messages and stack traces
- [ ] Enable debug logging: `DEBUG=symindx:* npm start`
- [ ] Verify all dependencies are installed
- [ ] Test with minimal configuration
- [ ] Try example code from documentation
- [ ] Check for version conflicts
- [ ] Review recent changes in your code
- [ ] Test in clean environment

## Self-Service Resources

### Knowledge Base

Common issues and solutions:

**Installation Problems**
- [Node.js version requirements](./docs/installation#requirements)
- [Dependency conflicts](./docs/troubleshooting#dependencies)
- [Platform-specific issues](./docs/installation#platforms)

**Configuration Issues**
- [Runtime configuration guide](./docs/configuration)
- [Environment variables](./docs/configuration#environment)
- [Character file format](./docs/agents#characters)

**Performance Problems**
- [Optimization guide](./docs/performance)
- [Memory management](./docs/performance#memory)
- [Scaling strategies](./docs/performance#scaling)

### Troubleshooting Guides

Step-by-step solutions:

1. [WebSocket Connection Issues](./docs/troubleshooting#websocket)
2. [Memory Provider Errors](./docs/troubleshooting#memory)
3. [Portal Authentication](./docs/troubleshooting#portals)
4. [Extension Loading Failures](./docs/troubleshooting#extensions)
5. [Performance Degradation](./docs/troubleshooting#performance)

### FAQ

**Q: Which Node.js version is required?**
A: Node.js 18.0.0 or higher. We recommend using the latest LTS version.

**Q: Can I use SYMindX with Python?**
A: While SYMindX is TypeScript-based, you can interact with agents via REST API or WebSocket from any language.

**Q: How do I migrate from v1.x to v2.0?**
A: Follow our [Migration Guide](./docs/migration/v2). Key changes include factory functions and new config structure.

**Q: Is SYMindX production-ready?**
A: Yes! Many companies use SYMindX in production. See our [Production Guide](./docs/deployment/production).

**Q: How much does it cost?**
A: SYMindX is free and open source. You only pay for AI provider API usage (OpenAI, Anthropic, etc.).

## Office Hours

### Community Office Hours

**When**: Every Tuesday, 2:00 PM PST
**Where**: Discord voice channel
**Topics**: 
- Live Q&A with core team
- Architecture discussions
- Code reviews
- Feature previews

### Enterprise Office Hours

For enterprise customers:
- Custom scheduled sessions
- Screen sharing support
- Architecture reviews
- Performance optimization

## Training & Workshops

### Free Workshops

Monthly community workshops:
- **Getting Started with SYMindX** (1st Monday)
- **Building Custom Extensions** (2nd Monday)
- **Production Best Practices** (3rd Monday)
- **Advanced Agent Patterns** (4th Monday)

[Register for Workshops](https://events.symindx.com)

### Custom Training

For teams and enterprises:
- Tailored curriculum
- On-site or remote delivery
- Hands-on exercises
- Certification program

[Request Training Quote](mailto:training@symindx.com)

## Emergency Support

### Critical Issues

For security vulnerabilities or critical bugs:

**Security Issues**
- Email: security@symindx.com
- PGP Key: [Download](https://symindx.com/pgp)
- Response time: \<24 hours

**Production Outages**
Enterprise customers can use emergency hotline:
- Phone: +1-555-SYM-INDX
- Available 24/7
- Escalation procedures

## Feedback & Suggestions

Help us improve SYMindX:

### Product Feedback
- [Feature Request Form](https://feedback.symindx.com)
- [User Survey](https://survey.symindx.com)
- [Roadmap Voting](https://roadmap.symindx.com)

### Documentation Feedback
- Click "Edit this page" on any doc
- [Report Documentation Issue](https://github.com/symindx/docs/issues)
- [Contribute to Docs](https://github.com/symindx/docs)

## Support Metrics

Our commitment to support excellence:

- **Community Response Time**: \<2 hours (Discord)
- **Issue Resolution**: 80% within 7 days
- **Documentation Updates**: Weekly
- **Enterprise SLA**: 99.9% adherence

## Next Steps

- Join our [Discord Community](https://discord.gg/symindx)
- Review [Documentation](./docs) for self-service help
- Check [Community Support](./community-support) options
- Explore [Enterprise Support](./enterprise-support) plans

Remember: The best support is a strong community. When you find solutions, share them to help others!
