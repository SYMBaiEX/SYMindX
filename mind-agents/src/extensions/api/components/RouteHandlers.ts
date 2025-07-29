/**
 * RouteHandlers.ts - API route handler implementations
 * 
 * This module handles:
 * - API endpoint implementations
 * - Request/response processing
 * - Agent interaction logic
 * - System status endpoints
 * - Chat and memory endpoints
 */

import express from 'express';
import {
  Agent,
  AgentEvent,
  ActionResultType,
} from '../../../types/agent';
import {
  ChatRequest,
  ChatResponse,
  MemoryRequest,
  MemoryResponse,
  ActionRequest,
  ActionResponse,
  ApiSettings,
} from '../types';
import type {
  WebSocketMessage,
  AgentStatusPayload,
  SystemMetricsPayload,
  SpawnAgentPayload,
  RouteConversationPayload,
} from '../../../types/extensions/api';
import { standardLoggers } from '../../../utils/standard-logging';
import { 
  createValidationError, 
  createRuntimeError,
  safeAsync 
} from '../../../utils/standard-errors';
import { SQLiteChatRepository } from '../../../modules/memory/providers/sqlite/chat-repository';

interface RuntimeContext {
  agents?: Map<string, Agent>;
  lazyAgents?: Map<string, any>;
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
    routeConversation: (requirements: RouteConversationPayload) => Agent | null;
  };
  getStats?: () => Record<string, unknown>;
}

export class RouteHandlers {
  private logger = standardLoggers.api;
  private config: ApiSettings;
  private agent?: Agent;
  private runtime?: RuntimeContext;
  private chatRepository?: SQLiteChatRepository;
  private activeConversations: Map<string, string> = new Map();

  // Metrics
  private metrics = {
    commandsProcessed: 0,
    portalRequests: 0,
    httpRequests: 0,
    errors: 0,
    startTime: Date.now(),
  };

  constructor(config: ApiSettings) {
    this.config = config;
  }

  /**
   * Set the primary agent for this API instance
   */
  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  /**
   * Set the runtime context for accessing system components
   */
  setRuntime(runtime: RuntimeContext): void {
    this.runtime = runtime;
  }

  /**
   * Set the chat repository for conversation management
   */
  setChatRepository(repository: SQLiteChatRepository): void {
    this.chatRepository = repository;
  }

  /**
   * Setup all API routes
   */
  setupRoutes(app: express.Application): void {
    this.logger.start('Setting up API routes...');

    // Health and status endpoints
    this.setupHealthRoutes(app);
    
    // Agent management endpoints
    this.setupAgentRoutes(app);
    
    // Chat and conversation endpoints
    this.setupChatRoutes(app);
    
    // Memory management endpoints
    this.setupMemoryRoutes(app);
    
    // Action execution endpoints
    this.setupActionRoutes(app);
    
    // System metrics endpoints
    this.setupMetricsRoutes(app);
    
    // Multi-agent management endpoints
    this.setupMultiAgentRoutes(app);

    this.logger.info('API routes setup completed');
  }

  /**
   * Setup health and status routes
   */
  private setupHealthRoutes(app: express.Application): void {
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      this.metrics.httpRequests++;
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.startTime,
        version: '1.0.0',
      });
    });

    // Status endpoint with detailed information
    app.get('/api/status', (req, res) => {
      this.metrics.httpRequests++;
      
      const stats = this.runtime?.getStats?.() || {};
      
      res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.startTime,
        metrics: {
          ...this.metrics,
          activeAgents: this.runtime?.agents?.size || 0,
          lazyAgents: this.runtime?.lazyAgents?.size || 0,
        },
        runtime: stats,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      });
    });
  }

  /**
   * Setup agent management routes
   */
  private setupAgentRoutes(app: express.Application): void {
    // List all agents
    app.get('/api/agents', (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const agents: any[] = [];
        
        // Add active agents
        this.runtime?.agents?.forEach((agent) => {
          agents.push({
            id: agent.id,
            name: agent.name || 'Unknown',
            status: agent.status,
            type: 'active',
            lastActivity: agent.lastActivity,
          });
        });
        
        // Add lazy agents
        this.runtime?.lazyAgents?.forEach((lazyAgent) => {
          agents.push({
            id: lazyAgent.id,
            name: lazyAgent.name || 'Unknown',
            status: lazyAgent.state,
            type: 'lazy',
            lastActivated: lazyAgent.lastActivated,
          });
        });
        
        res.json({ agents, total: agents.length });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error listing agents', { error });
        res.status(500).json({ error: 'Failed to list agents' });
      }
    });

    // Get specific agent
    app.get('/api/agents/:agentId', (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { agentId } = req.params;
        const agent = this.runtime?.agents?.get(agentId);
        
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        res.json({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          lastActivity: agent.lastActivity,
          config: agent.config,
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error getting agent', { error });
        res.status(500).json({ error: 'Failed to get agent' });
      }
    });

    // Activate lazy agent
    app.post('/api/agents/:agentId/activate', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { agentId } = req.params;
        
        if (!this.runtime?.activateAgent) {
          return res.status(501).json({ error: 'Agent activation not supported' });
        }
        
        await this.runtime.activateAgent(agentId);
        
        res.json({
          success: true,
          message: `Agent ${agentId} activated successfully`,
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error activating agent', { error });
        res.status(500).json({ error: 'Failed to activate agent' });
      }
    });

    // Deactivate agent
    app.post('/api/agents/:agentId/deactivate', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { agentId } = req.params;
        
        if (!this.runtime?.deactivateAgent) {
          return res.status(501).json({ error: 'Agent deactivation not supported' });
        }
        
        await this.runtime.deactivateAgent(agentId);
        
        res.json({
          success: true,
          message: `Agent ${agentId} deactivated successfully`,
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error deactivating agent', { error });
        res.status(500).json({ error: 'Failed to deactivate agent' });
      }
    });
  }

  /**
   * Setup chat and conversation routes
   */
  private setupChatRoutes(app: express.Application): void {
    // Send message to agent
    app.post('/api/chat', async (req, res) => {
      this.metrics.httpRequests++;
      this.metrics.commandsProcessed++;
      
      try {
        const chatRequest: ChatRequest = req.body;
        
        if (!chatRequest.message || !chatRequest.agentId) {
          throw createValidationError('Message and agentId are required');
        }
        
        const agent = this.runtime?.agents?.get(chatRequest.agentId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        // Create agent event
        const event: AgentEvent = {
          type: 'message.received',
          agentId: chatRequest.agentId,
          data: {
            message: chatRequest.message,
            sender: chatRequest.userId || 'api',
            timestamp: new Date(),
          },
          timestamp: new Date(),
        };
        
        // Process the event
        const result = await agent.processEvent(event);
        
        const response: ChatResponse = {
          success: result.success,
          message: result.data?.response || 'No response generated',
          agentId: chatRequest.agentId,
          timestamp: new Date(),
          conversationId: this.getOrCreateConversationId(chatRequest.userId || 'api'),
        };
        
        res.json(response);
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error processing chat request', { error });
        res.status(500).json({ error: 'Failed to process chat request' });
      }
    });

    // Get conversation history
    app.get('/api/conversations/:conversationId', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { conversationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (!this.chatRepository) {
          return res.status(501).json({ error: 'Chat repository not available' });
        }
        
        const messages = await this.chatRepository.getMessages(
          conversationId,
          limit,
          offset
        );
        
        res.json({
          conversationId,
          messages,
          total: messages.length,
          limit,
          offset,
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error getting conversation history', { error });
        res.status(500).json({ error: 'Failed to get conversation history' });
      }
    });
  }

  /**
   * Setup memory management routes
   */
  private setupMemoryRoutes(app: express.Application): void {
    // Search memories
    app.post('/api/memory/search', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const memoryRequest: MemoryRequest = req.body;
        
        if (!memoryRequest.agentId) {
          throw createValidationError('AgentId is required');
        }
        
        const agent = this.runtime?.agents?.get(memoryRequest.agentId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        // Search memories using agent's memory provider
        const memories = await agent.memory.searchMemories(
          memoryRequest.query || '',
          memoryRequest.limit || 10
        );
        
        const response: MemoryResponse = {
          success: true,
          memories,
          total: memories.length,
          agentId: memoryRequest.agentId,
        };
        
        res.json(response);
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error searching memories', { error });
        res.status(500).json({ error: 'Failed to search memories' });
      }
    });

    // Get agent memory stats
    app.get('/api/agents/:agentId/memory/stats', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { agentId } = req.params;
        const agent = this.runtime?.agents?.get(agentId);
        
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        const stats = await agent.memory.getStats();
        
        res.json({
          agentId,
          stats,
          timestamp: new Date(),
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error getting memory stats', { error });
        res.status(500).json({ error: 'Failed to get memory stats' });
      }
    });
  }

  /**
   * Setup action execution routes
   */
  private setupActionRoutes(app: express.Application): void {
    // Execute agent action
    app.post('/api/agents/:agentId/actions', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const { agentId } = req.params;
        const actionRequest: ActionRequest = req.body;
        
        if (!actionRequest.action || !actionRequest.type) {
          throw createValidationError('Action and type are required');
        }
        
        const agent = this.runtime?.agents?.get(agentId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        // Execute the action
        const result = await agent.executeAction({
          id: `action_${Date.now()}`,
          type: actionRequest.type,
          extension: actionRequest.extension || 'api',
          action: actionRequest.action,
          parameters: actionRequest.parameters || {},
          timestamp: new Date(),
          status: 'pending',
        });
        
        const response: ActionResponse = {
          success: result.success,
          result: result.data,
          error: result.error,
          timestamp: new Date(),
        };
        
        res.json(response);
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error executing action', { error });
        res.status(500).json({ error: 'Failed to execute action' });
      }
    });
  }

  /**
   * Setup metrics and monitoring routes
   */
  private setupMetricsRoutes(app: express.Application): void {
    // Get API metrics
    app.get('/api/metrics', (req, res) => {
      this.metrics.httpRequests++;
      
      res.json({
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Setup multi-agent management routes
   */
  private setupMultiAgentRoutes(app: express.Application): void {
    if (!this.runtime?.multiAgentManager) {
      return;
    }

    // Spawn new agent
    app.post('/api/multi-agent/spawn', async (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const spawnParams: SpawnAgentPayload = req.body;
        const agentId = await this.runtime!.multiAgentManager!.spawnAgent(spawnParams);
        
        res.json({
          success: true,
          agentId,
          message: 'Agent spawned successfully',
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error spawning agent', { error });
        res.status(500).json({ error: 'Failed to spawn agent' });
      }
    });

    // Get system metrics
    app.get('/api/multi-agent/metrics', (req, res) => {
      this.metrics.httpRequests++;
      
      try {
        const systemMetrics = this.runtime!.multiAgentManager!.getSystemMetrics();
        res.json(systemMetrics);
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Error getting system metrics', { error });
        res.status(500).json({ error: 'Failed to get system metrics' });
      }
    });
  }

  /**
   * Get or create conversation ID for user
   */
  private getOrCreateConversationId(userId: string): string {
    let conversationId = this.activeConversations.get(userId);
    
    if (!conversationId) {
      conversationId = `conv_${userId}_${Date.now()}`;
      this.activeConversations.set(userId, conversationId);
    }
    
    return conversationId;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
    };
  }
}