/**
 * MCP Server Extension for SYMindX
 * 
 * Exposes agent APIs as an MCP server, allowing external MCP clients to interact
 * with the agent through the Model Context Protocol standard.
 */

import { ExtensionConfig, Extension, ExtensionMetadata, Agent } from '../../types/index.js'
import { runtimeLogger } from '../../utils/logger.js'
import { MCPServerManager } from './mcp-server-manager.js'
import { MCPServerConfig, MCPServerTool, MCPServerResource, MCPServerPrompt } from './types.js'

export interface MCPServerExtensionConfig extends ExtensionConfig {
  enabled: boolean
  server: MCPServerConfig
}

export class MCPServerExtension implements Extension {
  public readonly id = 'mcp-server'
  public readonly name = 'MCP Server Extension'
  public readonly version = '1.0.0'
  public readonly type = 'mcp_server'
  public enabled = true
  public status = 'stopped'
  
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
      'http_support'
    ]
  }

  public config: MCPServerExtensionConfig
  public actions: Record<string, any> = {}
  public events: Record<string, any> = {}
  
  private mcpServer: MCPServerManager
  private agent?: Agent

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
          extensionControl: false
        },
        ...config.server
      }
    }

    this.mcpServer = new MCPServerManager(this.config.server)
    runtimeLogger.info('🎯 MCP Server Extension initialized')
  }

  async init(agent: Agent): Promise<void> {
    // Initialize with agent
    this.status = 'initializing'
    await this.initialize(agent)
  }
  
  async tick(agent: Agent): Promise<void> {
    // Periodic tick - could be used for health checks
  }
  
  async initialize(agent: Agent): Promise<void> {
    if (!this.config.enabled || !this.config.server.enabled) {
      runtimeLogger.info('⏸️ MCP Server Extension is disabled')
      return
    }

    this.agent = agent

    try {
      // Initialize the MCP server manager
      await this.mcpServer.initialize(agent)

      // Register agent-specific tools, resources, and prompts
      await this.registerAgentCapabilities()

      // Start the MCP server
      await this.mcpServer.start()

      // Set up event listeners
      this.setupEventListeners()

      runtimeLogger.info('🎯 MCP Server Extension initialized successfully')
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize MCP Server Extension:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.mcpServer.stop()
      runtimeLogger.info('🎯 MCP Server Extension cleaned up')
    } catch (error) {
      runtimeLogger.error('❌ Error during MCP Server Extension cleanup:', error)
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.server.enabled
  }

  /**
   * Register a custom tool to be exposed via MCP
   */
  registerTool(tool: MCPServerTool): void {
    this.mcpServer.registerTool(tool)
  }

  /**
   * Register a custom resource to be exposed via MCP
   */
  registerResource(resource: MCPServerResource): void {
    this.mcpServer.registerResource(resource)
  }

  /**
   * Register a custom prompt to be exposed via MCP
   */
  registerPrompt(prompt: MCPServerPrompt): void {
    this.mcpServer.registerPrompt(prompt)
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.mcpServer.unregisterTool(name)
  }

  /**
   * Unregister a resource
   */
  unregisterResource(uri: string): void {
    this.mcpServer.unregisterResource(uri)
  }

  /**
   * Unregister a prompt
   */
  unregisterPrompt(name: string): void {
    this.mcpServer.unregisterPrompt(name)
  }

  /**
   * Get server statistics
   */
  getServerStats() {
    return this.mcpServer.getStats()
  }

  /**
   * Get active connections
   */
  getConnections() {
    return this.mcpServer.getConnections()
  }

  /**
   * Register agent-specific capabilities as MCP tools, resources, and prompts
   */
  private async registerAgentCapabilities(): Promise<void> {
    if (!this.agent) return

    // Register advanced chat tool with emotion and memory integration
    if (this.config.server.exposedCapabilities?.chat) {
      this.registerTool({
        name: 'agent_chat_advanced',
        description: 'Have an advanced conversation with the agent including emotional context',
        inputSchema: {
          type: 'object',
          properties: {
            message: { 
              type: 'string', 
              description: 'Message to send to the agent' 
            },
            context: { 
              type: 'string', 
              description: 'Additional context for the conversation' 
            },
            includeEmotion: { 
              type: 'boolean', 
              description: 'Include emotional state in response',
              default: true
            },
            includeMemory: { 
              type: 'boolean', 
              description: 'Use memory context in response',
              default: true
            }
          },
          required: ['message']
        },
        handler: async (args) => {
          // TODO: Integrate with actual agent chat system
          const response = `Advanced agent response to: ${args.message}`
          
          return {
            type: 'text',
            text: response
          }
        },
        metadata: { 
          category: 'communication', 
          readOnly: false 
        }
      })
    }

    // Register text generation tool
    if (this.config.server.exposedCapabilities?.textGeneration) {
      this.registerTool({
        name: 'agent_generate_text',
        description: 'Generate text using the agent\'s capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { 
              type: 'string', 
              description: 'Text generation prompt' 
            },
            maxTokens: { 
              type: 'number', 
              description: 'Maximum tokens to generate',
              default: 1000
            },
            temperature: { 
              type: 'number', 
              description: 'Temperature for generation',
              default: 0.7
            }
          },
          required: ['prompt']
        },
        handler: async (args) => {
          // TODO: Integrate with actual agent text generation
          return {
            type: 'text',
            text: `Generated text for prompt: ${args.prompt}`
          }
        },
        metadata: { 
          category: 'generation', 
          readOnly: false 
        }
      })
    }

    // Register memory tools
    if (this.config.server.exposedCapabilities?.memoryAccess) {
      this.registerTool({
        name: 'agent_memory_store',
        description: 'Store information in the agent\'s memory',
        inputSchema: {
          type: 'object',
          properties: {
            content: { 
              type: 'string', 
              description: 'Content to store in memory' 
            },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Tags for categorizing the memory'
            },
            importance: { 
              type: 'number', 
              description: 'Importance level (1-10)',
              default: 5
            }
          },
          required: ['content']
        },
        handler: async (args) => {
          // TODO: Integrate with actual agent memory system
          return {
            type: 'text',
            text: `Stored in memory: ${args.content}`
          }
        },
        metadata: { 
          category: 'memory', 
          readOnly: false 
        }
      })
    }

    // Register emotion resources
    if (this.config.server.exposedCapabilities?.emotionState) {
      this.registerResource({
        uri: 'agent://emotion/current',
        name: 'Current Emotion State',
        description: 'Real-time emotional state of the agent',
        mimeType: 'application/json',
        handler: async () => {
          // TODO: Integrate with actual emotion system
          return {
            type: 'text',
            text: JSON.stringify({
              primary: 'neutral',
              intensity: 0.5,
              secondary: ['curious'],
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        },
        metadata: { 
          cacheable: false 
        }
      })

      this.registerResource({
        uri: 'agent://emotion/history',
        name: 'Emotion History',
        description: 'Historical emotional states and transitions',
        mimeType: 'application/json',
        handler: async () => {
          // TODO: Integrate with actual emotion system
          return {
            type: 'text',
            text: JSON.stringify({
              timeline: [
                { emotion: 'neutral', timestamp: new Date().toISOString(), duration: 3600 }
              ]
            }, null, 2)
          }
        },
        metadata: { 
          cacheable: true, 
          refreshInterval: 60000 
        }
      })
    }

    // Register cognitive state resources
    if (this.config.server.exposedCapabilities?.cognitiveState) {
      this.registerResource({
        uri: 'agent://cognition/state',
        name: 'Cognitive State',
        description: 'Current cognitive processing state and capabilities',
        mimeType: 'application/json',
        handler: async () => {
          // TODO: Integrate with actual cognition system
          return {
            type: 'text',
            text: JSON.stringify({
              mode: 'reactive',
              processing: 'idle',
              capabilities: ['reasoning', 'planning', 'learning'],
              load: 0.2
            }, null, 2)
          }
        },
        metadata: { 
          cacheable: false 
        }
      })
    }

    // Register conversation prompts
    this.registerPrompt({
      name: 'conversation_starter',
      description: 'Generate a conversation starter based on context',
      arguments: [{
        name: 'topic',
        description: 'Topic for the conversation',
        required: false,
        type: 'string'
      }, {
        name: 'tone',
        description: 'Tone of the conversation (casual, formal, friendly)',
        required: false,
        type: 'string',
        default: 'friendly'
      }],
      handler: async (args) => {
        const topic = args.topic || 'general'
        const tone = args.tone || 'friendly'
        
        return `Hello! I'm ${this.agent?.name}. I'd love to discuss ${topic} with you in a ${tone} manner. What would you like to know?`
      },
      metadata: { 
        category: 'conversation' 
      }
    })

    runtimeLogger.info('✅ Registered agent capabilities as MCP tools, resources, and prompts')
  }

  /**
   * Set up event listeners for server events
   */
  private setupEventListeners(): void {
    this.mcpServer.on('server:started', () => {
      runtimeLogger.info('🚀 MCP Server started successfully')
    })

    this.mcpServer.on('server:stopped', () => {
      runtimeLogger.info('🛑 MCP Server stopped')
    })

    this.mcpServer.on('connection:opened', (connectionId: string) => {
      runtimeLogger.debug(`🔗 New MCP connection: ${connectionId}`)
    })

    this.mcpServer.on('connection:closed', (connectionId: string) => {
      runtimeLogger.debug(`🔌 MCP connection closed: ${connectionId}`)
    })
  }

  /**
   * Get extension configuration
   */
  getConfig(): MCPServerExtensionConfig {
    return { ...this.config }
  }

  /**
   * Update extension configuration
   */
  async updateConfig(updates: Partial<MCPServerExtensionConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    
    // Restart server if configuration changed
    if (updates.server && this.isEnabled()) {
      await this.mcpServer.stop()
      this.mcpServer = new MCPServerManager(this.config.server)
      
      if (this.agent) {
        await this.mcpServer.initialize(this.agent)
        await this.registerAgentCapabilities()
        await this.mcpServer.start()
      }
    }
  }
}

// Factory function for creating MCP Server Extension
export function createMCPServerExtension(config: MCPServerExtensionConfig): MCPServerExtension {
  return new MCPServerExtension(config)
}

export default MCPServerExtension