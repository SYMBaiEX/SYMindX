---
sidebar_position: 1
title: "FAQ"
description: "Frequently asked questions"
---

# FAQ

Frequently asked questions

## Frequently Asked Questions

### General

**Q: What is SYMindX?**
A: SYMindX is a modular AI agent runtime that allows you to create, deploy, and manage AI agents with different personalities, capabilities, and integrations.

**Q: Which AI providers are supported?**
A: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude 3), Google (Gemini), Groq, xAI (Grok), and Ollama for local models.

**Q: Can I run multiple agents?**
A: Yes! SYMindX is designed for multi-agent systems. Each agent can have different personalities, modules, and capabilities.

**Q: Is it open source?**
A: Yes, SYMindX is open source under the MIT license.

### Setup

**Q: What are the system requirements?**
A: Node.js 18+ or Bun, 4GB RAM minimum (8GB recommended), and 500MB disk space.

**Q: Do I need all the API keys?**
A: No, you only need at least one AI provider API key. The system will use whichever providers you configure.

**Q: Can I use local models?**
A: Yes, through Ollama integration you can run models locally without API keys.

**Q: How do I update SYMindX?**
A: Pull the latest changes from git and run `bun install` to update dependencies.

### Development

**Q: How do I create a custom module?**
A: Implement the module interface and register it with the registry. See [Plugin Development](/docs/21-development/plugin-development).

**Q: Can I add new AI providers?**
A: Yes, create a new portal implementation. See [Custom Portals](/docs/08-portals/custom).

**Q: How do I debug agents?**
A: Enable debug logging with `LOG_LEVEL=debug` and use the built-in monitoring tools.

**Q: Is TypeScript required?**
A: While SYMindX is written in TypeScript, you can use JavaScript if preferred.

### Deployment

**Q: Can I deploy to the cloud?**
A: Yes, SYMindX can be deployed to AWS, GCP, Azure, or any platform that supports Docker.

**Q: Is it production-ready?**
A: Yes, with proper configuration for security, monitoring, and scaling.

**Q: How do I scale horizontally?**
A: Run multiple instances behind a load balancer. Agents can be distributed across instances.

**Q: What about data persistence?**
A: Use PostgreSQL, Supabase, or Neon for production data persistence.

### Troubleshooting

**Q: Agent isn't responding?**
A: Check logs, verify API keys, ensure the agent is started, and check the portal connection.

**Q: WebSocket keeps disconnecting?**
A: Implement reconnection logic and check for proxy/firewall issues.

**Q: High latency responses?**
A: Try a faster model (GPT-3.5 vs GPT-4), enable caching, or use a closer API region.

**Q: Memory errors?**
A: Increase Node.js memory limit or optimize your memory queries.

### Security

**Q: How are API keys protected?**
A: Use environment variables, never commit to git, and rotate regularly.

**Q: Is data encrypted?**
A: Yes, data can be encrypted at rest and all API communication uses TLS.

**Q: Can I add authentication?**
A: Yes, see [Authentication](/docs/09-security/authentication) for options.

**Q: Is it GDPR compliant?**
A: SYMindX provides tools for compliance, but implementation depends on your usage.
