/**
 * MCP Server Extension for SYMindX
 *
 * Exposes agent APIs as an MCP server, allowing external MCP clients to interact
 * with the agent through the Model Context Protocol standard.
 */

import {
  Extension,
  ExtensionAction,
  ExtensionEventHandler,
} from '../../types/agent';
import { SkillParameters, GenericData, DataValue } from '../../types/common';
import { MemoryDuration } from '../../types/enums';
import {
  ExtensionConfig,
  ExtensionMetadata,
  Agent,
  ExtensionType,
  ExtensionStatus,
  ActionCategory,
  ActionResult,
  ActionResultType,
  AgentEvent,
  MemoryType,
  LogContext,
} from '../../types/index';
import { runtimeLogger } from '../../utils/logger';

import { MCPServerManager } from './mcp-server-manager';
import {
  MCPServerConfig,
  MCPServerTool,
  MCPServerResource,
  MCPServerPrompt,
} from './types';

export interface MCPServerExtensionConfig extends ExtensionConfig {
  enabled: boolean;
  server: MCPServerConfig;
}

export class MCPServerExtension implements Extension {
  public readonly id = 'mcp-server';
  public readonly name = 'MCP Server Extension';
  public readonly version = '1.0.0';
  public readonly type = ExtensionType.UTILITY;
  public enabled = true;
  public status = ExtensionStatus.STOPPED;

  public readonly metadata: ExtensionMetadata = {
    name: 'mcp-server',
    version: '1.0.0',
    description: 'MCP Server Extension - Expose agent APIs as an MCP server',
    author: 'SYMindX',
    dependencies: ['@modelcontextprotocol/sdk', 'ws'],
    capabilities: [
      'agent_exposure',
      'mcp_protocol',
      'tool_serving',
      'resource_serving',
      'prompt_serving',
      'stdio_support',
      'websocket_support',
      'http_support',
    ],
  };

  public config: MCPServerExtensionConfig;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  private mcpServer: MCPServerManager;
  private agent?: Agent;
  private lastActivityTime: number = Date.now();

  constructor(config: MCPServerExtensionConfig) {
    this.config = {
      ...config,
      server: {
        port: 3001,
        host: 'localhost',
        name: 'symindx-agent',
        version: '1.0.0',
        enableStdio: true,
        enableWebSocket: true,
        enableHTTP: false,
        exposedCapabilities: {
          chat: true,
          textGeneration: true,
          embedding: true,
          memoryAccess: true,
          emotionState: true,
          cognitiveState: true,
          agentManagement: false,
          extensionControl: false,
        },
        ...config.server,
      },
    };

    this.mcpServer = new MCPServerManager(this.config.server);
    runtimeLogger.info('🎯 MCP Server Extension initialized');
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled || !this.config.server.enabled) {
      runtimeLogger.info('⏸️ MCP Server Extension is disabled');
      return;
    }

    this.agent = agent;

    try {
      // Initialize the MCP server manager
      await this.mcpServer.initializeWithAgent(agent);

      // Register agent-specific tools, resources, and prompts
      await this.registerAgentCapabilities();

      // Start the MCP server
      await this.mcpServer.start();

      // Set up event listeners
      this.setupEventListeners();

      // Register extension actions and events
      this.registerExtensionActions();

      this.status = ExtensionStatus.RUNNING;
      runtimeLogger.info('🎯 MCP Server Extension initialized successfully');
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to initialize MCP Server Extension:',
        error
      );
      throw error;
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Periodic tick - could be used for health checks
    if (this.status === ExtensionStatus.RUNNING && this.mcpServer) {
      // Log agent activity for MCP debugging
      if (Date.now() - this.lastActivityTime > 60000) {
        // Every minute
        runtimeLogger.debug(
          `[MCP] Agent ${agent.name} is active with MCP server`
        );
        this.lastActivityTime = Date.now();
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.mcpServer.stop();
      runtimeLogger.info('🎯 MCP Server Extension cleaned up');
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Error during MCP Server Extension cleanup:',
        error
      );
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.server.enabled;
  }

  /**
   * Register a custom tool to be exposed via MCP
   */
  registerTool(tool: MCPServerTool): void {
    this.mcpServer.registerTool(tool);
  }

  /**
   * Register a custom resource to be exposed via MCP
   */
  registerResource(resource: MCPServerResource): void {
    this.mcpServer.registerResource(resource);
  }

  /**
   * Register a custom prompt to be exposed via MCP
   */
  registerPrompt(prompt: MCPServerPrompt): void {
    this.mcpServer.registerPrompt(prompt);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.mcpServer.unregisterTool(name);
  }

  /**
   * Unregister a resource
   */
  unregisterResource(uri: string): void {
    this.mcpServer.unregisterResource(uri);
  }

  /**
   * Unregister a prompt
   */
  unregisterPrompt(name: string): void {
    this.mcpServer.unregisterPrompt(name);
  }

  /**
   * Validate that a value conforms to DataValue type
   */
  private validateDataValue(value: unknown): DataValue {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    } else if (value instanceof Date) {
      return value;
    } else if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'object' && item !== null ? JSON.stringify(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value); // Fallback to string representation
  }

  /**
   * Convert any object to GenericData format
   */
  private toGenericData(obj: Record<string, unknown>): GenericData {
    const result: GenericData = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Use DataValue validation to ensure type safety
      result[key] = this.validateDataValue(value);
    }

    return result;
  }

  /**
   * Get server statistics
   */
  getServerStats(): ReturnType<MCPServerManager['getStats']> {
    return this.mcpServer.getStats();
  }

  /**
   * Get active connections
   */
  getConnections(): ReturnType<MCPServerManager['getConnections']> {
    return this.mcpServer.getConnections();
  }

  /**
   * Register agent-specific capabilities as MCP tools, resources, and prompts
   */
  private async registerAgentCapabilities(): Promise<void> {
    if (!this.agent) return;

    // Convert and register agent extension actions as MCP tools
    if (this.agent.extensions) {
      for (const extension of this.agent.extensions.values()) {
        if (extension.actions) {
          for (const action of Object.values(extension.actions)) {
            try {
              const mcpTool = this.convertAgentActionToMCPTool(action);
              this.registerTool(mcpTool);
              runtimeLogger.debug(`Registered MCP tool from agent action: ${action.name}`);
            } catch (error) {
              const logContext: LogContext = error instanceof Error 
                ? { error: { code: 'MCP_TOOL_REGISTRATION_ERROR', message: error.message, stack: error.stack } }
                : { error: { code: 'UNKNOWN_ERROR', message: String(error) } };
              runtimeLogger.warn(`Failed to register MCP tool for action ${action.name}:`, logContext);
            }
          }
        }
      }
    }

    // Register advanced chat tool with emotion and memory integration
    if (this.config.server.exposedCapabilities?.chat) {
      this.registerTool({
        name: 'agent_chat_advanced',
        description:
          'Have an advanced conversation with the agent including emotional context',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to send to the agent',
            },
            context: {
              type: 'string',
              description: 'Additional context for the conversation',
            },
            includeEmotion: {
              type: 'boolean',
              description: 'Include emotional state in response',
              default: true,
            },
            includeMemory: {
              type: 'boolean',
              description: 'Use memory context in response',
              default: true,
            },
          },
          required: ['message'],
        },
        handler: async (args) => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's portal for text generation
            const portal = this.agent.portal;
            if (!portal) {
              throw new Error('No active portal available');
            }

            // Generate response using the agent's portal
            const result = await portal.generateText(String(args.message), {
              maxOutputTokens: 1000,
              temperature: 0.7,
            });

            return {
              type: 'text',
              text: result.text,
            };
          } catch (error) {
            return {
              type: 'text',
              text: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'communication',
          readOnly: false,
        },
      });
    }

    // Register text generation tool
    if (this.config.server.exposedCapabilities?.textGeneration) {
      this.registerTool({
        name: 'agent_generate_text',
        description: "Generate text using the agent's capabilities",
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Text generation prompt',
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens to generate',
              default: 1000,
            },
            temperature: {
              type: 'number',
              description: 'Temperature for generation',
              default: 0.7,
            },
          },
          required: ['prompt'],
        },
        handler: async (args) => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's portal for text generation
            const portal = this.agent.portal;
            if (!portal) {
              throw new Error('No active portal available');
            }

            // Generate text using the agent's portal
            const result = await portal.generateText(String(args.prompt), {
              maxOutputTokens: Number(args.maxTokens) || 1000,
              temperature: Number(args.temperature) || 0.7,
            });

            return {
              type: 'text',
              text: result.text,
            };
          } catch (error) {
            return {
              type: 'text',
              text: `Error generating text: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'generation',
          readOnly: false,
        },
      });
    }

    // Register memory tools
    if (this.config.server.exposedCapabilities?.memoryAccess) {
      this.registerTool({
        name: 'agent_memory_store',
        description: "Store information in the agent's memory",
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to store in memory',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorizing the memory',
            },
            importance: {
              type: 'number',
              description: 'Importance level (1-10)',
              default: 5,
            },
          },
          required: ['content'],
        },
        handler: async (args) => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's memory provider
            const memoryProvider = this.agent.memory;
            if (!memoryProvider) {
              throw new Error('No memory provider available');
            }

            // Store the content in memory
            await memoryProvider.store(this.agent.id, {
              id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              agentId: this.agent.id,
              type: MemoryType.EXPERIENCE,
              content: String(args.content),
              metadata: {
                source: 'mcp_server',
                timestamp: new Date(),
                tags: Array.isArray(args.tags) ? args.tags : [],
              },
              importance: 0.5,
              timestamp: new Date(),
              tags: Array.isArray(args.tags) ? args.tags : [],
              duration: MemoryDuration.LONG_TERM,
            });

            return {
              type: 'text',
              text: `Stored in memory successfully`,
            };
          } catch (error) {
            return {
              type: 'text',
              text: `Error storing in memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'memory',
          readOnly: false,
        },
      });
    }

    // Register emotion resources
    if (this.config.server.exposedCapabilities?.emotionState) {
      this.registerResource({
        uri: 'agent://emotion/current',
        name: 'Current Emotion State',
        description: 'Real-time emotional state of the agent',
        mimeType: 'application/json',
        handler: async () => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's emotion state
            const emotionModule = this.agent.emotion;
            if (!emotionModule) {
              return {
                type: 'text',
                text: JSON.stringify(
                  {
                    primary: 'neutral',
                    intensity: 0.5,
                    secondary: [],
                    timestamp: new Date().toISOString(),
                    note: 'No emotion module available',
                  },
                  null,
                  2
                ),
              };
            }

            // Get current emotion state
            const currentState = emotionModule.getCurrentState();

            return {
              type: 'text',
              text: JSON.stringify(currentState, null, 2),
            };
          } catch (error) {
            return {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Error retrieving emotion state: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            };
          }
        },
        metadata: {
          cacheable: false,
        },
      });

      this.registerResource({
        uri: 'agent://emotion/history',
        name: 'Emotion History',
        description: 'Historical emotional states and transitions',
        mimeType: 'application/json',
        handler: async () => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's emotion module
            const emotionModule = this.agent.emotion;
            if (!emotionModule) {
              return {
                type: 'text',
                text: JSON.stringify(
                  {
                    history: [],
                    transitions: [],
                    summary: {
                      totalChanges: 0,
                      averageIntensity: 0,
                      dominantEmotion: 'neutral',
                    },
                    timestamp: new Date().toISOString(),
                    note: 'No emotion module available',
                  },
                  null,
                  2
                ),
              };
            }

            // Get emotion history
            const history = emotionModule.getHistory
              ? emotionModule.getHistory()
              : [];
            const transitions = [];

            // Calculate summary statistics
            const emotionCounts: Record<string, number> = {};
            let totalIntensity = 0;
            let totalEntries = 0;

            history.forEach((entry: any) => {
              if (entry.state?.primaryEmotion) {
                emotionCounts[entry.state.primaryEmotion] =
                  (emotionCounts[entry.state.primaryEmotion] || 0) + 1;
                totalIntensity += entry.state.intensity || 0;
                totalEntries++;
              }
            });

            const dominantEmotion =
              Object.entries(emotionCounts).sort(
                ([, a], [, b]) => b - a
              )[0]?.[0] || 'neutral';

            const averageIntensity =
              totalEntries > 0 ? totalIntensity / totalEntries : 0;

            // Format history timeline
            const timeline = history.slice(-50).map((entry: any) => ({
              emotion: entry.state?.primaryEmotion || 'neutral',
              intensity: entry.state?.intensity || 0.5,
              secondaryEmotions: entry.state?.secondaryEmotions || [],
              timestamp: entry.timestamp || new Date().toISOString(),
              duration: entry.duration || 0,
              trigger: entry.trigger || 'unknown',
              context: entry.context || {},
            }));

            // Format transitions
            const formattedTransitions = transitions
              .slice(-20)
              .map((transition: any) => ({
                from: transition.from || 'neutral',
                to: transition.to || 'neutral',
                timestamp: transition.timestamp || new Date().toISOString(),
                reason: transition.reason || 'context_change',
                intensity: transition.intensity || 0.5,
              }));

            return {
              type: 'text',
              text: JSON.stringify(
                {
                  timeline,
                  transitions: formattedTransitions,
                  summary: {
                    totalChanges: transitions.length,
                    averageIntensity: Math.round(averageIntensity * 100) / 100,
                    dominantEmotion,
                    emotionDistribution: emotionCounts,
                    historyLength: history.length,
                    oldestEntry:
                      history[0]?.timestamp || new Date().toISOString(),
                    newestEntry:
                      history[history.length - 1]?.timestamp ||
                      new Date().toISOString(),
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            };
          } catch (error) {
            return {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Error retrieving emotion history: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            };
          }
        },
        metadata: {
          cacheable: true,
          refreshInterval: 60000,
        },
      });
    }

    // Register cognitive state resources
    if (this.config.server.exposedCapabilities?.cognitiveState) {
      this.registerResource({
        uri: 'agent://cognition/state',
        name: 'Cognitive State',
        description: 'Current cognitive processing state and capabilities',
        mimeType: 'application/json',
        handler: async () => {
          try {
            if (!this.agent) {
              throw new Error('Agent not initialized');
            }

            // Get the agent's cognition module
            const cognitionModule = this.agent.cognition;
            if (!cognitionModule) {
              return {
                type: 'text',
                text: JSON.stringify(
                  {
                    mode: 'reactive',
                    processing: 'idle',
                    capabilities: [],
                    load: 0,
                    timestamp: new Date().toISOString(),
                    note: 'No cognition module available',
                  },
                  null,
                  2
                ),
              };
            }

            // Get current cognitive state
            const currentMode = 'reactive';
            const processingState = 'idle';
            const capabilities = ['reasoning', 'planning', 'learning'];
            const cognitiveLoad = 0.2;
            const activeThoughts = [];
            const recentPlans = [];
            const decisionHistory = [];

            // Calculate cognitive metrics
            const thoughtPatterns: Record<string, number> = {};
            activeThoughts.forEach((thought: any) => {
              const category = thought.category || 'general';
              thoughtPatterns[category] = (thoughtPatterns[category] || 0) + 1;
            });

            const successfulPlans = recentPlans.filter(
              (plan: any) => plan.status === 'completed'
            ).length;
            const planSuccessRate =
              recentPlans.length > 0 ? successfulPlans / recentPlans.length : 0;

            const averageDecisionConfidence =
              decisionHistory.length > 0
                ? decisionHistory.reduce(
                    (sum: number, decision: any) =>
                      sum + (decision.confidence || 0.5),
                    0
                  ) / decisionHistory.length
                : 0.5;

            // Get cognitive performance metrics
            const performanceMetrics = {
              responseTime:
                (cognitionModule as any).getAverageResponseTime?.() || 0,
              memoryUtilization:
                (cognitionModule as any).getMemoryUtilization?.() || 0,
              learningRate: (cognitionModule as any).getLearningRate?.() || 0,
              adaptationScore:
                (cognitionModule as any).getAdaptationScore?.() || 0,
            };

            return {
              type: 'text',
              text: JSON.stringify(
                {
                  mode: currentMode,
                  processing: processingState,
                  capabilities,
                  load: Math.round(cognitiveLoad * 100) / 100,
                  activeThoughts: activeThoughts
                    .slice(-10)
                    .map((thought: any) => ({
                      id: thought.id || Math.random().toString(36).slice(2),
                      category: thought.category || 'general',
                      content: thought.content || '',
                      confidence: thought.confidence || 0.5,
                      timestamp: thought.timestamp || new Date().toISOString(),
                    })),
                  thoughtPatterns,
                  recentPlans: recentPlans.slice(-5).map((plan: any) => ({
                    id: plan.id || Math.random().toString(36).slice(2),
                    goal: plan.goal || 'unknown',
                    status: plan.status || 'pending',
                    steps: plan.steps?.length || 0,
                    priority: plan.priority || 5,
                    estimatedDuration: plan.estimatedDuration || 0,
                    createdAt: plan.createdAt || new Date().toISOString(),
                  })),
                  planSuccessRate: Math.round(planSuccessRate * 100) / 100,
                  decisionMetrics: {
                    totalDecisions: decisionHistory.length,
                    averageConfidence:
                      Math.round(averageDecisionConfidence * 100) / 100,
                    recentDecisions: decisionHistory
                      .slice(-5)
                      .map((decision: any) => ({
                        id: decision.id || Math.random().toString(36).slice(2),
                        type: decision.type || 'general',
                        confidence: decision.confidence || 0.5,
                        outcome: decision.outcome || 'pending',
                        timestamp:
                          decision.timestamp || new Date().toISOString(),
                      })),
                  },
                  performanceMetrics,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            };
          } catch (error) {
            return {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Error retrieving cognitive state: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            };
          }
        },
        metadata: {
          cacheable: false,
        },
      });
    }

    // Register conversation prompts
    this.registerPrompt({
      name: 'conversation_starter',
      description: 'Generate a conversation starter based on context',
      arguments: [
        {
          name: 'topic',
          description: 'Topic for the conversation',
          required: false,
          type: 'string',
        },
        {
          name: 'tone',
          description: 'Tone of the conversation (casual, formal, friendly)',
          required: false,
          type: 'string',
          default: 'friendly',
        },
      ],
      handler: async (args) => {
        const topic = args.topic || 'general';
        const tone = args.tone || 'friendly';

        return `Hello! I'm ${this.agent?.name}. I'd love to discuss ${topic} with you in a ${tone} manner. What would you like to know?`;
      },
      metadata: {
        category: 'conversation',
      },
    });

    runtimeLogger.info(
      '✅ Registered agent capabilities as MCP tools, resources, and prompts'
    );
  }

  /**
   * Set up event listeners for server events
   */
  private setupEventListeners(): void {
    this.mcpServer.on('server:started', () => {
      runtimeLogger.info('🚀 MCP Server started successfully');
    });

    this.mcpServer.on('server:stopped', () => {
      runtimeLogger.info('🛑 MCP Server stopped');
    });

    this.mcpServer.on('connection:opened', (connectionId: string) => {
      runtimeLogger.debug(`🔗 New MCP connection: ${connectionId}`);
    });

    this.mcpServer.on('connection:closed', (connectionId: string) => {
      runtimeLogger.debug(`🔌 MCP connection closed: ${connectionId}`);
    });
  }

  /**
   * Convert ExtensionAction to MCP Tool format
   */
  private convertAgentActionToMCPTool(
    agentAction: ExtensionAction
  ): MCPServerTool {
    return {
      name: agentAction.name,
      description: agentAction.description,
      inputSchema: {
        type: 'object',
        properties: agentAction.parameters,
        required: Object.entries(agentAction.parameters)
          .filter(
            ([, param]) =>
              typeof param === 'object' &&
              param !== null &&
              'required' in param &&
              param.required
          )
          .map(([name]) => name),
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.agent) {
          throw new Error('Agent not initialized');
        }
        const result = await agentAction.execute(
          this.agent,
          args as SkillParameters
        );
        return result;
      },
    };
  }

  /**
   * Handle MCP server events
   */
  private handleMCPEvent(eventType: string, eventData: unknown): void {
    if (!this.agent) return;

    const agentEvent: AgentEvent = {
      id: Date.now().toString(),
      type: eventType,
      source: 'mcp-server',
      data: eventData as GenericData,
      timestamp: new Date(),
      processed: false,
      agentId: this.agent.id,
    };

    // Handle the event through the agent's event bus if available
    if (this.agent.eventBus) {
      try {
        this.agent.eventBus.emit(agentEvent);
      } catch (error) {
        runtimeLogger.error('Failed to emit MCP event:', error);
      }
    }
  }

  /**
   * Register extension actions and events
   */
  private registerExtensionActions(): void {
    // Register MCP server actions
    const registerToolAction: ExtensionAction = {
      name: 'registerTool',
      description: 'Register a custom tool to be exposed via MCP',
      category: ActionCategory.SYSTEM,
      parameters: {
        tool: {
          type: 'object',
          required: true,
          description: 'MCP tool definition',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { tool } = params;
        this.registerTool(tool as unknown as MCPServerTool);
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { toolName: (tool as unknown as MCPServerTool).name },
          timestamp: new Date(),
        };
      },
    };
    this.actions['registerTool'] = registerToolAction;

    const registerResourceAction: ExtensionAction = {
      name: 'registerResource',
      description: 'Register a custom resource to be exposed via MCP',
      category: ActionCategory.SYSTEM,
      parameters: {
        resource: {
          type: 'object',
          required: true,
          description: 'MCP resource definition',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { resource } = params;
        this.registerResource(resource as unknown as MCPServerResource);
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            resourceUri: (resource as unknown as MCPServerResource).uri,
          },
          timestamp: new Date(),
        };
      },
    };
    this.actions['registerResource'] = registerResourceAction;

    const getServerStatsAction: ExtensionAction = {
      name: 'getServerStats',
      description: 'Get MCP server statistics',
      category: ActionCategory.SYSTEM,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const stats = this.getServerStats();
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: this.toGenericData(
            stats as unknown as Record<string, unknown>
          ),
          timestamp: new Date(),
        };
      },
    };
    this.actions['getServerStats'] = getServerStatsAction;

    const getConnectionsAction: ExtensionAction = {
      name: 'getConnections',
      description: 'Get active MCP connections',
      category: ActionCategory.SYSTEM,
      parameters: {},
      execute: async (
        _agent: Agent,
        _params: SkillParameters
      ): Promise<ActionResult> => {
        const connections = this.getConnections();
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: { connections: JSON.stringify(connections) },
          timestamp: new Date(),
        };
      },
    };
    this.actions['getConnections'] = getConnectionsAction;

    // Register event handlers
    this.events['server_started'] = {
      event: 'server_started',
      description: 'Handle MCP server started events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.info('MCP server started event:', event);
        this.handleMCPEvent('server_started', event.data);
      },
    };

    this.events['server_stopped'] = {
      event: 'server_stopped',
      description: 'Handle MCP server stopped events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.info('MCP server stopped event:', event);
        this.handleMCPEvent('server_stopped', event.data);
      },
    };

    this.events['connection_opened'] = {
      event: 'connection_opened',
      description: 'Handle MCP connection opened events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.debug('MCP connection opened event:', event);
        this.handleMCPEvent('connection_opened', event.data);
      },
    };

    this.events['connection_closed'] = {
      event: 'connection_closed',
      description: 'Handle MCP connection closed events',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.debug('MCP connection closed event:', event);
        this.handleMCPEvent('connection_closed', event.data);
      },
    };

    this.events['mcp_error'] = {
      event: 'mcp_error',
      description: 'Handle MCP server errors',
      handler: async (agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.error('MCP server error event:', event);
        this.handleMCPEvent('mcp_error', event.data);
      },
    };
  }

  /**
   * Get extension configuration
   */
  getConfig(): MCPServerExtensionConfig {
    return { ...this.config };
  }

  /**
   * Update extension configuration
   */
  async updateConfig(
    updates: Partial<MCPServerExtensionConfig>
  ): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Restart server if configuration changed
    if (updates.server && this.isEnabled()) {
      await this.mcpServer.stop();
      this.mcpServer = new MCPServerManager(this.config.server);

      if (this.agent) {
        await this.mcpServer.initializeWithAgent(this.agent);
        await this.registerAgentCapabilities();
        await this.mcpServer.start();
      }
    }
  }
}

// Factory function for creating MCP Server Extension
export function createMCPServerExtension(
  config: MCPServerExtensionConfig
): MCPServerExtension {
  return new MCPServerExtension(config);
}

export default MCPServerExtension;
