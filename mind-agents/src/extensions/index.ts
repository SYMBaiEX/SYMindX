/**
 * SYMindX Extensions (Emergency Cleanup Version)
 * 
 * Simplified extension loading with only API extension
 */

import { Extension } from '../types/agent.js'
import { RuntimeConfig } from '../types/agent.js'
import { ApiExtension } from './api/index.js'
import { TelegramExtension, createTelegramExtension } from './telegram/index.js'

export async function registerExtensions(config: RuntimeConfig): Promise<Extension[]> {
  const extensions: Extension[] = []
  
  // Register API extension if configured
  if (config.extensions.api?.enabled) {
    try {
      const apiConfig = {
        enabled: true,
        settings: {
          port: 8080,
          host: 'localhost',
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
  
  console.log(`📦 Loaded ${extensions.length} extension(s)`)
  return extensions
}

// Export extension classes and types
export { ApiExtension } from './api/index.js'
export { TelegramExtension, createTelegramExtension, type TelegramConfig } from './telegram/index.js'