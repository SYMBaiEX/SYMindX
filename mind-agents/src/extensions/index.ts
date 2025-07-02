/**
 * SYMindX Extensions System
 * 
 * Extension loading with modular architecture including API, Telegram, MCP, and Communication extensions
 */

import { Extension } from '../types/agent.js'
import { RuntimeConfig } from '../types/agent.js'
import { ApiExtension } from './api/index.js'
import { TelegramExtension, createTelegramExtension } from './telegram/index.js'
import { MCPClientExtension } from './mcp-client/index.js'
import { MCPServerExtension } from './mcp-server/index.js'
import { CommunicationExtension } from './communication/index.js'

export async function registerExtensions(config: RuntimeConfig): Promise<Extension[]> {
  const extensions: Extension[] = []
  
  // Register API extension if configured
  if (config.extensions.api?.enabled) {
    try {
      const apiConfig = {
        enabled: true,
        settings: {
          port: config.extensions.api?.settings?.port || parseInt(process.env.API_PORT || '8000'),
          host: config.extensions.api?.settings?.host || process.env.API_HOST || 'localhost',
          cors: {
            enabled: true,
            origins: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            headers: ['Content-Type', 'Authorization'],
            credentials: false
          },
          auth: {
            enabled: false,
            type: 'bearer' as const,
            secret: 'default-secret'
          },
          rateLimit: {
            enabled: true,
            windowMs: 60000,
            maxRequests: 100
          },
          websocket: {
            enabled: true,
            path: '/ws',
            heartbeatInterval: 30000
          },
          logging: {
            enabled: true,
            level: 'info',
            format: 'combined'
          },
          endpoints: {
            chat: true,
            status: true,
            memory: true,
            actions: true,
            health: true
          },
          ...config.extensions.api
        }
      }
      const apiExtension = new ApiExtension(apiConfig)
      extensions.push(apiExtension)
      console.log('✅ API extension registered')
    } catch (error) {
      console.warn('⚠️ Failed to load API extension:', error)
    }
  }

  // Register Telegram extension if configured
  if (config.extensions.telegram?.enabled) {
    try {
      const telegramConfig = {
        botToken: config.extensions.telegram.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
        allowedUsers: config.extensions.telegram.allowedUsers || [],
        commandPrefix: config.extensions.telegram.commandPrefix || '/',
        maxMessageLength: config.extensions.telegram.maxMessageLength || 4096,
        enableLogging: config.extensions.telegram.enableLogging !== false,
        ...config.extensions.telegram
      }
      
      if (!telegramConfig.botToken) {
        console.warn('⚠️ Telegram extension enabled but no bot token provided')
      } else {
        const telegramExtension = createTelegramExtension(telegramConfig)
        extensions.push(telegramExtension)
        console.log('✅ Telegram extension registered')
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Telegram extension:', error)
    }
  }

  // Register MCP Client extension if configured
  if (config.extensions.mcpClient?.enabled) {
    try {
      const mcpClientConfig = {
        servers: config.extensions.mcpClient.servers || [],
        autoConnect: config.extensions.mcpClient.autoConnect !== false,
        reconnectDelay: config.extensions.mcpClient.reconnectDelay || 5000,
        maxReconnectAttempts: config.extensions.mcpClient.maxReconnectAttempts || 3,
        ...config.extensions.mcpClient
      }
      const mcpClientExtension = new MCPClientExtension(mcpClientConfig)
      extensions.push(mcpClientExtension)
      console.log('✅ MCP Client extension registered')
    } catch (error) {
      console.warn('⚠️ Failed to load MCP Client extension:', error)
    }
  }

  // Register MCP Server extension if configured
  if (config.extensions.mcpServer?.enabled) {
    try {
      const mcpServerConfig = {
        transport: config.extensions.mcpServer.transport || 'stdio',
        port: config.extensions.mcpServer.port || 3001,
        host: config.extensions.mcpServer.host || 'localhost',
        path: config.extensions.mcpServer.path || '/mcp',
        ...config.extensions.mcpServer
      }
      const mcpServerExtension = new MCPServerExtension(mcpServerConfig)
      extensions.push(mcpServerExtension)
      console.log('✅ MCP Server extension registered')
    } catch (error) {
      console.warn('⚠️ Failed to load MCP Server extension:', error)
    }
  }

  // Register Communication extension if configured
  if (config.extensions.communication?.enabled) {
    try {
      const communicationConfig = {
        contextManager: {
          enabled: true,
          maxContextLength: 10000,
          compressionThreshold: 8000,
          ...config.extensions.communication.contextManager
        },
        expressionEngine: {
          enabled: true,
          defaultStyle: 'neutral',
          ...config.extensions.communication.expressionEngine
        },
        styleAdapter: {
          enabled: true,
          adaptationLevel: 'medium',
          ...config.extensions.communication.styleAdapter
        },
        ...config.extensions.communication
      }
      const communicationExtension = new CommunicationExtension(communicationConfig)
      extensions.push(communicationExtension)
      console.log('✅ Communication extension registered')
    } catch (error) {
      console.warn('⚠️ Failed to load Communication extension:', error)
    }
  }
  
  console.log(`📦 Loaded ${extensions.length} extension(s)`)
  return extensions
}

// Export extension classes and types
export { ApiExtension } from './api/index.js'
export { TelegramExtension, createTelegramExtension, type TelegramConfig } from './telegram/index.js'
export { MCPClientExtension, type MCPClientConfig } from './mcp-client/index.js'
export { MCPServerExtension, type MCPServerConfig } from './mcp-server/index.js'
export { CommunicationExtension, type CommunicationConfig } from './communication/index.js'