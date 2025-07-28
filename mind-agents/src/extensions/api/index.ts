/**
 * API Extension for SYMindX
 * Provides HTTP REST API and WebSocket server capabilities
 */

import { createServer } from 'http';
import * as http from 'http';
import * as os from 'os';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';

import { CommandSystem } from '../../core/command-system';
import {
  ChatMigrationManager,
  createChatMigrationManager,
} from '../../modules/memory/providers/sqlite/chat-migration';
import {
  SQLiteChatRepository,
  createSQLiteChatRepository,
} from '../../modules/memory/providers/sqlite/chat-repository';
import {
  SenderType,
  MessageType,
  MessageStatus,
  ConversationStatus,
  ParticipantType,
} from '../../modules/memory/providers/sqlite/chat-types';
import {
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
  ActionCategory,
  ActionResult,
  ActionResultType,
  AgentEvent,
} from '../../types/agent';
import { SkillParameters } from '../../types/common';
import type {
  WebSocketMessage,
  WebSocketResponse,
  AgentStatusPayload,
  SystemMetricsPayload,
  SpawnAgentPayload,
  RouteConversationPayload,
} from '../../types/extensions/api';
import { MemoryTierType, MemoryDuration } from '../../types/memory';
import { runtimeLogger } from '../../utils/logger';

import AdminDashboard from './admin-dashboard';
import {
  ApiConfig,
  ApiSettings,
  ChatRequest,
  ChatResponse,
  MemoryRequest,
  MemoryResponse,
  ActionRequest,
  ActionResponse,
  ConnectionInfo,
} from './types';
// WebSocketServerSkill removed - using simple WebSocket server directly
import { WebUIServer } from './webui/index';
// import { GraphQLServer, GraphQLContext, schema } from './graphql'; // TEMP: Commented out for testing
// import { graphqlHTTP } from 'express-graphql'; // TEMP: Commented out for testing

export class ApiExtension implements Extension {
  id = 'api';
  name = 'API Server';
  version = '1.0.0';
  type = ExtensionType.COMMUNICATION;
  enabled = true;
  status = ExtensionStatus.DISABLED;
  config: ApiConfig;
  actions: Record<string, ExtensionAction> = {};
  events: Record<string, ExtensionEventHandler> = {};

  private agent?: Agent;
  private app: express.Application;
  private server?: http.Server;
  private wss?: WebSocketServer;
  private apiConfig: ApiSettings;
  private connections = new Map<string, WebSocket>();
  private _rateLimiters = new Map<
    string,
    { count: number; resetTime: number }
  >();
  // Enhanced WebSocket removed - using simple WebSocket server
  private webUI?: WebUIServer;
  private commandSystem?: CommandSystem;
  // private graphqlServer?: GraphQLServer; // TEMP: Commented out for testing
  private adminDashboard?: AdminDashboard;

  // Metrics tracking
  private metrics = {
    commandsProcessed: 0,
    portalRequests: 0,
    websocketConnections: 0,
    httpRequests: 0,
    errors: 0,
    graphqlRequests: 0,
    startTime: Date.now(),
  };
  private runtime?: {
    agents?: Map<string, Agent>;
    lazyAgents?: Map<
      string,
      {
        id: string;
        name: string;
        state: string;
        lastActivated?: Date;
        characterConfig?: Record<string, unknown>;
        config?: Record<string, unknown>;
      }
    >;
    activateAgent?: (agentId: string) => Promise<void>;
    deactivateAgent?: (agentId: string) => Promise<void>;
    multiAgentManager?: {
      spawnAgent: (params: SpawnAgentPayload) => Promise<string>;
      startAgent: (agentId: string) => Promise<void>;
      stopAgent: (agentId: string) => Promise<void>;
      restartAgent: (agentId: string) => Promise<void>;
      getAgentHealth: (agentId: string) => AgentStatusPayload;
      listAgents: () => AgentStatusPayload[];
      getSystemMetrics: () => SystemMetricsPayload;
      findAgentsBySpecialty: (specialty: string) => AgentStatusPayload[];
      routeConversation: (
        requirements: RouteConversationPayload
      ) => Agent | null;
    };
    getStats?: () => Record<string, unknown>;
  };
  private chatRepository?: SQLiteChatRepository;
  private migrationManager?: ChatMigrationManager;
  private activeConversations: Map<string, string> = new Map(); // userId -> conversationId

  constructor(config: ApiConfig) {
    this.config = config;
    this.apiConfig = {
      ...this.getDefaultSettings(),
      ...config.settings,
    };
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async init(agent: Agent): Promise<void> {
    this.agent = agent;

    // Initialize chat persistence
    await this.initializeChatPersistence();

    // Initialize command system integration
    if (!this.commandSystem) {
      this.commandSystem = new CommandSystem();
    }

    // Register agent with command system
    this.commandSystem.registerAgent(agent);

    // Register extension actions and events
    this.registerExtensionActions();

    // Start the API server
    await this.start();
  }

  async tick(agent: Agent): Promise<void> {
    // Broadcast agent status updates via WebSocket
    if (this.wss) {
      const agentUpdate = {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        version: '1.0.0', // Default version
        type: 'standard', // Default type
        enabled: true, // Default enabled
        state: {}, // Default state
        memory: {
          totalRecords: 0,
          recentRecords: 0,
          oldestRecord: null,
          newestRecord: null,
        },
        portal: {
          id: agent.portal?.id || 'none',
          type: agent.portal?.type || 'none',
          status: 'active',
        },
        emotion: agent.emotion?.getCurrentState
          ? agent.emotion.getCurrentState()
          : {
              primaryEmotion: 'neutral',
              intensity: 0.5,
              secondaryEmotions: [],
            },
        cognition: {
          mode: 'reactive',
          load: 0.2,
          processing: 'idle',
        },
        performance: {
          responseTime: 0, // Default response time
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user,
        },
        lastActivity: agent.lastUpdate || new Date(),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all connected WebSocket clients
      this.broadcast({
        type: 'event',
        event: 'agent_update',
        agentId: agent.id,
        data: agentUpdate,
        timestamp: new Date().toISOString(),
      });

      // Publish to GraphQL subscribers
      // TEMP: GraphQL publishing commented out for testing
      // if (this.graphqlServer) {
      //   this.graphqlServer.publish('agentUpdate', {
      //     agentUpdate: agentUpdate,
      //   });
      // }
    }

    // Store the agent for API access
    this.agent = agent;

    // Update metrics
    this.metrics.httpRequests++;
  }

  /**
   * Get the connected agent (for health monitoring and other skills)
   */
  getAgent(): Agent | undefined {
    return this.agent;
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcast(message: WebSocketMessage): void {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Handle chat request from skills
   */
  async handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
    if (!this.agent) {
      throw new Error('No agent connected to API extension');
    }

    // Basic chat handling - delegate to agent's portal or cognition
    const response = 'Chat handling implementation needed';

    const builder: ChatResponse = {
      response,
      timestamp: new Date().toISOString(),
      metadata: {
        processingTime: 0,
        memoryRetrieved: false,
      },
    };

    // Only add sessionId if it exists
    if (request.context?.sessionId) {
      builder.sessionId = request.context.sessionId;
    }

    return builder;
  }

  private getDefaultSettings(): ApiSettings {
    return {
      port: parseInt(
        process.env.API_PORT || String(this.config.settings?.port) || '8000'
      ),
      host: this.config.settings?.host || '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization'],
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
      auth: {
        enabled: false,
        type: 'bearer',
        secret: process.env.API_SECRET || 'default-secret',
      },
      logging: {
        enabled: true,
        level: 'info',
        format: 'combined',
      },
    };
  }

  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));

    // Add middleware to track HTTP requests
    this.app.use((req, res, next) => {
      this.metrics.httpRequests++;
      next();
    });
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS
    if (this.apiConfig.cors.enabled) {
      this.app.use(
        cors({
          origin: this.apiConfig.cors.origins,
          methods: this.apiConfig.cors.methods,
          allowedHeaders: this.apiConfig.cors.headers,
          credentials: true,
        })
      );
    }

    // Rate limiting
    if (this.apiConfig.rateLimit.enabled) {
      const limiter = rateLimit({
        windowMs: this.apiConfig.rateLimit.windowMs,
        max: this.apiConfig.rateLimit.maxRequests,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use(limiter);
    }

    // Authentication middleware
    if (this.apiConfig.auth.enabled) {
      this.app.use(this.authMiddleware.bind(this));
    }

    // Set up periodic cleanup of rate limiters
    setInterval(() => {
      this.cleanupRateLimiters();
    }, 60000); // Every minute
  }

  private authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring(7);
    if (token !== this.apiConfig.auth.secret) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    next();
  }

  /**
   * Custom rate limiting for specific endpoints
   */
  private checkCustomRateLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const limiter = this._rateLimiters.get(identifier);

    if (!limiter || now > limiter.resetTime) {
      // Reset or create new limiter
      this._rateLimiters.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (limiter.count >= limit) {
      return false; // Rate limit exceeded
    }

    limiter.count++;
    return true;
  }

  /**
   * Clean up expired rate limiters
   */
  private cleanupRateLimiters(): void {
    const now = Date.now();
    for (const [key, limiter] of this._rateLimiters.entries()) {
      if (now > limiter.resetTime) {
        this._rateLimiters.delete(key);
      }
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get(
      '/health',
      (_req: express.Request, res: express.Response): void => {
        res.json({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: this.version,
          },
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Status endpoint with custom rate limiting
    this.app.get(
      '/status',
      (req: express.Request, res: express.Response): void => {
        // Apply custom rate limiting for status endpoint
        const clientIp = req.ip;
        if (!this.checkCustomRateLimit(`status:${clientIp}`, 60, 60000)) {
          // 60 requests per minute
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Rate limit exceeded for status endpoint',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get runtime stats if available
        const runtimeStats = this.runtime?.getStats
          ? this.runtime.getStats()
          : null;

        res.json({
          success: true,
          data: {
            agent: {
              id: this.agent?.id || 'unknown',
              status: this.agent?.status || 'unknown',
              uptime: process.uptime(),
            },
            extensions: {
              loaded: this.agent?.extensions?.length || 0,
              active:
                this.agent?.extensions?.filter((ext) => ext.enabled).length ||
                0,
            },
            memory: {
              used: process.memoryUsage().heapUsed,
              total: process.memoryUsage().heapTotal,
              heapUsed: process.memoryUsage().heapUsed,
              heapTotal: process.memoryUsage().heapTotal,
              external: process.memoryUsage().external,
              arrayBuffers: process.memoryUsage().arrayBuffers,
            },
            runtime: runtimeStats
              ? {
                  isRunning: Boolean((runtimeStats as any).isRunning),
                  agents: Number((runtimeStats as any).agents) || 0,
                  autonomousAgents:
                    Number((runtimeStats as any).autonomousAgents) || 0,
                }
              : {
                  agents: 0,
                  isRunning: false,
                  autonomousAgents: 0,
                },
          },
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Runtime metrics endpoint
    this.app.get(
      '/api/metrics',
      (_req: express.Request, res: express.Response): void => {
        const agentsMap = this.getAgentsMap();
        let totalCommands = 0;
        let totalPortalRequests = 0;

        // Calculate metrics from all agents
        // Use actual metrics instead of placeholders
        totalCommands = this.metrics.commandsProcessed;
        totalPortalRequests = this.metrics.portalRequests;

        const metrics: SystemMetricsPayload = {
          uptime: process.uptime() * 1000, // Convert to milliseconds
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
            arrayBuffers: process.memoryUsage().arrayBuffers,
          },
          activeAgents: Array.from(agentsMap.values()).filter(
            (a) => a.status === 'active'
          ).length,
          totalAgents: agentsMap.size,
          commandsProcessed: totalCommands,
          portalRequests: totalPortalRequests,
          runtime: this.runtime?.getStats
            ? {
                isRunning: (this.runtime.getStats() as any).isRunning || false,
                agents: (this.runtime.getStats() as any).agents || 0,
                autonomousAgents:
                  (this.runtime.getStats() as any).autonomousAgents || 0,
              }
            : {
                isRunning: false,
                agents: 0,
                autonomousAgents: 0,
              },
        };

        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Agents endpoint (also available at /api/agents for consistency)
    this.app.get(
      '/agents',
      (_req: express.Request, res: express.Response): void => {
        const agents: AgentStatusPayload[] = [];

        // Get all agents from the agents map
        const agentsMap = this.getAgentsMap();
        for (const [id, agent] of agentsMap) {
          // Filter out runtime agent - only show character agents
          if (id === 'runtime') continue;

          agents.push({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            emotion: agent.emotion?.current,
            lastUpdate: agent.lastUpdate,
            extensionCount: agent.extensions?.length || 0,
            hasPortal: !!agent.portal,
            ethicsEnabled:
              (agent.characterConfig as any)?.ethics?.enabled !== false,
          });
        }

        res.json({
          success: true,
          data: { agents },
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Also register at /api/agents for consistency with WebUI
    this.app.get(
      '/api/agents',
      (_req: express.Request, res: express.Response): void => {
        const agents: AgentStatusPayload[] = [];

        // Get all agents from the agents map
        const agentsMap = this.getAgentsMap();

        // Log the Map contents
        const mapContents = Array.from(agentsMap.entries()).map(
          ([id, agent]) => ({ id, name: agent.name })
        );
        runtimeLogger.debug(
          `agentsMap contents: ${JSON.stringify(mapContents, null, 2)}`
        );
        runtimeLogger.debug(`agentsMap size: ${agentsMap.size}`);

        for (const [id, agent] of agentsMap) {
          // Filter out runtime agent - only show character agents
          if (id === 'runtime') continue;

          runtimeLogger.debug(`Processing agent ${id} (${agent.name})`);

          agents.push({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            emotion: agent.emotion?.current,
            lastUpdate: agent.lastUpdate,
            extensionCount: agent.extensions?.length || 0,
            hasPortal: !!agent.portal,
            ethicsEnabled:
              (agent.characterConfig as any)?.ethics?.enabled !== false,
          });
        }

        runtimeLogger.debug(`Final agents array length: ${agents.length}`);

        res.json({
          success: true,
          data: { agents },
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Get MCP tools for debugging
    this.app.get(
      '/api/agent/:agentId/tools',
      (req: express.Request, res: express.Response): void => {
        const { agentId } = req.params;
        if (!agentId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Agent ID is required',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        const agentsMap = this.getAgentsMap();
        const agent = agentsMap.get(agentId!);

        if (!agent) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Agent not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const tools = agent.toolSystem || {};
        const toolList = Object.entries(tools).map(([name, def]) => {
          const tool = def as {
            description?: string;
            parameters?: unknown;
            execute?: unknown;
          };
          return {
            name,
            type: typeof def,
            hasDescription: !!tool.description,
            hasParameters: !!tool.parameters,
            hasExecute: !!tool.execute,
          };
        });

        res.json({
          agentId,
          agentName: agent.name,
          toolCount: Object.keys(tools).length,
          tools: toolList,
        });
      }
    );

    // Get individual agent details
    this.app.get(
      '/api/agent/:agentId',
      (req: express.Request, res: express.Response): void => {
        const { agentId } = req.params;
        if (!agentId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Agent ID is required',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        const agentsMap = this.getAgentsMap();
        const agent = agentsMap.get(agentId!);

        if (!agent) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Agent not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Return detailed agent information
        res.json({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          emotion: agent.emotion?.current,
          lastUpdate: agent.lastUpdate,
          commandsProcessed: this.metrics.commandsProcessed,
          memoryUsage: process.memoryUsage().heapUsed,
          extensions:
            agent.extensions?.map((ext: Extension) => ({
              name: ext.name,
              enabled: ext.enabled,
              status: ext.status,
            })) || [],
          capabilities: (agent as any).capabilities || [],
          personality: agent.personality || 'neutral',
          portal: agent.portal
            ? {
                type: agent.portal.type,
                status: agent.portal.status,
              }
            : null,
        });
      }
    );

    // Redirect old chat endpoint to new API
    this.app.post('/chat', async (_req, res): Promise<void> => {
      res.redirect(307, '/api/chat');
    });

    // New API chat endpoints
    // General chat endpoint
    this.app.post(
      '/api/chat',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          // Track command processing
          this.metrics.commandsProcessed++;

          const chatRequest: ChatRequest = req.body;
          if (!chatRequest.message) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: 'Message is required',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Process chat message through agent
          const response = await this.processChatMessage(chatRequest);
          res.json({
            success: true,
            data: response,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Chat handler error:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    );

    // Agent-specific chat endpoint
    this.app.post(
      '/api/chat/:agentId',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;
          const chatRequest: ChatRequest = {
            ...req.body,
            agentId: agentId!, // Override any agentId in body with URL param
          };

          if (!chatRequest.message) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: 'Message is required',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Validate agent exists
          const agentsMap = this.getAgentsMap();
          if (
            agentId &&
            !agentsMap.has(agentId) &&
            !this.runtime?.lazyAgents?.has(agentId)
          ) {
            res.status(404).json({
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: `Agent '${agentId}' not found`,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Process chat message through specific agent
          const response = await this.processChatMessage(chatRequest);
          res.json({
            success: true,
            data: response,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Chat handler error:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    );

    // Chat history endpoint
    this.app.get(
      '/chat/history/:agentId',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;
          const limit = parseInt(req.query.limit as string) || 50;
          const userId = (req.query.userId as string) || 'default_user';

          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          // Find or create conversation
          const conversationId = await this.getOrCreateConversationId(
            userId,
            agentId!
          );

          const messages = await this.chatRepository.listMessages({
            conversationId,
            limit,
            includeDeleted: false,
          });

          // Convert to API format
          const apiMessages = messages.map((msg) => ({
            id: msg.id,
            agentId: agentId!,
            sender: msg.senderType === SenderType.USER ? 'user' : 'agent',
            message: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          }));

          res.json({
            agentId: agentId!,
            messages: apiMessages.reverse(), // Most recent last
            total: apiMessages.length,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error fetching chat history:', error);
          res.status(500).json({ error: 'Failed to fetch chat history' });
        }
      }
    );

    // Clear chat history endpoint
    this.app.delete(
      '/chat/history/:agentId',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;
          const userId = (req.query.userId as string) || 'default_user';

          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const conversationId = this.activeConversations.get(userId);
          if (conversationId) {
            await this.chatRepository.deleteConversation(
              conversationId,
              'api_user'
            );
            this.activeConversations.delete(userId);
          }

          res.json({ success: true, agentId });
        } catch (error) {
          void error;
          runtimeLogger.error('Error clearing chat history:', error);
          res.status(500).json({ error: 'Failed to clear chat history' });
        }
      }
    );

    // Memory endpoints
    this.app.get('/memory', async (_req, res): Promise<void> => {
      try {
        const memories = await this.getMemories();
        res.json({ memories });
      } catch (error) {
        void error;
        res.status(500).json({ error: 'Failed to retrieve memories' });
      }
    });

    this.app.post(
      '/memory',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const memoryRequest: MemoryRequest = req.body;
          const result = await this.storeMemory(memoryRequest);
          res.json(result);
        } catch (error) {
          void error;
          res.status(500).json({ error: 'Failed to store memory' });
        }
      }
    );

    // Action endpoint
    this.app.post(
      '/action',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const actionRequest: ActionRequest = req.body;
          const result = await this.executeAction(actionRequest);
          res.json(result);
        } catch (error) {
          void error;
          res.status(500).json({ error: 'Failed to execute action' });
        }
      }
    );

    // Multi-Agent Management Endpoints

    // Spawn new agent
    this.app.post(
      '/api/agents/spawn',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const {
            characterId,
            instanceName,
            config,
            priority,
            autoStart = true,
          } = req.body;

          if (!characterId) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: 'characterId is required',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (!this.runtime?.multiAgentManager) {
            res.status(503).json({
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Multi-Agent Manager not available',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          const agentId = await this.runtime.multiAgentManager.spawnAgent({
            characterId,
            instanceName,
            config,
            priority,
            autoStart,
          });

          res.json({
            success: true,
            data: {
              agentId: agentId!,
              characterId,
              instanceName,
              message: `Agent spawned successfully: ${instanceName || characterId}`,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error spawning agent:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to spawn agent',
              details: error instanceof Error ? error.message : String(error),
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    );

    // Start/Activate agent (works for both lazy and multi-agent manager)
    this.app.post(
      '/api/agents/:agentId/start',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;

          if (!agentId) {
            res.status(400).json({
              success: false,
              error: 'Agent ID is required',
            });
            return;
          }

          // First try to activate lazy agent
          if (
            this.runtime &&
            typeof this.runtime.activateAgent === 'function'
          ) {
            try {
              await this.runtime.activateAgent(agentId);
              res.json({
                success: true,
                agentId,
                message: `Agent activated successfully`,
              });
              return;
            } catch (lazyError) {
              // If lazy activation fails, continue to multi-agent manager
              runtimeLogger.debug(
                `Lazy activation failed for ${agentId}, trying multi-agent manager: ${lazyError instanceof Error ? lazyError.message : String(lazyError)}`
              );
            }
          }

          // Fallback to multi-agent manager
          if (!this.runtime?.multiAgentManager) {
            res.status(503).json({ error: 'Agent management not available' });
            return;
          }

          await this.runtime.multiAgentManager.startAgent(agentId);

          res.json({
            success: true,
            agentId: agentId!,
            message: `Agent started successfully`,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error starting agent:', error);
          res.status(500).json({
            error: 'Failed to start agent',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    // Stop agent
    this.app.post(
      '/api/agents/:agentId/stop',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;

          if (!agentId) {
            res.status(400).json({
              success: false,
              error: 'Agent ID is required',
            });
            return;
          }

          // First try to deactivate lazy agent
          if (
            this.runtime &&
            typeof this.runtime.deactivateAgent === 'function'
          ) {
            try {
              await this.runtime.deactivateAgent(agentId);
              res.json({
                success: true,
                agentId,
                message: `Agent deactivated successfully`,
              });
              return;
            } catch (lazyError) {
              // If lazy deactivation fails, continue to multi-agent manager
              runtimeLogger.debug(
                `Lazy deactivation failed for ${agentId}, trying multi-agent manager: ${lazyError instanceof Error ? lazyError.message : String(lazyError)}`
              );
            }
          }

          // Fallback to multi-agent manager
          if (!this.runtime?.multiAgentManager) {
            res.status(503).json({ error: 'Agent management not available' });
            return;
          }

          await this.runtime.multiAgentManager.stopAgent(agentId);

          res.json({
            success: true,
            agentId: agentId!,
            message: `Agent stopped successfully`,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error stopping agent:', error);
          res.status(500).json({
            error: 'Failed to stop agent',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    // Restart agent
    this.app.post(
      '/api/agents/:agentId/restart',
      async (req: express.Request, res: express.Response): Promise<void> => {
        try {
          const { agentId } = req.params;

          if (!agentId) {
            res.status(400).json({
              success: false,
              error: 'Agent ID is required',
            });
            return;
          }

          if (!this.runtime?.multiAgentManager) {
            res
              .status(503)
              .json({ error: 'Multi-Agent Manager not available' });
            return;
          }

          await this.runtime.multiAgentManager.restartAgent(agentId);

          res.json({
            success: true,
            agentId: agentId!,
            message: `Agent restarted successfully`,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error restarting agent:', error);
          res.status(500).json({
            error: 'Failed to restart agent',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    // Get agent health
    this.app.get(
      '/api/agents/:agentId/health',
      (req: express.Request, res: express.Response): void => {
        try {
          const { agentId } = req.params;

          if (!agentId) {
            res.status(400).json({
              success: false,
              error: 'Agent ID is required',
            });
            return;
          }

          if (!this.runtime?.multiAgentManager) {
            res
              .status(503)
              .json({ error: 'Multi-Agent Manager not available' });
            return;
          }

          const health = this.runtime.multiAgentManager.getAgentHealth(agentId);

          if (!health) {
            res.status(404).json({ error: 'Agent not found' });
            return;
          }

          res.json(health);
        } catch (error) {
          void error;
          runtimeLogger.error('Error getting agent health:', error);
          res.status(500).json({
            error: 'Failed to get agent health',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    // List all managed agents
    this.app.get('/api/agents/managed', (_req, res): void => {
      try {
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' });
          return;
        }

        const agents = this.runtime.multiAgentManager.listAgents();
        res.json({ agents });
      } catch (error) {
        void error;
        runtimeLogger.error('Error listing managed agents:', error);
        res.status(500).json({
          error: 'Failed to list managed agents',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Get system metrics including multi-agent info
    this.app.get('/api/agents/metrics', (_req, res): void => {
      try {
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' });
          return;
        }

        const metrics = this.runtime.multiAgentManager.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        void error;
        runtimeLogger.error('Error getting system metrics:', error);
        res.status(500).json({
          error: 'Failed to get system metrics',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Find agents by specialty
    this.app.get('/api/agents/specialty/:specialty', (req, res): void => {
      try {
        const { specialty } = req.params;

        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' });
          return;
        }

        const agents =
          this.runtime.multiAgentManager.findAgentsBySpecialty(specialty);
        res.json({
          specialty,
          agents: agents.map((agent: AgentStatusPayload) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status,
          })),
        });
      } catch (error) {
        void error;
        runtimeLogger.error('Error finding agents by specialty:', error);
        res.status(500).json({
          error: 'Failed to find agents by specialty',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Route conversation to best agent
    this.app.post(
      '/api/agents/route',
      (req: express.Request, res: express.Response): void => {
        try {
          const requirements = req.body;

          if (!this.runtime?.multiAgentManager) {
            res.status(503).json({
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Multi-Agent Manager not available',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          const agent =
            this.runtime.multiAgentManager.routeConversation(requirements);

          if (!agent) {
            res
              .status(404)
              .json({ error: 'No suitable agent found for requirements' });
            return;
          }

          res.json({
            agentId: agent.id,
            name: agent.name,
            status: agent.status,
            requirements,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error routing conversation:', error);
          res.status(500).json({
            error: 'Failed to route conversation',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    // Stats endpoint
    this.app.get('/api/stats', (_req, res): void => {
      const runtimeStats = this.getRuntimeStats();
      const commandStats = this.commandSystem
        ? this.commandSystem.getStats()
        : {
            totalCommands: 0,
            completedCommands: 0,
            failedCommands: 0,
            pendingCommands: 0,
            processingCommands: 0,
            avgResponseTime: 0,
            activeConnections: 0,
          };

      // Add WebSocket connection count
      if (this.wss && 'activeConnections' in commandStats) {
        // Get connection count from the WebSocket server
        commandStats.activeConnections = this.connections.size;
      }

      // Add multi-agent metrics if available
      let multiAgentMetrics = null;
      if (this.runtime?.multiAgentManager) {
        try {
          multiAgentMetrics = this.runtime.multiAgentManager.getSystemMetrics();
        } catch (error) {
          void error;
          runtimeLogger.warn(
            `Failed to get multi-agent metrics: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      res.json({
        runtime: runtimeStats,
        commands: commandStats,
        multiAgent: multiAgentMetrics,
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
          totalSystemMemory: os.totalmem(),
          freeSystemMemory: os.freemem(),
        },
      });
    });

    // Commands endpoint for recent command history
    this.app.get('/api/commands', (req, res): void => {
      const agentId = req.query.agent as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!this.commandSystem) {
        res.json([]);
        return;
      }

      let commands = this.commandSystem.getAllCommands();

      if (agentId) {
        commands = commands.filter((cmd) => cmd.agentId === agentId);
      }

      // Sort by timestamp and limit
      commands = commands
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      res.json(
        commands.map((cmd) => ({
          id: cmd.id,
          agentId: cmd.agentId,
          instruction: cmd.instruction,
          type: cmd.type,
          status: cmd.status,
          timestamp: cmd.timestamp,
          result: cmd.result,
          executionTime: cmd.result?.executionTime,
        }))
      );
    });

    // Conversation endpoints
    this.app.get('/api/conversations', async (req, res): Promise<void> => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' });
          return;
        }

        const userId = (req.query.userId as string) || 'default_user';
        const agentId = req.query.agentId as string;
        const status = req.query.status as ConversationStatus;
        const limit = parseInt(req.query.limit as string) || 50;

        const conversations = await this.chatRepository.listConversations({
          userId,
          agentId: agentId!,
          status,
          limit,
          orderBy: 'updated',
          orderDirection: 'desc',
        });

        res.json({ conversations });
      } catch (error) {
        void error;
        runtimeLogger.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
      }
    });

    this.app.post('/api/conversations', async (req, res): Promise<void> => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' });
          return;
        }

        const { agentId, userId = 'default_user', title } = req.body;

        if (!agentId) {
          res.status(400).json({ error: 'Agent ID is required' });
          return;
        }

        const conversation = await this.chatRepository.createConversation({
          agentId: agentId!,
          userId,
          title: title || `Chat with ${agentId}`,
          status: ConversationStatus.ACTIVE,
          messageCount: 0,
          metadata: {
            createdVia: 'api',
            agentName: this.agent?.name || agentId,
          },
        });

        // Set as active conversation for this user
        this.activeConversations.set(userId, conversation.id);

        res.json({ conversation });
      } catch (error) {
        void error;
        runtimeLogger.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
      }
    });

    this.app.get(
      '/api/conversations/:conversationId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId } = req.params;
          const conversation =
            await this.chatRepository.getConversation(conversationId);

          if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
          }

          res.json({ conversation });
        } catch (error) {
          void error;
          runtimeLogger.error('Error fetching conversation:', error);
          res.status(500).json({ error: 'Failed to fetch conversation' });
        }
      }
    );

    this.app.get(
      '/api/conversations/:conversationId/messages',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId } = req.params;
          const limit = parseInt(req.query.limit as string) || 50;
          const offset = parseInt(req.query.offset as string) || 0;

          const messages = await this.chatRepository.listMessages({
            conversationId,
            limit,
            offset,
            includeDeleted: false,
          });

          // Convert to API format
          const apiMessages = messages.map((msg) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            sender: msg.senderType === SenderType.USER ? 'user' : 'agent',
            senderId: msg.senderId,
            message: msg.content,
            messageType: msg.messageType,
            timestamp: msg.timestamp,
            editedAt: msg.editedAt,
            status: msg.status,
            metadata: msg.metadata,
            emotionState: msg.emotionState,
            thoughtProcess: msg.thoughtProcess,
            confidenceScore: msg.confidenceScore,
            memoryReferences: msg.memoryReferences,
          }));

          res.json({
            conversationId,
            messages: apiMessages.reverse(), // Most recent last
            total: apiMessages.length,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error fetching conversation messages:', error);
          res
            .status(500)
            .json({ error: 'Failed to fetch conversation messages' });
        }
      }
    );

    this.app.post(
      '/api/conversations/:conversationId/messages',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository || !this.commandSystem) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId } = req.params;
          const { message, userId = 'default_user' } = req.body;

          if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
          }

          // Verify conversation exists
          const conversation =
            await this.chatRepository.getConversation(conversationId);
          if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
          }

          // Store user message
          const userMessage = await this.chatRepository.createMessage({
            conversationId,
            senderType: SenderType.USER,
            senderId: userId,
            content: message,
            messageType: MessageType.TEXT,
            metadata: {},
            memoryReferences: [],
            createdMemories: [],
            status: MessageStatus.SENT,
          });

          // Process message through agent
          const startTime = Date.now();
          const response = await this.commandSystem.sendMessage(
            conversation.agentId,
            message
          );
          const processingTime = Date.now() - startTime;

          // Store agent response
          const agentMessage = await this.chatRepository.createMessage({
            conversationId,
            senderType: SenderType.AGENT,
            senderId: conversation.agentId,
            content: response,
            messageType: MessageType.TEXT,
            metadata: {
              emotionState: this.agent?.emotion?.current,
              processingTime,
            },
            emotionState: {
              current: this.agent?.emotion?.current || 'neutral',
              intensity: 0.5,
              triggers: [],
              timestamp: new Date(),
            },
            memoryReferences: [],
            createdMemories: [],
            status: MessageStatus.SENT,
          });

          res.json({
            userMessage: {
              id: userMessage.id,
              message: userMessage.content,
              timestamp: userMessage.timestamp,
            },
            agentMessage: {
              id: agentMessage.id,
              message: agentMessage.content,
              timestamp: agentMessage.timestamp,
            },
            metadata: {
              processingTime,
              emotionState: this.agent?.emotion?.current,
            },
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error sending message:', error);
          res.status(500).json({ error: 'Failed to send message' });
        }
      }
    );

    this.app.delete(
      '/api/conversations/:conversationId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId } = req.params;
          const userId = (req.query.userId as string) || 'api_user';

          await this.chatRepository.deleteConversation(conversationId, userId);

          // Remove from active conversations if it was active
          for (const [
            user,
            activeConvId,
          ] of this.activeConversations.entries()) {
            if (activeConvId === conversationId) {
              this.activeConversations.delete(user);
              break;
            }
          }

          res.json({ success: true });
        } catch (error) {
          void error;
          runtimeLogger.error('Error deleting conversation:', error);
          res.status(500).json({ error: 'Failed to delete conversation' });
        }
      }
    );

    // ========================================
    // ENHANCED MULTI-AGENT CHAT ENDPOINTS
    // ========================================

    // Route message to best agent automatically
    this.app.post('/api/chat/route', async (req, res): Promise<void> => {
      try {
        const {
          message,
          requirements,
          userId = 'default_user',
          conversationId,
        } = req.body;

        if (!message) {
          res.status(400).json({ error: 'Message is required' });
          return;
        }

        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' });
          return;
        }

        // Find best agent for this conversation
        const agent = this.runtime.multiAgentManager.routeConversation(
          requirements || {}
        );
        if (!agent) {
          res.status(404).json({ error: 'No suitable agent found' });
          return;
        }

        // Get or create conversation
        let targetConversationId = conversationId;
        if (!targetConversationId) {
          const conversation = await this.chatRepository?.createConversation({
            agentId: agent.id,
            userId,
            title: `Auto-routed chat`,
            status: ConversationStatus.ACTIVE,
            messageCount: 0,
            metadata: {
              autoRouted: true,
              requirements,
              routedAt: new Date().toISOString(),
            },
          });
          targetConversationId = conversation?.id;
        }

        // Send message to the selected agent
        const response = await fetch(
          `${req.protocol}://${req.get('host')}/api/conversations/${targetConversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, userId }),
          }
        );

        const result = await response.json();
        res.json({
          ...result,
          routedTo: {
            agentId: agent.id,
            name: agent.name,
            reason: 'Best match for requirements',
          },
        });
      } catch (error) {
        void error;
        runtimeLogger.error('Error routing chat message:', error);
        res.status(500).json({ error: 'Failed to route message' });
      }
    });

    // Get available agents for chat
    this.app.get('/api/chat/agents/available', (_req, res): void => {
      try {
        const agentsMap = this.getAgentsMap();
        const availableAgents = [];

        for (const [_key, agent] of agentsMap) {
          if (agent.status === 'active') {
            availableAgents.push({
              id: agent.id,
              name: agent.name,
              status: agent.status,
              capabilities: (agent as any).capabilities || [],
              personality: (agent as any).personality || 'neutral',
              currentEmotion: agent.emotion?.current,
              loadLevel: (agent as any).loadLevel || 'low',
              specialties: (agent as any).specialties || [],
              description:
                (agent as any).description || `AI agent ${agent.name}`,
            });
          }
        }

        res.json({
          available: availableAgents.length,
          agents: availableAgents,
        });
      } catch (error) {
        void error;
        runtimeLogger.error('Error getting available agents:', error);
        res.status(500).json({ error: 'Failed to get available agents' });
      }
    });

    // Broadcast message to multiple agents
    this.app.post('/api/chat/broadcast', async (req, res): Promise<void> => {
      try {
        const { message, agentIds, userId = 'default_user', title } = req.body;

        if (!message || !agentIds || !Array.isArray(agentIds)) {
          res
            .status(400)
            .json({ error: 'Message and agentIds array are required' });
          return;
        }

        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' });
          return;
        }

        const results = [];

        for (const agentId of agentIds) {
          try {
            // Create separate conversation for each agent
            const conversation = await this.chatRepository.createConversation({
              agentId: agentId!,
              userId,
              title: title || `Broadcast: ${message.substring(0, 50)}...`,
              status: ConversationStatus.ACTIVE,
              messageCount: 0,
              metadata: {
                broadcast: true,
                broadcastId: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                originalMessage: message,
              },
            });

            // Send message
            const response = await fetch(
              `${req.protocol}://${req.get('host')}/api/conversations/${conversation.id}/messages`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, userId }),
              }
            );

            if (response.ok) {
              const result = await response.json();
              results.push({
                agentId: agentId!,
                conversationId: conversation.id,
                success: true,
                response: result.agentMessage,
              });
            } else {
              results.push({
                agentId: agentId!,
                conversationId: conversation.id,
                success: false,
                error: 'Failed to send message',
              });
            }
          } catch (error) {
            void error;
            results.push({
              agentId: agentId!,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        res.json({
          broadcast: true,
          message,
          targetAgents: agentIds.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        });
      } catch (error) {
        void error;
        runtimeLogger.error('Error broadcasting message:', error);
        res.status(500).json({ error: 'Failed to broadcast message' });
      }
    });

    // Transfer conversation to another agent
    this.app.put(
      '/api/conversations/:conversationId/transfer/:newAgentId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId, newAgentId } = req.params;
          const { reason, userId = 'system' } = req.body;

          // Get current conversation
          const conversation =
            await this.chatRepository.getConversation(conversationId);
          if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
          }

          const oldAgentId = conversation.agentId;

          // Update conversation agent
          await this.chatRepository.updateConversation(conversationId, {
            agentId: newAgentId,
            metadata: {
              ...conversation.metadata,
              transferHistory: [
                ...((conversation.metadata.transferHistory as any[]) || []),
                {
                  from: oldAgentId,
                  to: newAgentId,
                  reason: reason || 'Manual transfer',
                  timestamp: new Date().toISOString(),
                  transferredBy: userId,
                },
              ],
            },
          });

          // Add system message about the transfer
          await this.chatRepository.createMessage({
            conversationId,
            senderType: SenderType.SYSTEM,
            senderId: 'system',
            content: `Conversation transferred from ${oldAgentId} to ${newAgentId}. Reason: ${reason || 'Not specified'}`,
            messageType: MessageType.NOTIFICATION,
            metadata: {
              transfer: true,
              oldAgent: oldAgentId,
              newAgent: newAgentId,
            },
            memoryReferences: [],
            createdMemories: [],
            status: MessageStatus.SENT,
          });

          res.json({
            success: true,
            conversationId,
            transfer: {
              from: oldAgentId,
              to: newAgentId,
              reason,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error transferring conversation:', error);
          res.status(500).json({ error: 'Failed to transfer conversation' });
        }
      }
    );

    // Add agent to existing conversation (multi-agent conversation)
    this.app.post(
      '/api/conversations/:conversationId/invite/:agentId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId, agentId } = req.params;
          const { role = 'member', userId = 'system' } = req.body;

          // Verify conversation exists
          const conversation =
            await this.chatRepository.getConversation(conversationId);
          if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
          }

          // Add agent as participant
          await this.chatRepository.addParticipant({
            conversationId,
            participantType: ParticipantType.AGENT,
            participantId: agentId,
            role: role,
            messageCount: 0,
            notificationsEnabled: true,
            preferences: {},
            status: 'active' as any,
          });

          // Add system message about the invitation
          await this.chatRepository.createMessage({
            conversationId,
            senderType: SenderType.SYSTEM,
            senderId: 'system',
            content: `Agent ${agentId} has been invited to the conversation`,
            messageType: MessageType.NOTIFICATION,
            metadata: {
              agentInvite: true,
              invitedAgent: agentId,
              invitedBy: userId,
            },
            memoryReferences: [],
            createdMemories: [],
            status: MessageStatus.SENT,
          });

          res.json({
            success: true,
            conversationId,
            invitedAgent: agentId,
            role,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error inviting agent to conversation:', error);
          res.status(500).json({ error: 'Failed to invite agent' });
        }
      }
    );

    // Remove agent from conversation
    this.app.delete(
      '/api/conversations/:conversationId/participants/:agentId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { conversationId, agentId } = req.params;
          const { userId = 'system' } = req.body;

          // Remove participant
          await this.chatRepository.removeParticipant(conversationId, agentId);

          // Add system message
          await this.chatRepository.createMessage({
            conversationId,
            senderType: SenderType.SYSTEM,
            senderId: 'system',
            content: `Agent ${agentId} has left the conversation`,
            messageType: MessageType.NOTIFICATION,
            metadata: {
              agentRemoval: true,
              removedAgent: agentId,
              removedBy: userId,
            },
            memoryReferences: [],
            createdMemories: [],
            status: MessageStatus.SENT,
          });

          res.json({
            success: true,
            conversationId,
            removedAgent: agentId,
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error removing agent from conversation:', error);
          res.status(500).json({ error: 'Failed to remove agent' });
        }
      }
    );

    // Get chat analytics for specific agent
    this.app.get(
      '/api/chat/analytics/agent/:agentId',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const { agentId } = req.params;
          const days = parseInt(req.query.days as string) || 7;

          // Get conversations for this agent
          const conversations = await this.chatRepository.listConversations({
            agentId: agentId!,
            limit: 1000, // Get all conversations
          });

          let totalMessages = 0;
          const totalConversations = conversations.length;
          let avgResponseTime = 0;
          const emotionBreakdown: Record<string, number> = {};
          const messageTrends: Array<{ date: string; count: number }> = [];

          // Calculate analytics from conversation stats
          for (const conv of conversations) {
            if (conv.lastMessageAt) {
              const stats = await this.chatRepository.getConversationStats(
                conv.id
              );
              totalMessages += stats.messageCount;

              if (stats.avgConfidence) {
                avgResponseTime += stats.avgConfidence; // Approximation
              }
            }
          }

          res.json({
            agentId: agentId!,
            period: `${days} days`,
            analytics: {
              totalConversations,
              totalMessages,
              averageMessagesPerConversation:
                totalConversations > 0 ? totalMessages / totalConversations : 0,
              avgResponseTime:
                avgResponseTime / Math.max(1, totalConversations),
              emotionBreakdown,
              messageTrends,
              activeConversations: conversations.filter(
                (c) => c.status === 'active'
              ).length,
            },
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error getting agent chat analytics:', error);
          res.status(500).json({ error: 'Failed to get chat analytics' });
        }
      }
    );

    // Get system-wide chat analytics
    this.app.get(
      '/api/chat/analytics/system',
      async (req, res): Promise<void> => {
        try {
          if (!this.chatRepository) {
            res.status(500).json({ error: 'Chat system not available' });
            return;
          }

          const days = parseInt(req.query.days as string) || 7;

          // Get all conversations
          const conversations = await this.chatRepository.listConversations({
            limit: 10000, // Get all conversations
          });

          const agentStats: Record<string, any> = {};
          let totalMessages = 0;
          const totalConversations = conversations.length;

          for (const conv of conversations) {
            const agentId = conv.agentId;
            if (!agentStats[agentId]) {
              agentStats[agentId] = {
                conversations: 0,
                messages: 0,
                avgConfidence: 0,
              };
            }

            agentStats[agentId].conversations++;

            if (conv.messageCount) {
              agentStats[agentId].messages += conv.messageCount;
              totalMessages += conv.messageCount;
            }
          }

          res.json({
            period: `${days} days`,
            systemAnalytics: {
              totalConversations,
              totalMessages,
              activeAgents: Object.keys(agentStats).length,
              averageMessagesPerConversation:
                totalConversations > 0 ? totalMessages / totalConversations : 0,
              agentPerformance: agentStats,
              topAgents: Object.entries(agentStats)
                .sort(
                  ([, a], [, b]) => (b as any).messages - (a as any).messages
                )
                .slice(0, 5)
                .map(([agentId, stats]) => ({ agentId, ...stats })),
            },
          });
        } catch (error) {
          void error;
          runtimeLogger.error('Error getting system chat analytics:', error);
          res.status(500).json({ error: 'Failed to get system analytics' });
        }
      }
    );

    // ===================================================================
    // GRAPHQL AND ADMIN DASHBOARD SETUP
    // ===================================================================

    // TEMP: GraphQL server commented out for testing
    // this.graphqlServer = new GraphQLServer();

    // TEMP: GraphQL endpoint commented out for testing
    // this.app.use('/graphql', graphqlHTTP((req) => {
    //   this.metrics.graphqlRequests++;
    //
    //   const context: GraphQLContext = {
    //     agent: this.agent,
    //     chatRepository: this.chatRepository,
    //     runtime: this.runtime,
    //     agentsMap: this.getAgentsMap(),
    //     commandSystem: this.commandSystem,
    //     request: req,
    //     publish: (channel: string, payload: any) => {
    //       if (this.graphqlServer) {
    //         this.graphqlServer.publish(channel, payload);
    //       }
    //     },
    //   };

    //   return {
    //     schema,
    //     context,
    //     graphiql: process.env.NODE_ENV !== 'production',
    //     introspection: true,
    //   };
    // }));

    // Initialize and mount admin dashboard
    this.adminDashboard = new AdminDashboard();
    this.app.use('/admin', this.adminDashboard.getRouter());

    // GraphQL subscriptions endpoint (WebSocket-based)
    // This will be set up in the start() method alongside the WebSocket server

    runtimeLogger.extension('🔗 GraphQL API initialized at /graphql');
    runtimeLogger.extension('📊 Admin dashboard initialized at /admin');
  }

  private async processChatMessage(
    request: ChatRequest
  ): Promise<ChatResponse> {
    if (!this.commandSystem || !this.chatRepository) {
      return {
        response: 'Chat system not available',
        timestamp: new Date().toISOString(),
      };
    }

    // Get agent ID from request or use first available agent
    const agentsMap = this.getAgentsMap();
    const firstAgent = agentsMap.values().next().value;
    const agentId = request.agentId || this.agent?.id || firstAgent?.id;

    if (!agentId) {
      return {
        response: 'No agents available',
        timestamp: new Date().toISOString(),
      };
    }

    // Check if this is a lazy agent that needs activation
    if (this.runtime?.lazyAgents?.has(agentId)) {
      const lazyAgent = this.runtime.lazyAgents.get(agentId);
      if (lazyAgent && lazyAgent.state !== 'active') {
        runtimeLogger.extension(`🚀 Activating lazy agent: ${agentId}`);
        try {
          await this.runtime.activateAgent?.(agentId);
          runtimeLogger.extension(`✅ Agent ${agentId} activated successfully`);
        } catch (error) {
          void error;
          runtimeLogger.error(`❌ Failed to activate agent ${agentId}:`, error);
          return {
            response: `Failed to activate agent ${agentId}. Please check the configuration and try again.`,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    // Get the actual agent object (refresh map after potential activation)
    const updatedAgentsMap = this.getAgentsMap();
    const agent = updatedAgentsMap.get(agentId) || this.agent || firstAgent;
    const userId = request.context?.userId || 'default_user';
    const sessionId = request.context?.sessionId;

    try {
      // Get or create conversation
      const conversationId = await this.getOrCreateConversationId(
        userId,
        agentId
      );

      // Store user message in database
      const userMessage = await this.chatRepository.createMessage({
        conversationId,
        senderType: SenderType.USER,
        senderId: userId,
        content: request.message,
        messageType: MessageType.TEXT,
        metadata: request.context || {},
        memoryReferences: [],
        createdMemories: [],
        status: MessageStatus.SENT,
      });

      runtimeLogger.memory(`💬 User message stored: ${userMessage.id}`);

      // Process message through command system
      const startTime = Date.now();
      const response = await this.commandSystem.sendMessage(
        agentId,
        request.message
      );
      const processingTime = Date.now() - startTime;

      // Publish performance metrics to GraphQL subscribers
      // TEMP: GraphQL publishing commented out for testing
      // if (this.graphqlServer) {
      //   this.graphqlServer.publish('performanceMetric', {
      //     performanceMetric: {
      //       id: Math.random().toString(36).substring(2),
      //       type: 'MESSAGE_PROCESSING',
      //       agentId,
      //       metric: 'response_time',
      //       value: processingTime,
      //       unit: 'milliseconds',
      //       timestamp: new Date(),
      //       metadata: {
      //         messageLength: request.message.length,
      //         responseLength: response.length,
      //       },
      //     },
      //   });
      // }

      // Store agent response in database
      const agentMessage = await this.chatRepository.createMessage({
        conversationId,
        senderType: SenderType.AGENT,
        senderId: agentId,
        content: response,
        messageType: MessageType.TEXT,
        metadata: {
          emotionState: agent?.emotion?.current,
          processingTime,
        },
        emotionState: {
          current: agent?.emotion?.current || 'neutral',
          intensity: 0.5, // Default intensity
          triggers: [],
          timestamp: new Date(),
        },
        memoryReferences: [],
        createdMemories: [],
        status: MessageStatus.SENT,
      });

      runtimeLogger.memory(`🤖 Agent response stored: ${agentMessage.id}`);

      // TEMP: GraphQL publishing commented out for testing
      // if (this.graphqlServer) {
      //   this.graphqlServer.publish('chatMessage', {
      //     chatMessage: {
      //       id: agentMessage.id,
      //       conversationId,
      //       senderId: agentId,
      //       senderType: 'AGENT',
      //       content: response,
      //       messageType: 'TEXT',
      //       timestamp: agentMessage.timestamp,
      //       metadata: agentMessage.metadata,
      //     },
      //   });
      // }

      // Update session activity if sessionId provided
      if (sessionId && this.chatRepository) {
        try {
          await this.chatRepository.updateSessionActivity(sessionId);
        } catch (error) {
          void error;
          // Session might not exist, create it
          try {
            await this.chatRepository.createSession({
              userId,
              conversationId,
              connectionId: sessionId,
              clientInfo: { userAgent: 'API', source: 'http' },
            });
          } catch (createError) {
            runtimeLogger.warn(
              `Failed to create session: ${createError instanceof Error ? createError.message : String(createError)}`
            );
          }
        }
      }

      // Log analytics event
      await this.chatRepository.logEvent({
        eventType: 'message_processed',
        conversationId,
        userId,
        agentId,
        eventData: {
          userMessageId: userMessage.id,
          agentMessageId: agentMessage.id,
          messageLength: request.message.length,
          responseLength: response.length,
        },
        processingTime,
      });

      const result: ChatResponse = {
        response,
        timestamp: new Date().toISOString(),
        metadata: {
          tokensUsed: 0, // Would be calculated by the actual processing
          processingTime,
          memoryRetrieved: false,
          ...(agent?.emotion?.current && {
            emotionState: agent.emotion.current,
          }),
        },
      };

      if (sessionId) {
        result.sessionId = sessionId;
      }

      return result;
    } catch (error) {
      void error;
      runtimeLogger.error('Error processing chat message:', error);

      // Still try to log the error
      try {
        if (this.chatRepository) {
          await this.chatRepository.logEvent({
            eventType: 'message_error',
            userId,
            agentId: agentId!,
            eventData: {
              error: error instanceof Error ? error.message : String(error),
              originalMessage: request.message,
            },
          });
        }
      } catch (logError) {
        runtimeLogger.error('Failed to log error event:', logError);
      }

      // TEMP: GraphQL publishing commented out for testing
      // if (this.graphqlServer) {
      //   this.graphqlServer.publish('errorOccurred', {
      //     errorOccurred: {
      //       id: Math.random().toString(36).substring(2),
      //       type: 'MESSAGE_PROCESSING_ERROR',
      //       message: error instanceof Error ? error.message : String(error),
      //       timestamp: new Date(),
      //       severity: 'HIGH',
      //       context: {
      //         agentId: this.agent?.id || 'unknown',
      //         userId: request.userId || 'unknown',
      //       },
      //     },
      //   });
      // }

      return {
        response: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async getMemories(): Promise<any[]> {
    if (!this.agent?.memory) {
      return [];
    }

    try {
      return await this.agent.memory.retrieve(this.agent.id, 'recent', 20);
    } catch (error) {
      void error;
      runtimeLogger.error('Failed to retrieve memories:', error);
      return [];
    }
  }

  private async storeMemory(request: MemoryRequest): Promise<MemoryResponse> {
    if (!this.agent?.memory) {
      return {
        success: false,
        id: '',
        timestamp: new Date().toISOString(),
        error: 'Memory system not available',
      };
    }

    try {
      await this.agent.memory.store(this.agent.id, {
        id: 'memory-' + Date.now(),
        agentId: this.agent.id,
        content: request.content,
        type: MemoryTierType.INTERACTION as any,
        metadata: request.metadata || {},
        importance: 0.5,
        timestamp: new Date(),
        tags: [],
        duration: MemoryDuration.SHORT_TERM,
      });

      return {
        success: true,
        id: 'memory-' + Date.now(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      void error;
      return {
        success: false,
        id: '',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeAction(request: ActionRequest): Promise<ActionResponse> {
    if (!this.commandSystem || !this.agent) {
      return {
        success: false,
        error: 'Action system not available',
        executionTime: 0,
      };
    }

    try {
      const startTime = Date.now();
      const command = await this.commandSystem.sendCommand(
        this.agent.id,
        `${request.action} ${JSON.stringify(request.parameters || {})}`,
        {
          priority: 2, // Normal priority
          async: request.async || false,
        }
      );

      const executionTime = Date.now() - startTime;

      const response: ActionResponse = {
        success: command.result?.success || false,
        executionTime,
        actionId: command.id,
      };

      const result = command.result?.response || command.result?.data;
      if (result !== undefined) {
        response.result = result;
      }

      if (command.result?.error) {
        response.error = command.result.error;
      }

      return response;
    } catch (error) {
      void error;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      };
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        // Setup WebSocket server if enabled
        if (this.apiConfig.websocket.enabled) {
          this.setupWebSocketServer();
        }

        // Setup WebUI server
        this.setupWebUIServer();

        // TEMP: GraphQL setup commented out for testing
        // if (this.graphqlServer && this.server) {
        //   this.graphqlServer.setupSubscriptionServer(this.server);
        //   runtimeLogger.extension('🔗 GraphQL subscription server initialized');
        // }

        this.server.listen(this.apiConfig.port, this.apiConfig.host, () => {
          runtimeLogger.extension(
            `🚀 API Server running on ${this.apiConfig.host}:${this.apiConfig.port}`
          );
          this.status = ExtensionStatus.ENABLED;
          resolve();
        });

        this.server.on('error', (error) => {
          runtimeLogger.error('❌ API Server error:', error);
          this.status = ExtensionStatus.ERROR;
          reject(error);
        });
      } catch (error) {
        void error;
        reject(error);
      }
    });
  }

  private setupWebSocketServer(): void {
    if (!this.server || !this.commandSystem) return;

    // Initialize main WebSocket server with strict compression prevention
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.apiConfig.websocket.path,
      perMessageDeflate: false, // Disable compression completely
      backlog: 511, // Increase connection backlog
      maxPayload: 100 * 1024 * 1024, // 100MB max payload
      skipUTF8Validation: false, // Maintain UTF8 validation for security
    });

    runtimeLogger.extension(
      `🔌 WebSocket server initialized on ${this.apiConfig.websocket.path}`
    );

    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = this.generateConnectionId();
      const clientIP = req.socket.remoteAddress || 'unknown';

      // Set additional WebSocket options to prevent compression
      if ((ws as any).extensions) {
        // Clear any extensions that might enable compression
        Object.keys((ws as any).extensions).forEach((key: string) => {
          if (key.includes('deflate') || key.includes('compress')) {
            delete (ws as any).extensions[key];
          }
        });
      }

      this.connections.set(connectionId, ws);

      runtimeLogger.extension(
        `🔌 Legacy WebSocket client connected: ${connectionId} from ${clientIP}`
      );

      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleWebSocketMessage(connectionId, message);
        } catch (error) {
          void error;
          runtimeLogger.error(
            `❌ WebSocket message parsing error from ${connectionId}:`,
            error
          );
          try {
            this.sendWebSocketResponse(ws, {
              type: 'error',
              error: 'Invalid message format',
              timestamp: new Date().toISOString(),
            });
          } catch (sendError) {
            runtimeLogger.error(
              `❌ Failed to send error response to ${connectionId}:`,
              sendError
            );
          }
        }
      });

      ws.on('close', (code, reason) => {
        this.connections.delete(connectionId);
        runtimeLogger.extension(
          `🔌 Legacy WebSocket client disconnected: ${connectionId} (code: ${code}, reason: ${reason})`
        );
      });

      ws.on('error', (error) => {
        runtimeLogger.error(
          `❌ Legacy WebSocket error for ${connectionId}:`,
          error
        );
        this.connections.delete(connectionId);
      });

      // Send welcome message with confirmation of no compression
      try {
        this.sendWebSocketResponse(ws, {
          type: 'welcome',
          connectionId,
          timestamp: new Date().toISOString(),
          data: {
            compression: false,
            extensions: [],
          },
        });
      } catch (error) {
        void error;
        runtimeLogger.error(
          `❌ Failed to send welcome message to ${connectionId}:`,
          error
        );
      }
    });

    this.wss.on('error', (error) => {
      runtimeLogger.error('❌ WebSocket Server error:', error);
    });
  }

  private sendWebSocketResponse<T>(
    ws: WebSocket,
    response: WebSocketResponse<T>
  ): void {
    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      runtimeLogger.error('Failed to send WebSocket response:', error);
    }
  }

  private async handleWebSocketMessage(
    connectionId: string,
    message: WebSocketMessage
  ): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    try {
      switch (message.type) {
        case 'ping':
          this.sendWebSocketResponse(ws, {
            type: 'pong',
            timestamp: new Date().toISOString(),
          });
          break;
        case 'chat': {
          // Handle chat message - get first available agent if no specific agent requested
          const agentsMap = this.getAgentsMap();
          const firstAgent = agentsMap.values().next().value;
          const agentId = message.agentId || firstAgent?.id;

          const messageText =
            typeof message.data === 'string'
              ? message.data
              : message.message || '';
          const chatRequest: ChatRequest = {
            message: messageText,
            ...(agentId && { agentId }),
            context: { sessionId: connectionId },
          };
          const response = await this.processChatMessage(chatRequest);
          this.sendWebSocketResponse(ws, {
            type: 'chat_response',
            data: response,
          });
          break;
        }
        case 'action': {
          // Handle command execution
          if (this.commandSystem && this.agent) {
            const commandInput =
              typeof message.data === 'string'
                ? message.data
                : message.message || '';
            const command = await this.commandSystem.sendCommand(
              this.agent.id,
              commandInput,
              { priority: 2, async: true }
            );
            this.sendWebSocketResponse(ws, {
              type: 'command_response',
              data: { commandId: command.id, status: command.status },
            });
          }
          break;
        }
        default:
          this.sendWebSocketResponse(ws, {
            type: 'error',
            error: 'Unknown message type',
          });
      }
    } catch (error) {
      void error;
      runtimeLogger.error('Failed to process WebSocket message:', error);
      this.sendWebSocketResponse(ws, {
        type: 'error',
        error: `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  getConnectionInfo(): ConnectionInfo[] {
    const legacyConnections: ConnectionInfo[] = Array.from(
      this.connections.entries()
    ).map(([id, ws]) => {
      const info: ConnectionInfo = {
        id,
        readyState: ws.readyState,
        ip: 'unknown',
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: [],
        metadata: {},
      };
      return info;
    });

    const enhancedConnections: ConnectionInfo[] = [];
    // Enhanced WebSocket connections would need to be fetched via proper API call
    // For now, return empty array to avoid errors

    return [...legacyConnections, ...enhancedConnections];
  }

  private setupWebUIServer(): void {
    if (!this.commandSystem) return;

    this.webUI = new WebUIServer(
      this.commandSystem,
      () => this.getAgentsMap(),
      () => this.getRuntimeStats(),
      this.runtime
    );

    // Mount WebUI routes
    this.app.use('/ui', this.webUI.getExpressApp());

    // Also mount the API UI routes directly for convenience
    this.app.use('/api/ui', this.webUI.getExpressApp());

    runtimeLogger.extension('🌐 WebUI server initialized at /ui and /api/ui');
  }

  private getAgentsMap(): Map<string, Agent> {
    const agentsMap = new Map<string, Agent>();

    if (this.runtime) {
      // First add active agents
      if (this.runtime.agents && typeof this.runtime.agents !== 'undefined') {
        runtimeLogger.debug(
          `Active agents: ${Array.from(this.runtime.agents.keys()).join(', ')}`
        );
        for (const [id, agent] of this.runtime.agents) {
          runtimeLogger.debug(`Adding active agent ${id} (${agent.name})`);
          agentsMap.set(id, agent);
        }
      }

      // Then add lazy agents (only if not already in active agents)
      if (
        this.runtime.lazyAgents &&
        typeof this.runtime.lazyAgents !== 'undefined'
      ) {
        runtimeLogger.debug(
          `Lazy agents: ${Array.from(this.runtime.lazyAgents.keys()).join(', ')}`
        );
        for (const [id, lazyAgent] of this.runtime.lazyAgents) {
          // Skip if agent is already active (prevent duplicates)
          if (agentsMap.has(id)) {
            runtimeLogger.debug(
              `Skipping lazy agent ${id} - already in active agents`
            );
            continue;
          }

          runtimeLogger.debug(`Adding lazy agent ${id} (${lazyAgent.name})`);

          // Convert lazy agent to agent format for API
          const agentLike = {
            id: lazyAgent.id,
            name: lazyAgent.name,
            status: lazyAgent.state === 'active' ? 'active' : 'inactive',
            emotion: { current: 'neutral' }, // Default emotion for lazy agents
            lastUpdate: lazyAgent.lastActivated,
            extensions: [], // Lazy agents don't have loaded extensions yet
            portal: null, // Lazy agents don't have active portals yet
            characterConfig: lazyAgent.characterConfig,
            config: lazyAgent.config,
            capabilities: [],
            personality:
              (lazyAgent.characterConfig as any)?.personality?.traits ||
              'neutral',
          };
          agentsMap.set(id, agentLike as any);
        }
      }
    }

    // Add the API extension agent itself if present and not already added
    if (this.agent && !agentsMap.has(this.agent.id)) {
      runtimeLogger.debug(`Adding API extension agent ${this.agent.id}`);
      agentsMap.set(this.agent.id, this.agent);
    }

    runtimeLogger.debug(
      `Final agentsMap keys: ${Array.from(agentsMap.keys()).join(', ')}`
    );
    return agentsMap;
  }

  private getRuntimeStats(): {
    isRunning: boolean;
    agents: number;
    autonomousAgents: number;
  } {
    // Return actual runtime stats if available
    if (this.runtime && typeof this.runtime.getStats === 'function') {
      const stats = this.runtime.getStats();
      return {
        isRunning: Boolean((stats as any).isRunning),
        agents: Number((stats as any).agents) || 0,
        autonomousAgents: Number((stats as any).autonomousAgents) || 0,
      };
    }
    // Fallback to basic stats
    return {
      isRunning: true,
      agents: this.agent ? 1 : 0,
      autonomousAgents: 0,
    };
  }

  public setRuntime(runtime: Record<string, unknown>): void {
    this.runtime = runtime;
    runtimeLogger.extension('🔗 API extension connected to runtime');
  }

  public getCommandSystem(): CommandSystem | undefined {
    return this.commandSystem;
  }

  public getWebSocketServer(): WebSocketServer | undefined {
    return this.wss;
  }

  /**
   * Initialize chat persistence system
   */
  private async initializeChatPersistence(): Promise<void> {
    try {
      // Determine database path
      const dbPath = process.env.CHAT_DB_PATH || './data/chat.db';

      // Ensure directory exists
      const { dirname } = await import('path');
      const { mkdirSync } = await import('fs');
      const dir = dirname(dbPath);
      mkdirSync(dir, { recursive: true });

      runtimeLogger.memory(`💾 Initializing chat database at: ${dbPath}`);

      // Create migration manager
      this.migrationManager = createChatMigrationManager(dbPath);

      // Run migrations
      await this.migrationManager.migrate();

      // Validate database
      const validation = await this.migrationManager.validate();
      if (!validation.valid) {
        runtimeLogger.error(
          '❌ Chat database validation failed:',
          validation.errors
        );
        throw new Error('Chat database validation failed');
      }

      // Create chat repository
      this.chatRepository = createSQLiteChatRepository({
        dbPath,
        enableAnalytics: true,
        enableFullTextSearch: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        archiveAfterDays: 90,
        maxMessageLength: 10000,
        maxParticipantsPerConversation: 10,
      });

      runtimeLogger.success('✅ Chat persistence system initialized');
    } catch (error) {
      void error;
      runtimeLogger.error('❌ Failed to initialize chat persistence:', error);
      throw error;
    }
  }

  /**
   * Get or create conversation ID for a user-agent pair
   */
  private async getOrCreateConversationId(
    userId: string,
    agentId: string
  ): Promise<string> {
    if (!this.chatRepository) {
      throw new Error('Chat repository not initialized');
    }

    // Check if we have an active conversation for this user
    let conversationId = this.activeConversations.get(userId);

    if (conversationId) {
      // Verify conversation still exists and is active
      const conversation =
        await this.chatRepository.getConversation(conversationId);
      if (conversation && conversation.status === ConversationStatus.ACTIVE) {
        return conversationId;
      }
    }

    // Look for existing active conversations between this user and agent
    const existingConversations = await this.chatRepository.listConversations({
      userId,
      agentId,
      status: ConversationStatus.ACTIVE,
      limit: 1,
      orderBy: 'updated',
      orderDirection: 'desc',
    });

    if (existingConversations.length > 0) {
      const firstConversation = existingConversations[0];
      if (firstConversation) {
        conversationId = firstConversation.id;
        this.activeConversations.set(userId, conversationId);
        return conversationId;
      }
    }

    // Create new conversation
    const conversation = await this.chatRepository.createConversation({
      agentId,
      userId,
      title: `Chat with ${agentId}`,
      status: ConversationStatus.ACTIVE,
      messageCount: 0,
      metadata: {
        createdVia: 'api',
        agentName: this.agent?.name || agentId,
      },
    });

    this.activeConversations.set(userId, conversation.id);
    runtimeLogger.memory(`🆕 Created new conversation: ${conversation.id}`);

    return conversation.id;
  }

  /**
   * Clean up chat resources
   */
  private async cleanupChatResources(): Promise<void> {
    if (this.chatRepository) {
      try {
        // Clean up expired sessions (older than 1 hour)
        const expiredCount = await this.chatRepository.cleanupExpiredSessions(
          60 * 60 * 1000
        );
        if (expiredCount > 0) {
          runtimeLogger.memory(
            `🧹 Cleaned up ${expiredCount} expired chat sessions`
          );
        }

        // Archive old conversations (older than 90 days)
        const archivedCount =
          await this.chatRepository.archiveOldConversations(90);
        if (archivedCount > 0) {
          runtimeLogger.memory(
            `📦 Archived ${archivedCount} old conversations`
          );
        }
      } catch (error) {
        void error;
        runtimeLogger.error('❌ Error during chat cleanup:', error);
      }
    }
  }

  /**
   * Register extension actions and events
   */
  private registerExtensionActions(): void {
    // Register HTTP API actions
    this.actions['sendChatMessage'] = {
      name: 'sendChatMessage',
      description: 'Send a chat message to an agent via the API',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        agentId: {
          type: 'string',
          required: false,
          description: 'Target agent ID',
        },
        message: {
          type: 'string',
          required: true,
          description: 'Message to send',
        },
        context: {
          type: 'object',
          required: false,
          description: 'Additional context',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { agentId, message, context } = params;
        const response = await this.processChatMessage({
          message: message as string,
          agentId: (agentId as string) || '',
          context: context as any,
        });
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: response as any,
          timestamp: new Date(),
        };
      },
    };

    this.actions['getAgentStatus'] = {
      name: 'getAgentStatus',
      description: 'Get status of an agent',
      category: ActionCategory.SYSTEM,
      parameters: {
        agentId: { type: 'string', required: true, description: 'Agent ID' },
      },
      execute: async (
        _localAgent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { agentId } = params;
        const agentsMap = this.getAgentsMap();
        const agent = agentsMap.get(agentId as string);
        if (!agent) {
          return {
            success: false,
            type: ActionResultType.FAILURE,
            error: 'Agent not found',
            timestamp: new Date(),
          };
        }
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            id: agent.id,
            name: agent.name,
            status: agent.status,
            emotion: agent.emotion?.current,
            lastUpdate: agent.lastUpdate,
          },
          timestamp: new Date(),
        };
      },
    };

    this.actions['executeCommand'] = {
      name: 'executeCommand',
      description: 'Execute a command on an agent',
      category: ActionCategory.SYSTEM,
      parameters: {
        agentId: { type: 'string', required: true, description: 'Agent ID' },
        command: {
          type: 'string',
          required: true,
          description: 'Command to execute',
        },
        priority: {
          type: 'number',
          required: false,
          description: 'Command priority',
        },
        async: {
          type: 'boolean',
          required: false,
          description: 'Execute asynchronously',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { command, priority, async: isAsync } = params;

        // Log command execution with priority
        runtimeLogger.debug(
          `[API] Executing command "${command}" with priority: ${priority || 'normal'}`
        );

        const result = await this.executeAction({
          action: command as string,
          parameters: { priority },
          async: isAsync as boolean,
        });
        const response: ActionResult = {
          success: result.success,
          type: result.success
            ? ActionResultType.SUCCESS
            : ActionResultType.FAILURE,
          result: result.result,
          timestamp: new Date(),
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      },
    };

    // Register event handlers
    this.events['http_request'] = {
      event: 'http_request',
      description: 'Handle HTTP requests to the API',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle HTTP request events
        runtimeLogger.debug('HTTP request event:', event);
      },
    };

    this.events['websocket_message'] = {
      event: 'websocket_message',
      description: 'Handle WebSocket messages',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle WebSocket message events
        runtimeLogger.debug('WebSocket message event:', event);
      },
    };

    this.events['chat_message'] = {
      event: 'chat_message',
      description: 'Handle chat messages',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle chat message events
        runtimeLogger.debug('Chat message event:', event);
      },
    };

    this.events['api_error'] = {
      event: 'api_error',
      description: 'Handle API errors',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle API error events
        runtimeLogger.error('API error event:', event);
      },
    };
  }

  /**
   * Override stop method to properly close database connections
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Cleanup chat resources
      this.cleanupChatResources().catch((error) => {
        runtimeLogger.error('Error during chat cleanup:', error);
      });

      // Close database connections
      if (this.chatRepository) {
        try {
          this.chatRepository.close();
        } catch (error) {
          void error;
          runtimeLogger.error('Error closing chat repository:', error);
        }
      }

      if (this.migrationManager) {
        try {
          this.migrationManager.close();
        } catch (error) {
          void error;
          runtimeLogger.error('Error closing migration manager:', error);
        }
      }

      if (this.wss) {
        this.wss.close();
      }

      if (this.server) {
        this.server.close(() => {
          runtimeLogger.extension('🛑 API Server stopped');
          this.status = ExtensionStatus.DISABLED;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Extension cleanup method required by Extension interface
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

// Export factory function for easy instantiation
export function createAPIExtension(config: ApiConfig): ApiExtension {
  return new ApiExtension(config);
}
