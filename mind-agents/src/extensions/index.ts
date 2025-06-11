/**
 * SYMindX Extensions
 * 
 * This module exports all available extensions for the SYMindX runtime.
 * Extensions provide external integrations and capabilities for agents.
 */

import { Extension } from '../types/agent.js'
import { RuntimeConfig } from '../types/agent.js'
import { SlackExtension } from './slack/index.js'
import { RuneLiteExtension } from './runelite/index.js'
import { TwitterExtension } from './twitter/index.js'
import { McpExtension } from './mcp/index.js'
import { McpClientExtension } from './mcp-client/index.js'
import { ApiExtension } from './api/index.js'
import { TelegramExtension } from './telegram/index.js'

export async function registerExtensions(config: RuntimeConfig): Promise<Extension[]> {
  const extensions: Extension[] = []
  
  // Register Slack extension if configured
  if (config.extensions.slack?.enabled) {
    const slackExtension = new SlackExtension(config.extensions.slack)
    extensions.push(slackExtension)
    console.log('✅ Slack extension registered')
  }
  
  // Register RuneLite extension if configured
  if (config.extensions.runelite?.enabled) {
    const runeliteExtension = new RuneLiteExtension(config.extensions.runelite)
    extensions.push(runeliteExtension)
    console.log('✅ RuneLite extension registered')
  }
  
  // Register Twitter extension if configured
  if (config.extensions.twitter?.enabled) {
    const twitterExtension = new TwitterExtension(config.extensions.twitter)
    extensions.push(twitterExtension)
    console.log('✅ Twitter extension registered')
  }
  
  // Register Telegram extension if configured
  if (config.extensions.telegram?.enabled) {
    const telegramExtension = new TelegramExtension(config.extensions.telegram)
    extensions.push(telegramExtension)
    console.log('✅ Telegram extension registered')
  }
  
  // Register MCP Server extension if enabled
  if (config.extensions?.mcp?.enabled) {
    const mcpExtension = new McpExtension(config.extensions.mcp)
    extensions.push(mcpExtension)
    console.log('📡 MCP Server extension registered')
  }

  // Register MCP Client extension if enabled
  if (config.extensions?.mcpClient?.enabled) {
    const mcpClientExtension = new McpClientExtension(config.extensions.mcpClient)
    extensions.push(mcpClientExtension)
    console.log('📡 MCP Client extension registered')
  }

  // Register API extension if enabled
  if (config.extensions?.api?.enabled) {
    const apiExtension = new ApiExtension(config.extensions.api)
    extensions.push(apiExtension)
    console.log('🌐 API extension registered')
  }
  
  return extensions
}

/**
 * Get all available extension types
 * @returns An array of extension metadata
 */
export function getAvailableExtensions() {
  return [
    {
      id: 'slack',
      name: 'Slack Integration',
      description: 'Enables agent interaction through Slack channels and DMs',
      version: '1.0.0',
      requiredConfig: ['botToken', 'signingSecret'],
      optionalConfig: ['appToken', 'socketMode', 'port', 'approvalTimeout']
    },
    {
      id: 'runelite',
      name: 'RuneLite Integration',
      description: 'Enables agent control of RuneScape through RuneLite plugin',
      version: '1.0.0',
      requiredConfig: ['pluginPort'],
      optionalConfig: ['autoLogin', 'skillPreferences', 'safetyLimits']
    },
    {
      id: 'twitter',
      name: 'Twitter Integration',
      description: 'Enables agent posting to Twitter via browser automation',
      version: '1.0.0',
      requiredConfig: ['username', 'password'],
      optionalConfig: ['headless', 'postingLimits', 'contentFilters']
    },
    {
      id: 'telegram',
      name: 'Telegram Integration',
      description: 'Enables agent interaction through Telegram bot API',
      version: '1.0.0',
      requiredConfig: ['botToken'],
      optionalConfig: ['rateLimits', 'sessionConfig']
    }
  ]
}

export {
  SlackExtension,
  RuneLiteExtension,
  TwitterExtension,
  McpExtension,
  McpClientExtension,
  ApiExtension,
  TelegramExtension
}