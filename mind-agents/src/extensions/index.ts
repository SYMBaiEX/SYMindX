/**
 * SYMindX Extensions System
 *
 * Extension loading with modular architecture including API, Telegram, MCP, and Communication extensions
 */

import { Extension, RuntimeConfig } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

import { createAPIExtension } from './api/index';
import { createMCPServerExtension } from './mcp-server/index';
import { createRuneLiteExtension } from './runelite/index';
import { createTelegramExtension } from './telegram/index';
import { createCommunicationExtension } from './communication/index';
import { createTwitterExtension } from './twitter/index';
import { createSlackExtension } from './slack/index';

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
          port: config.extensions.api?.port || parseInt(process.env['API_PORT'] || '8000'),
          host: config.extensions.api?.host || process.env['API_HOST'] || 'localhost',
          cors: {
            enabled: config.extensions.api?.cors !== false,
            origins: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            headers: ['Content-Type', 'Authorization'],
            credentials: false,
          },
          auth: {
            enabled: config.extensions.api?.authentication?.type !== 'none',
            type: (config.extensions.api?.authentication?.type as 'bearer' | 'apikey') || 'bearer',
            secret: config.extensions.api?.authentication?.key || 'default-secret',
          },
          rateLimit: {
            enabled: !!config.extensions.api?.rateLimiting,
            windowMs: config.extensions.api?.rateLimiting?.windowMs || 60000,
            maxRequests: config.extensions.api?.rateLimiting?.maxRequests || 100,
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
        },
      };
      const apiExtension = createAPIExtension(apiConfig);
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
        token: config.extensions.telegram.botToken || process.env['TELEGRAM_BOT_TOKEN'] || '',
        settings: {
          token: config.extensions.telegram.botToken || process.env['TELEGRAM_BOT_TOKEN'] || '',
          allowedUsers: config.extensions.telegram.allowedUsers || [],
          commandPrefix: '/',
          messageHandlers: [],
          commandHandlers: [],
          errorHandlers: [],
          chatWhitelist: [],
          chatBlacklist: [],
          enableLogging: true,
          responseTimeout: 30000,
          rateLimitPerUser: 10,
          rateLimitWindow: 60000,
          maxMessageLength: 4096,
          enableMarkdown: true,
          enableInlineMode: false,
          enableWebhook: false,
          webhookPath: '/telegram-webhook',
          webhookPort: 3001,
        },
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
        extensions.push(telegramExtension as unknown as Extension);
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
          port: config.extensions.runelite.port || 8081,
          host: config.extensions.runelite.host || 'localhost',
          events: [],
          reconnectDelay: 5000,
          heartbeatInterval: 30000,
          commandTimeout: 10000,
          enableAutoReconnect: config.extensions.runelite.autoConnect !== false,
          enableHeartbeat: true,
          enableEventFiltering: true,
          enableGameStateTracking: true,
          enableAdvancedCommands: false,
          enableSecurityValidation: true,
          enableCompression: false,
          enableBatching: false,
          enableEventRecording: false,
          enableMacroSystem: false,
          enablePathfinding: false,
          enableAutomation: false,
          enablePluginBridge: false,
          allowedOrigins: ['http://localhost'],
          eventWhitelist: [],
          eventBlacklist: [],
          maxEventQueueSize: 1000,
          eventBatchSize: 10,
          eventBatchInterval: 1000,
          compressionLevel: 6,
          protocolVersion: '1.0',
          capabilities: [],
          pluginWhitelist: [],
          automationSafety: {},
        },
        priority: 1,
        dependencies: [],
        capabilities: [],
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
      const mcpServerExtension = createMCPServerExtension(mcpServerConfig);
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

  // Register Communication extension if configured
  const extensionsWithCommunication = config.extensions as RuntimeConfig['extensions'] & {
    communication?: {
      enabled?: boolean;
      enableContextPersistence?: boolean;
      enableStyleAdaptation?: boolean;
      enableExpressionVariation?: boolean;
      enableSkillsSystem?: boolean;
    };
  };

  if (extensionsWithCommunication.communication?.enabled) {
    try {
      const communicationConfig = {
        enabled: true,
        settings: {},
        priority: 1,
        dependencies: [],
        capabilities: [],
        enableContextPersistence: extensionsWithCommunication.communication.enableContextPersistence ?? true,
        enableStyleAdaptation: extensionsWithCommunication.communication.enableStyleAdaptation ?? true,
        enableExpressionVariation: extensionsWithCommunication.communication.enableExpressionVariation ?? true,
        enableSkillsSystem: extensionsWithCommunication.communication.enableSkillsSystem ?? true,
      };
      const communicationExtension = createCommunicationExtension(communicationConfig);
      extensions.push(communicationExtension as unknown as Extension);
      runtimeLogger.info('✅ Communication extension registered');
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load Communication extension:', {
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

  // Register Slack extension if configured
  const extensionsWithSlack = config.extensions as RuntimeConfig['extensions'] & {
    slack?: {
      enabled?: boolean;
      botToken?: string;
      appToken?: string;
      signingSecret?: string;
      channels?: string[];
    };
  };

  if (extensionsWithSlack.slack?.enabled) {
    try {
      const slackConfig = {
        enabled: true,
        settings: {},
        priority: 1,
        dependencies: [],
        capabilities: [],
        botToken: extensionsWithSlack.slack.botToken || process.env['SLACK_BOT_TOKEN'] || '',
        appToken: extensionsWithSlack.slack.appToken || process.env['SLACK_APP_TOKEN'] || '',
        signingSecret: extensionsWithSlack.slack.signingSecret || process.env['SLACK_SIGNING_SECRET'] || '',
        channels: extensionsWithSlack.slack.channels || [],
        socketMode: !!extensionsWithSlack.slack.appToken,
        enableThreading: true,
        enableReactions: true,
        autoJoinChannels: true,
      };

      if (!slackConfig.botToken) {
        runtimeLogger.warn(
          '⚠️ Slack extension enabled but no bot token provided'
        );
      } else {
        const slackExtension = createSlackExtension(slackConfig);
        extensions.push(slackExtension as unknown as Extension);
        runtimeLogger.info('✅ Slack extension registered');
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load Slack extension:', {
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

  // Register Twitter extension if configured
  const extensionsWithTwitter = config.extensions as RuntimeConfig['extensions'] & {
    twitter?: {
      enabled?: boolean;
      apiKey?: string;
      apiKeySecret?: string;
      accessToken?: string;
      accessTokenSecret?: string;
      bearerToken?: string;
      username?: string;
      autonomousMode?: boolean;
    };
  };

  if (extensionsWithTwitter.twitter?.enabled) {
    try {
      const twitterConfig = {
        enabled: true,
        settings: {},
        priority: 1,
        dependencies: [],
        capabilities: [],
        apiKey: extensionsWithTwitter.twitter.apiKey || process.env['TWITTER_API_KEY'] || '',
        apiKeySecret: extensionsWithTwitter.twitter.apiKeySecret || process.env['TWITTER_API_KEY_SECRET'] || '',
        accessToken: extensionsWithTwitter.twitter.accessToken || process.env['TWITTER_ACCESS_TOKEN'] || '',
        accessTokenSecret: extensionsWithTwitter.twitter.accessTokenSecret || process.env['TWITTER_ACCESS_TOKEN_SECRET'] || '',
        bearerToken: extensionsWithTwitter.twitter.bearerToken || process.env['TWITTER_BEARER_TOKEN'] || '',
        username: extensionsWithTwitter.twitter.username || process.env['TWITTER_USERNAME'] || '',
        autonomousMode: extensionsWithTwitter.twitter.autonomousMode ?? false,
      };

      if (!twitterConfig.apiKey || !twitterConfig.apiKeySecret) {
        runtimeLogger.warn(
          '⚠️ Twitter extension enabled but missing API credentials'
        );
      } else {
        const twitterExtension = createTwitterExtension(twitterConfig);
        extensions.push(twitterExtension as unknown as Extension);
        runtimeLogger.info('✅ Twitter extension registered');
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to load Twitter extension:', {
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
export { MCPServerExtension } from './mcp-server/index';
export { 
  CommunicationExtension, 
  createCommunicationExtension,
  type CommunicationExtensionConfig 
} from './communication/index';
export {
  TwitterExtension,
  createTwitterExtension,
  type TwitterConfig
} from './twitter/index';
export {
  SlackExtension,
  createSlackExtension,
  type SlackConfig
} from './slack/index';
