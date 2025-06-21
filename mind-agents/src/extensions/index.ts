/**
 * SYMindX Extensions
 * 
 * This module exports all available extensions for the SYMindX runtime.
 * Extensions provide external integrations and capabilities for agents.
 */

import { Extension } from '../types/agent.js'
import SlackExtension from './slack/index.js'
import RuneLiteExtension from './runelite/index.js'
import { TwitterExtension } from './twitter/index.js'
import TelegramExtension from './telegram/index.js'
import McpExtension from './mcp/index.js'
import { ApiExtension } from './api/index.js'
import GitHubExtension from './github/index.js'

export function loadExtensions(config: any): Extension[] {
  const extensions: Extension[] = []

  // Slack Extension
  if (config.slack?.enabled && process.env.SLACK_BOT_TOKEN) {
    extensions.push(new SlackExtension({
      enabled: true,
      settings: {
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET || '',
        appToken: process.env.SLACK_APP_TOKEN || ''
      }
    }))
  }

  // RuneLite Extension
  if (config.runelite?.enabled) {
    extensions.push(new RuneLiteExtension({
      enabled: true,
      ...config.runelite
    }))
  }

  // Twitter Extension
  if (config.twitter?.enabled) {
    extensions.push(new TwitterExtension({
      username: config.twitter.username || '',
      password: config.twitter.password || ''
    }))
  }

  // Telegram Extension
  if (config.telegram?.enabled && process.env.TELEGRAM_BOT_TOKEN) {
    extensions.push(new TelegramExtension({
      enabled: true,
      settings: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
      }
    }))
  }

  // MCP Extension
  if (config.mcp?.enabled) {
    // Import Logger from utils
    const { Logger } = require('../utils/logger.js')
    const logger = new Logger('[MCP]', { level: 'info' })
    
    extensions.push(new McpExtension({
      logger,
      config: config.mcp
    }))
  }

  // API Extension
  if (config.api?.enabled) {
    extensions.push(new ApiExtension({
      enabled: true,
      settings: {
        port: config.api.port || 3001,
        host: config.api.host || 'localhost',
        cors: {
          enabled: true,
          origins: ['*'],
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          headers: ['Content-Type', 'Authorization'],
          credentials: false
        },
        auth: {
          enabled: false,
          type: 'bearer',
          secret: 'default-secret'
        },
        rateLimit: {
          enabled: false,
          windowMs: 15 * 60 * 1000,
          maxRequests: 100
        },
        websocket: {
          enabled: false,
          path: '/ws',
          heartbeatInterval: 30000
        },
        logging: {
          enabled: true,
          level: 'info',
          format: 'combined'
        }
      }
    }))
  }

  // GitHub Extension
  if (process.env.GITHUB_TOKEN || (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY)) {
    extensions.push(new GitHubExtension({
      enabled: true,
      settings: {
        token: process.env.GITHUB_TOKEN,
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
        owner: process.env.GITHUB_OWNER || 'your-github-username'
      }
    }))
  }

  return extensions
}

export {
  SlackExtension,
  RuneLiteExtension,
  TwitterExtension,
  TelegramExtension,
  McpExtension,
  ApiExtension,
  GitHubExtension
}