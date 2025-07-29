/**
 * Refactored API Extension for SYMindX
 * 
 * This is the main API extension class that orchestrates all API components
 * using the new modular architecture with proper separation of concerns.
 */

import {
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
} from '../../types/agent';
import { ApiConfig, ApiSettings } from './types';
import {
  APIServer,
  MiddlewareStack,
  RouteHandlers,
  WebSocketManager,
} from './components/index';
import { standardLoggers } from '../../utils/standard-logging';
import { createExtensionError, createConfigurationError } from '../../utils/standard-errors';
import {
  SQLiteChatRepository,
  createSQLiteChatRepository,
} from '../../modules/memory/providers/sqlite/chat-repository';
import {
  ChatMigrationManager,
  createChatMigrationManager,
} from '../../modules/memory/providers/sqlite/chat-migration';

export class ApiExtension implements Extension {
  id = 'api';
  name = 'API Server';
  version = '2.0.0'; // Incremented for refactored version
  type = ExtensionType.COMMUNICATION;
  enabled = true;
  status = ExtensionStatus.DISABLED;
  config: ApiConfig;
  actions: Record<string, ExtensionAction> = {};
  events: Record<string, ExtensionEventHandler> = {};

  // Core components
  private apiServer: APIServer;
  private middlewareStack: MiddlewareStack;
  private routeHandlers: RouteHandlers;
  private webSocketManager: WebSocketManager;

  // Data components
  private chatRepository?: SQLiteChatRepository;
  private migrationManager?: ChatMigrationManager;

  // State
  private agent?: Agent;
  private runtime?: any;
  private apiConfig: ApiSettings;
  private logger = standardLoggers.api;
  private isInitialized = false;

  // Context-aware properties
  context?: any;
  contextScope = 'extension:api';
  contextConfig = {
    enableInjection: true,
    scopeType: 'extension',
    autoUpdate: true,
    filterSensitive: true
  };

  constructor(config: ApiConfig) {
    this.config = config;
    this.apiConfig = {
      ...this.getDefaultSettings(),
      ...config.settings,
    };

    // Initialize components
    this.apiServer = new APIServer(this.apiConfig);
    this.middlewareStack = new MiddlewareStack(this.apiConfig);
    this.routeHandlers = new RouteHandlers(this.apiConfig);
    this.webSocketManager = new WebSocketManager(this.apiConfig);

    this.logger.debug('API Extension components initialized');
  }

  /**
   * Initialize the API extension
   */
  async init(agent: Agent, context?: any): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('API Extension already initialized');
      return;
    }

    this.logger.start('Initializing API Extension...');

    try {
      this.agent = agent;
      this.context = context;

      // Extract runtime context
      if (context?.runtime) {
        this.runtime = context.runtime;
        this.routeHandlers.setRuntime(this.runtime);
      }

      // Set the primary agent for route handlers
      this.routeHandlers.setAgent(agent);

      // Initialize chat repository if configured
      if (this.apiConfig.chat?.enabled) {
        await this.initializeChatRepository();
      }

      // Setup middleware stack
      const app = this.apiServer.getApp();
      this.middlewareStack.applyMiddleware(app);

      // Setup routes
      this.routeHandlers.setupRoutes(app);

      // Initialize WebSocket server
      const server = this.apiServer.getServer();
      if (server) {
        this.webSocketManager.initialize(server);
      }

      // Setup extension actions and events
      this.setupExtensionInterface();

      this.isInitialized = true;
      this.status = ExtensionStatus.READY;

      this.logger.info('API Extension initialized successfully', {
        version: this.version,
        port: this.apiConfig.port,
        chatEnabled: this.apiConfig.chat?.enabled ?? false,
        authEnabled: this.apiConfig.auth?.enabled ?? false,
      });

    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      this.logger.error('Failed to initialize API Extension', { error });
      throw createExtensionError('API Extension initialization failed', error);
    }
  }

  /**
   * Start the API extension
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw createExtensionError('API Extension must be initialized before starting');
    }

    if (this.status === ExtensionStatus.ACTIVE) {
      this.logger.warn('API Extension is already running');
      return;
    }

    this.logger.start('Starting API Extension...');

    try {
      // Start the API server
      await this.apiServer.start();

      // Setup graceful shutdown
      this.apiServer.setupGracefulShutdown();

      this.status = ExtensionStatus.ACTIVE;

      this.logger.info('API Extension started successfully', {
        port: this.apiConfig.port,
        host: this.apiConfig.host,
        websocketPath: this.apiConfig.websocket?.path || '/ws',
      });

    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      this.logger.error('Failed to start API Extension', { error });
      throw error;
    }
  }

  /**
   * Stop the API extension
   */
  async stop(): Promise<void> {
    if (this.status !== ExtensionStatus.ACTIVE) {
      this.logger.warn('API Extension is not running');
      return;
    }

    this.logger.start('Stopping API Extension...');

    try {
      // Stop WebSocket server
      await this.webSocketManager.stop();

      // Stop API server
      await this.apiServer.stop();

      // Close chat repository
      if (this.chatRepository) {
        await this.chatRepository.close();
      }

      this.status = ExtensionStatus.STOPPED;

      this.logger.info('API Extension stopped successfully');

    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      this.logger.error('Failed to stop API Extension', { error });
      throw error;
    }
  }

  /**
   * Get extension status and metrics
   */
  getStatus(): {
    status: ExtensionStatus;
    server: any;
    websocket: any;
    routes: any;
    metrics: any;
  } {
    return {
      status: this.status,
      server: this.apiServer.getStatus(),
      websocket: this.webSocketManager.getWebSocketMetrics(),
      routes: this.routeHandlers.getMetrics(),
      metrics: this.getOverallMetrics(),
    };
  }

  /**
   * Initialize chat repository
   */
  private async initializeChatRepository(): Promise<void> {
    if (!this.apiConfig.chat?.database?.path) {
      throw createConfigurationError('Chat database path not configured');
    }

    try {
      // Create migration manager
      this.migrationManager = createChatMigrationManager({
        dbPath: this.apiConfig.chat.database.path,
      });

      // Run migrations
      await this.migrationManager.runMigrations();

      // Create chat repository
      this.chatRepository = createSQLiteChatRepository({
        dbPath: this.apiConfig.chat.database.path,
      });

      // Initialize repository
      await this.chatRepository.initialize();

      // Connect to route handlers
      this.routeHandlers.setChatRepository(this.chatRepository);

      this.logger.info('Chat repository initialized', {
        dbPath: this.apiConfig.chat.database.path,
      });

    } catch (error) {
      this.logger.error('Failed to initialize chat repository', { error });
      throw error;
    }
  }

  /**
   * Setup extension actions and events
   */
  private setupExtensionInterface(): void {
    // Define extension actions
    this.actions = {
      sendMessage: {
        id: 'send-message',
        name: 'Send Message',
        description: 'Send a message through the API',
        category: 'communication',
        parameters: {
          message: { type: 'string', required: true },
          recipient: { type: 'string', required: false },
        },
        execute: async (params: any) => {
          // Implementation would go here
          return {
            type: 'success',
            data: { sent: true, message: params.message },
            timestamp: new Date(),
          };
        },
      },

      broadcastStatus: {
        id: 'broadcast-status',
        name: 'Broadcast Status',
        description: 'Broadcast agent status via WebSocket',
        category: 'communication',
        parameters: {
          agentId: { type: 'string', required: true },
          status: { type: 'object', required: true },
        },
        execute: async (params: any) => {
          this.webSocketManager.broadcastAgentStatus(params.agentId, params.status);
          return {
            type: 'success',
            data: { broadcasted: true },
            timestamp: new Date(),
          };
        },
      },
    };

    // Define extension events
    this.events = {
      'agent.message': async (event) => {
        // Handle agent messages
        this.logger.debug('Received agent message event', { event });
      },

      'agent.status.changed': async (event) => {
        // Broadcast status changes via WebSocket
        if (event.data?.agentId && event.data?.status) {
          this.webSocketManager.broadcastAgentStatus(event.data.agentId, event.data.status);
        }
      },

      'system.metrics.updated': async (event) => {
        // Broadcast system metrics via WebSocket
        if (event.data?.metrics) {
          this.webSocketManager.broadcastSystemMetrics(event.data.metrics);
        }
      },
    };

    this.logger.debug('Extension interface setup completed');
  }

  /**
   * Get default API settings
   */
  private getDefaultSettings(): ApiSettings {
    return {
      port: 3000,
      host: '0.0.0.0',
      timeout: 30000,
      keepAliveTimeout: 5000,
      headersTimeout: 6000,
      maxRequestSize: '10mb',
      
      cors: {
        allowedOrigins: '*',
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin'
        ],
        allowCredentials: true,
        maxAge: 86400,
      },
      
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
      },
      
      auth: {
        enabled: false,
        jwtSecret: 'default-secret-change-in-production',
        tokenExpiry: '24h',
        maxSessions: 100,
        sessionTimeout: 3600000, // 1 hour
      },
      
      websocket: {
        path: '/ws',
        compression: true,
        maxPayload: 16 * 1024, // 16KB
        heartbeatInterval: 30000, // 30 seconds
        connectionTimeout: 60000, // 60 seconds
        metricsInterval: 5000, // 5 seconds
      },
      
      chat: {
        enabled: true,
        database: {
          path: './data/chat.db',
        },
      },
    };
  }

  /**
   * Get overall extension metrics
   */
  private getOverallMetrics() {
    const serverMetrics = this.apiServer.getMetrics();
    const webSocketMetrics = this.webSocketManager.getWebSocketMetrics();
    const routeMetrics = this.routeHandlers.getMetrics();

    return {
      server: serverMetrics,
      websocket: webSocketMetrics,
      routes: routeMetrics,
      timestamp: new Date(),
      status: this.status,
      uptime: serverMetrics.uptime,
    };
  }
}

/**
 * Factory function to create API extension
 */
export function createApiExtension(config: ApiConfig): ApiExtension {
  return new ApiExtension(config);
}

// Legacy export for backward compatibility
export function createAPIExtension(config: ApiConfig): ApiExtension {
  return createApiExtension(config);
}