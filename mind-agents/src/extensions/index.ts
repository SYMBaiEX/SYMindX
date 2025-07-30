/**
 * SYMindX Extensions System
 *
 * Extension loading with modular architecture including API, Telegram, MCP, and Communication extensions
 */

import { Extension, RuntimeConfig } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

import { ApiExtension } from './api/index';
import { MCPServerExtension } from './mcp-server/index';
import { createRuneLiteExtension } from './runelite/index';
import { createTelegramExtension } from './telegram/index';

export async function registerExtensions(
  config: RuntimeConfig
): Promise<Extension[]> {
  const extensions: Extension[] = [];

  // Register API extension if configured
  if (config.extensions.api?.enabled) {
    try {
      const apiConfig = {
        enabled: true,
        settings: {
          port:
            typeof config.extensions.api?.settings === 'object' &&
            config.extensions.api.settings &&
            'port' in config.extensions.api.settings
              ? (config.extensions.api.settings.port as number)
              : parseInt(process.env['API_PORT'] || '8000'),
          host:
            typeof config.extensions.api?.settings === 'object' &&
            config.extensions.api.settings &&
            'host' in config.extensions.api.settings
              ? (config.extensions.api.settings.host as string)
              : process.env['API_HOST'] || 'localhost',
          cors: {
            enabled: true,
            origins: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            headers: ['Content-Type', 'Authorization'],
            credentials: false,
          },
          auth: {
            enabled: false,
            type: 'bearer' as const,
            secret: 'default-secret',
          },
          rateLimit: {
            enabled: true,
            windowMs: 60000,
            maxRequests: 100,
          },
          websocket: {
            enabled: true,
            path: '/ws',
            heartbeatInterval: 30000,
          },
          logging: {
            enabled: true,
            level: 'info',
            format: 'combined',
          },
          endpoints: {
            chat: true,
            status: true,
            memory: true,
            actions: true,
            health: true,
          },
          ...config.extensions.api,
        },
      };
      const apiExtension = new ApiExtension(apiConfig);
      extensions.push(apiExtension);
      runtimeLogger.info('✅ API extension registered');
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load API extension:', {
        error:
          error instanceof Error
            ? {
                code: error.name,
                message: error.message,
                ...(error.stack ? { stack: error.stack } : {}),
                cause: undefined,
              }
            : {
                code: 'UnknownError',
                message: String(error),
                cause: undefined,
              },
      });
    }
  }

  // Register Telegram extension if configured
  if (config.extensions.telegram?.enabled) {
    try {
      const telegramConfig = {
        enabled: true,
        token:
          (typeof config.extensions.telegram.botToken === 'string'
            ? config.extensions.telegram.botToken
            : '') ||
          process.env['TELEGRAM_BOT_TOKEN'] ||
          '',
        allowedUsers: Array.isArray(config.extensions.telegram.allowedUsers)
          ? config.extensions.telegram.allowedUsers
          : [],
        commandPrefix:
          typeof config.extensions.telegram.commandPrefix === 'string'
            ? config.extensions.telegram.commandPrefix
            : '/',
        maxMessageLength:
          typeof config.extensions.telegram.maxMessageLength === 'number'
            ? config.extensions.telegram.maxMessageLength
            : 4096,
        enableLogging: config.extensions.telegram.enableLogging !== false,
        settings: {},
        priority: 1,
        dependencies: [],
        capabilities: [],
      };

      if (!telegramConfig.token) {
        runtimeLogger.warn(
          '⚠️ Telegram extension enabled but no bot token provided'
        );
      } else {
        const telegramExtension = createTelegramExtension(telegramConfig);
        extensions.push(telegramExtension);
        runtimeLogger.info('✅ Telegram extension registered');
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load Telegram extension:', {
        error:
          error instanceof Error
            ? {
                code: error.name,
                message: error.message,
                ...(error.stack ? { stack: error.stack } : {}),
                cause: undefined,
              }
            : {
                code: 'UnknownError',
                message: String(error),
                cause: undefined,
              },
      });
    }
  }

  // Register RuneLite extension if configured
  if (config.extensions.runelite?.enabled) {
    try {
      const runeliteConfig = {
        enabled: true,
        settings: {
          port:
            typeof config.extensions.runelite.settings === 'object' &&
            config.extensions.runelite.settings &&
            'port' in config.extensions.runelite.settings
              ? (config.extensions.runelite.settings.port as number)
              : 8081,
          events:
            typeof config.extensions.runelite.settings === 'object' &&
            config.extensions.runelite.settings &&
            'events' in config.extensions.runelite.settings &&
            Array.isArray(config.extensions.runelite.settings.events)
              ? config.extensions.runelite.settings.events
              : [],
          ...(typeof config.extensions.runelite.settings === 'object' &&
          config.extensions.runelite.settings
            ? config.extensions.runelite.settings
            : {}),
        },
      };
      const runeliteExtension = createRuneLiteExtension(runeliteConfig);
      extensions.push(runeliteExtension as unknown as Extension);
      runtimeLogger.info('✅ RuneLite extension registered');
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load RuneLite extension:', {
        error:
          error instanceof Error
            ? {
                code: error.name,
                message: error.message,
                ...(error.stack ? { stack: error.stack } : {}),
                cause: undefined,
              }
            : {
                code: 'UnknownError',
                message: String(error),
                cause: undefined,
              },
      });
    }
  }

  // MCP Client extension removed - MCP tools now handled directly in portal integration

  // Register MCP Server extension if configured
  const extensionsWithMcp = config.extensions as RuntimeConfig['extensions'] & {
    mcpServer?: {
      enabled?: boolean;
      transport?: string;
      port?: number;
      host?: string;
      path?: string;
    };
  };

  if (extensionsWithMcp.mcpServer?.enabled) {
    try {
      const mcpServerConfig = {
        enabled: true,
        settings: {},
        priority: 1,
        dependencies: [],
        capabilities: [],
        server: {
          enabled: true,
          transport:
            typeof extensionsWithMcp.mcpServer.transport === 'string'
              ? extensionsWithMcp.mcpServer.transport
              : 'stdio',
          port:
            typeof extensionsWithMcp.mcpServer.port === 'number'
              ? extensionsWithMcp.mcpServer.port
              : 3001,
          host:
            typeof extensionsWithMcp.mcpServer.host === 'string'
              ? extensionsWithMcp.mcpServer.host
              : 'localhost',
          path:
            typeof extensionsWithMcp.mcpServer.path === 'string'
              ? extensionsWithMcp.mcpServer.path
              : '/mcp',
        },
      };
      const mcpServerExtension = new MCPServerExtension(mcpServerConfig);
      extensions.push(mcpServerExtension as unknown as Extension);
      runtimeLogger.info('✅ MCP Server extension registered');
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load MCP Server extension:', {
        error:
          error instanceof Error
            ? {
                code: error.name,
                message: error.message,
                ...(error.stack ? { stack: error.stack } : {}),
                cause: undefined,
              }
            : {
                code: 'UnknownError',
                message: String(error),
                cause: undefined,
              },
      });
    }
  }

  // Communication extension removed - not configured in RuntimeConfig

  runtimeLogger.info(`✅ Extensions: ${extensions.length} loaded`);
  return extensions;
}

// Export extension classes and types
export { ApiExtension } from './api/index';
export {
  TelegramExtension,
  createTelegramExtension,
  type TelegramConfig,
} from './telegram/index';
export { RuneLiteExtension, createRuneLiteExtension } from './runelite/index';
// export { MCPClientExtension, type MCPClientConfig } from './mcp-client/index'
// export { MCPServerExtension, type MCPServerConfig } from './mcp-server/index'
// export { CommunicationExtension, type CommunicationConfig } from './communication/index'
