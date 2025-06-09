/**
 * MCP Extension for SYMindX
 * 
 * This extension provides Model Context Protocol support, allowing the agent
 * to expose tools, resources, and prompts to MCP-compatible clients.
 */

import { Extension, Agent, ActionResult, ExtensionAction, ExtensionEventHandler } from '../../types/agent.js'
import { SkillParameters } from '../../types/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
  McpConfig,
  McpServerInstance,
  McpToolResult,
  McpResourceResult,
  McpPromptResult,
  McpContext
} from './types.js'
import { initializeSkills } from './skills/index.js'

export class McpExtension implements Extension {
  id = 'mcp'
  name = 'Model Context Protocol'
  version = '1.0.0'
  enabled = true
  config: McpConfig
  
  private serverInstance?: McpServerInstance
  private agent?: Agent
  private toolHandlers: Map<string, Function> = new Map()
  private resourceHandlers: Map<string, Function> = new Map()
  private promptHandlers: Map<string, Function> = new Map()
  private skills: any[] = []

  constructor(config: McpConfig) {
    this.config = {
      enabled: true,
      serverName: 'symindx-agent',
      serverVersion: '1.0.0',
      transport: 'stdio',
      tools: [],
      resources: [],
      prompts: [],
      capabilities: {
        resources: true,
        tools: true,
        prompts: true,
        logging: true
      },
      ...config
    }
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      console.log('🔌 MCP Extension disabled')
      return
    }

    this.agent = agent
    console.log('🔌 Initializing MCP Extension...')

    try {
      // Initialize skills
      this.skills = initializeSkills(this)
      
      // Create MCP server
      const server = new McpServer({
        name: this.config.serverName,
        version: this.config.serverVersion
      }, {
        capabilities: this.config.capabilities
      })

      // Register default tools
      await this.registerDefaultTools(server)
      
      // Register configured tools
      await this.registerConfiguredTools(server)
      
      // Register configured resources
      await this.registerConfiguredResources(server)
      
      // Register configured prompts
      await this.registerConfiguredPrompts(server)

      // Set up transport
      const transport = new StdioServerTransport()
      
      this.serverInstance = {
        server,
        transport,
        isRunning: false
      }

      console.log('✅ MCP Extension initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MCP Extension:', error)
      throw error
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Start MCP server if not running
    if (this.serverInstance && !this.serverInstance.isRunning) {
      try {
        await this.serverInstance.server.connect(this.serverInstance.transport)
        this.serverInstance.isRunning = true
        console.log('🚀 MCP Server started and listening')
      } catch (error) {
        console.error('❌ Failed to start MCP server:', error)
      }
    }
  }

  private async registerDefaultTools(server: McpServer): Promise<void> {
    // Agent status tool
    server.tool(
      'get_agent_status',
      {
        include_memory: z.boolean().optional().default(false),
        include_emotion: z.boolean().optional().default(false)
      },
      async ({ include_memory, include_emotion }) => {
        const context = this.createContext()
        return await this.getAgentStatus(context, { include_memory, include_emotion })
      }
    )

    // Memory query tool
    server.tool(
      'query_memory',
      {
        query: z.string(),
        limit: z.number().optional().default(10)
      },
      async ({ query, limit }) => {
        const context = this.createContext()
        return await this.queryMemory(context, { query, limit })
      }
    )

    // Chat with agent tool
    server.tool(
      'chat_with_agent',
      {
        message: z.string(),
        context: z.record(z.any()).optional()
      },
      async ({ message, context }) => {
        const mcpContext = this.createContext()
        return await this.chatWithAgent(mcpContext, { message, context })
      }
    )

    // Execute action tool
    server.tool(
      'execute_action',
      {
        extension: z.string(),
        action: z.string(),
        parameters: z.record(z.any()).optional().default({})
      },
      async ({ extension, action, parameters }) => {
        const context = this.createContext()
        return await this.executeAction(context, { extension, action, parameters })
      }
    )
  }

  private async registerConfiguredTools(server: McpServer): Promise<void> {
    for (const toolConfig of this.config.tools) {
      const handler = this.toolHandlers.get(toolConfig.handler)
      if (handler) {
        server.tool(
          toolConfig.name,
          toolConfig.inputSchema,
          async (params) => {
            const context = this.createContext()
            return await handler(context, params)
          }
        )
      }
    }
  }

  private async registerConfiguredResources(server: McpServer): Promise<void> {
    // Set up resource handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.config.resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType || 'text/plain'
        }))
      }
    })

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri
      const resourceConfig = this.config.resources.find(r => r.uri === uri)
      
      if (!resourceConfig) {
        throw new Error(`Resource not found: ${uri}`)
      }

      const handler = this.resourceHandlers.get(resourceConfig.handler)
      if (!handler) {
        throw new Error(`Handler not found for resource: ${resourceConfig.handler}`)
      }

      const context = this.createContext()
      return await handler(context, { uri })
    })
  }

  private async registerConfiguredPrompts(server: McpServer): Promise<void> {
    // Set up prompt handlers
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: this.config.prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments
        }))
      }
    })

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const name = request.params.name
      const promptConfig = this.config.prompts.find(p => p.name === name)
      
      if (!promptConfig) {
        throw new Error(`Prompt not found: ${name}`)
      }

      const handler = this.promptHandlers.get(promptConfig.handler)
      if (!handler) {
        throw new Error(`Handler not found for prompt: ${promptConfig.handler}`)
      }

      const context = this.createContext()
      return await handler(context, request.params.arguments || {})
    })
  }

  // Default tool implementations
  private async getAgentStatus(context: McpContext, params: { include_memory: boolean, include_emotion: boolean }): Promise<McpToolResult> {
    if (!this.agent) {
      return {
        content: [{ type: 'text', text: 'Agent not available' }],
        isError: true
      }
    }

    const status = {
      id: this.agent.id,
      name: this.agent.name,
      status: this.agent.status,
      lastUpdate: this.agent.lastUpdate.toISOString()
    }

    if (params.include_emotion && this.agent.emotion) {
      (status as any).emotion = {
        current: this.agent.emotion.getCurrentEmotion?.() || 'neutral',
        intensity: this.agent.emotion.getIntensity?.() || 0.5
      }
    }

    if (params.include_memory && this.agent.memory) {
      const recentMemories = await this.agent.memory.getRecent?.(5) || []
      ;(status as any).recentMemories = recentMemories.length
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(status, null, 2)
      }]
    }
  }

  private async queryMemory(context: McpContext, params: { query: string, limit: number }): Promise<McpToolResult> {
    if (!this.agent?.memory) {
      return {
        content: [{ type: 'text', text: 'Memory not available' }],
        isError: true
      }
    }

    try {
      const memories = await this.agent.memory.search?.(params.query, params.limit) || []
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(memories, null, 2)
        }]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Memory query failed: ${error}` }],
        isError: true
      }
    }
  }

  private async chatWithAgent(context: McpContext, params: { message: string, context?: any }): Promise<McpToolResult> {
    if (!this.agent?.portal) {
      return {
        content: [{ type: 'text', text: 'Agent portal not available' }],
        isError: true
      }
    }

    try {
      // Create a chat message
      const messages = [
        {
          role: 'user' as const,
          content: params.message
        }
      ]

      // Generate response using the agent's portal
      const response = await this.agent.portal.generateChat(messages)
      
      return {
        content: [{
          type: 'text',
          text: response.content
        }]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Chat failed: ${error}` }],
        isError: true
      }
    }
  }

  private async executeAction(context: McpContext, params: { extension: string, action: string, parameters: any }): Promise<McpToolResult> {
    if (!this.agent) {
      return {
        content: [{ type: 'text', text: 'Agent not available' }],
        isError: true
      }
    }

    try {
      const extension = this.agent.extensions.find(ext => ext.id === params.extension)
      if (!extension) {
        return {
          content: [{ type: 'text', text: `Extension not found: ${params.extension}` }],
          isError: true
        }
      }

      const actionHandler = extension.actions[params.action]
      if (!actionHandler) {
        return {
          content: [{ type: 'text', text: `Action not found: ${params.action}` }],
          isError: true
        }
      }

      const result = await actionHandler.execute(this.agent, params.parameters)
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Action execution failed: ${error}` }],
        isError: true
      }
    }
  }

  private createContext(): McpContext {
    return {
      agentId: this.agent?.id || 'unknown',
      sessionId: Date.now().toString(),
      metadata: {}
    }
  }

  // Public methods for registering custom handlers
  registerToolHandler(name: string, handler: Function): void {
    this.toolHandlers.set(name, handler)
  }

  registerResourceHandler(name: string, handler: Function): void {
    this.resourceHandlers.set(name, handler)
  }

  registerPromptHandler(name: string, handler: Function): void {
    this.promptHandlers.set(name, handler)
  }

  // Server management methods
  async startServer(config?: McpConfig): Promise<void> {
    if (this.serverInstance && !this.serverInstance.isRunning) {
      await this.serverInstance.server.connect(this.serverInstance.transport)
      this.serverInstance.isRunning = true
    }
  }

  async stopServer(): Promise<void> {
    if (this.serverInstance && this.serverInstance.isRunning) {
      await this.serverInstance.server.close()
      this.serverInstance.isRunning = false
    }
  }

  isServerRunning(): boolean {
    return this.serverInstance?.isRunning || false
  }

  getServerCapabilities(): any {
    return {
      tools: this.config.tools.length > 0,
      resources: this.config.resources.length > 0,
      prompts: this.config.prompts.length > 0
    }
  }

  getAvailableTools(): any[] {
    return this.config.tools || []
  }

  validateToolParameters(toolName: string, parameters: any): { valid: boolean; errors?: string[] } {
    const tool = this.config.tools.find(t => t.name === toolName)
    if (!tool) {
      return { valid: false, errors: [`Tool '${toolName}' not found`] }
    }
    // Basic validation - can be enhanced
    return { valid: true }
  }

  async executeTool(toolName: string, parameters: any): Promise<any> {
    const handler = this.toolHandlers.get(toolName)
    if (!handler) {
      return { success: false, error: `No handler found for tool: ${toolName}` }
    }
    
    try {
      const context = this.createContext()
      const result = await handler(context, parameters)
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  logToolExecution(data: any): void {
    console.log('🔧 Tool execution:', data)
  }

  getServerStats(): any {
    return {
      toolsRegistered: this.config.tools.length,
      resourcesRegistered: this.config.resources.length,
      promptsRegistered: this.config.prompts.length,
      handlersRegistered: {
        tools: this.toolHandlers.size,
        resources: this.resourceHandlers.size,
        prompts: this.promptHandlers.size
      }
    }
  }

  getServerUptime(): number {
    // Return uptime in milliseconds since server started
    // This is a simple implementation - could be enhanced with actual start time tracking
    return this.serverInstance?.isRunning ? Date.now() : 0
  }

  updateConfig(newConfig: McpConfig): void {
    this.config = { ...this.config, ...newConfig }
  }

  async unsubscribeFromResource(uri: string): Promise<ActionResult> {
    // TODO: Implement resource unsubscription logic
    return {
      success: true,
      result: { message: `Unsubscribed from resource: ${uri}`, uri }
    }
  }

  async searchResources(query: string, options?: { type?: string; limit?: number }): Promise<any[]> {
    // TODO: Implement resource search logic
    return []
  }

  getResourceTemplates(): any[] {
    // TODO: Implement resource templates logic
    return []
  }

  validateResourceUri(uri: string): { valid: boolean; error?: string; errors?: string[]; warnings?: string[]; suggestions?: string[]; parsedUri?: any } {
    // TODO: Implement URI validation logic
    try {
      const parsedUri = new URL(uri)
      return { 
        valid: true, 
        errors: [],
        warnings: [],
        suggestions: [],
        parsedUri 
      }
    } catch {
      return { 
        valid: false, 
        error: 'Invalid URI format',
        errors: ['Invalid URI format'],
        warnings: [],
        suggestions: [],
        parsedUri: null 
      }
    }
  }

  // Resource management methods
  async readResource(uri: string): Promise<any> {
    // TODO: Implement resource reading logic
    return {
      content: '',
      mimeType: 'text/plain',
      encoding: 'utf-8',
      size: 0,
      metadata: {}
    }
  }

  getAvailableResources(): any[] {
    return this.config.resources || []
  }

  getResourceAccessHistory(uri: string): any[] {
    // TODO: Implement resource access history tracking
    return []
  }

  async subscribeToResource(uri: string): Promise<any> {
    // TODO: Implement resource subscription logic
    return {
      success: true,
      subscription: { uri, active: true }
    }
  }

  get actions(): Record<string, ExtensionAction> {
    // Collect actions from all skills
    const skillActions: Record<string, ExtensionAction> = {}
    for (const skill of this.skills) {
      const actions = skill.getActions()
      Object.assign(skillActions, actions)
    }

    // Add legacy actions for backward compatibility
    const legacyActions = {
      startMcpServer: {
        name: 'startMcpServer',
        description: 'Start the MCP server',
        parameters: {},
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          try {
            if (this.serverInstance && !this.serverInstance.isRunning) {
              await this.serverInstance.server.connect(this.serverInstance.transport)
              this.serverInstance.isRunning = true
              return { success: true, result: 'MCP server started' }
            }
            return { success: true, result: 'MCP server already running' }
          } catch (error) {
            return { success: false, error: `Failed to start MCP server: ${error}` }
          }
        }
      },
      getMcpStatus: {
        name: 'getMcpStatus',
        description: 'Get MCP server status',
        parameters: {},
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return {
            success: true,
            result: {
              enabled: this.config.enabled,
              running: this.serverInstance?.isRunning || false,
              serverName: this.config.serverName,
              toolsCount: this.config.tools.length,
              resourcesCount: this.config.resources.length,
              promptsCount: this.config.prompts.length
            }
          }
        }
      }
    }

    return { ...skillActions, ...legacyActions }
  }

  get events(): Record<string, ExtensionEventHandler> {
    return {
      mcpServerStarted: {
        event: 'mcp.server.started',
        description: 'Triggered when MCP server starts',
        handler: async (agent: Agent, event: any) => {
          console.log('🔌 MCP Server started event received')
        }
      },
      mcpToolCalled: {
        event: 'mcp.tool.called',
        description: 'Triggered when an MCP tool is called',
        handler: async (agent: Agent, event: any) => {
          console.log(`🔧 MCP Tool called: ${event.data.toolName}`)
        }
      }
    }
  }
}

export default McpExtension