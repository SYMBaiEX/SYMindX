/**
 * SYMindX Extensions System
 * 
 * Extension loading with modular architecture including API, Telegram, MCP, and Communication extensions
 */

import { Extension } from '../types/agent'
import { RuntimeConfig } from '../types/agent'
import { ApiExtension } from './api/index'
import { TelegramExtension, createTelegramExtension } from './telegram/index'
import { MCPServerExtension } from './mcp-server/index'

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

  // MCP Client extension removed - MCP tools now handled directly in portal integration

  // Register MCP Server extension if configured
  if ((config.extensions as any).mcpServer?.enabled) {
    try {
      const mcpServerConfig = {
        transport: (config.extensions as any).mcpServer.transport || 'stdio',
        port: (config.extensions as any).mcpServer.port || 3001,
        host: (config.extensions as any).mcpServer.host || 'localhost',
        path: (config.extensions as any).mcpServer.path || '/mcp',
        ...(config.extensions as any).mcpServer
      }
      const mcpServerExtension = new MCPServerExtension(mcpServerConfig)
      extensions.push(mcpServerExtension as any)
      console.log('✅ MCP Server extension registered')
    } catch (error) {
      console.warn('⚠️ Failed to load MCP Server extension:', error)
    }
  }

  // Communication extension removed - not configured in RuntimeConfig
  
  console.log(`✅ Extensions: ${extensions.length} loaded`)
  return extensions
}

// Export extension classes and types
export { ApiExtension } from './api/index'
export { TelegramExtension, createTelegramExtension, type TelegramConfig } from './telegram/index'
// export { MCPClientExtension, type MCPClientConfig } from './mcp-client/index'
// export { MCPServerExtension, type MCPServerConfig } from './mcp-server/index'
// export { CommunicationExtension, type CommunicationConfig } from './communication/index'