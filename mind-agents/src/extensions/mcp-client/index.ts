/**
 * MCP Client Extension for SYMindX
 * 
 * Provides dynamic tool discovery and execution capabilities through MCP servers.
 * This extension allows agents to connect to external MCP servers and use their tools,
 * resources, and prompts.
 */

import { ExtensionConfig, Extension, ExtensionMetadata } from '../types.js'
import { Agent } from '../../types/agent.js'
import { runtimeLogger } from '../../utils/logger.js'
import { MCPClientManager } from './mcp-client-manager.js'
import { MCPServerConfig, MCPTool, MCPResource, MCPPrompt } from './types.js'

export interface MCPClientExtensionConfig extends ExtensionConfig {
  enabled: boolean
  servers: MCPServerConfig[]
  globalTimeout?: number
  maxRetries?: number
  enableAutoReconnect?: boolean
  aiSDKIntegration?: boolean
}

export class MCPClientExtension implements Extension {
  public readonly metadata: ExtensionMetadata = {
    name: 'mcp-client',
    version: '1.0.0',
    description: 'MCP Client Extension - Connect to MCP servers and access their tools',
    author: 'SYMindX',
    dependencies: ['@modelcontextprotocol/sdk', 'ai', 'zod'],
    capabilities: [
      'tool_discovery',
      'tool_execution',
      'resource_access',
      'prompt_templates',
      'server_management'
    ]
  }

  private config: MCPClientExtensionConfig
  private mcpManager: MCPClientManager
  private agent?: Agent

  constructor(config: MCPClientExtensionConfig) {
    this.config = {
      enabled: true,
      servers: [],
      globalTimeout: 30000,
      maxRetries: 3,
      enableAutoReconnect: true,
      aiSDKIntegration: true,
      ...config
    }

    this.mcpManager = new MCPClientManager({
      globalTimeout: this.config.globalTimeout!,
      maxRetries: this.config.maxRetries!,
      enableAutoReconnect: this.config.enableAutoReconnect!
    })

    runtimeLogger.info('🔌 MCP Client Extension initialized')
  }

  async initialize(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ MCP Client Extension is disabled')
      return
    }

    this.agent = agent
    
    try {
      // Initialize the MCP manager
      await this.mcpManager.initialize()

      // Connect to configured servers
      for (const serverConfig of this.config.servers) {
        try {
          await this.mcpManager.addServer(serverConfig)
          runtimeLogger.info(`✅ Connected to MCP server: ${serverConfig.name}`)
        } catch (error) {
          runtimeLogger.error(`❌ Failed to connect to MCP server ${serverConfig.name}:`, error)
        }
      }

      // Expose MCP tools to the agent if AI SDK integration is enabled
      if (this.config.aiSDKIntegration) {
        await this.integrateWithAISDK()
      }

      runtimeLogger.info('🔌 MCP Client Extension initialized successfully')
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize MCP Client Extension:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.mcpManager.disconnectAll()
      runtimeLogger.info('🔌 MCP Client Extension cleaned up')
    } catch (error) {
      runtimeLogger.error('❌ Error during MCP Client Extension cleanup:', error)
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Add a new MCP server
   */
  async addServer(serverConfig: MCPServerConfig): Promise<void> {
    await this.mcpManager.addServer(serverConfig)
    this.config.servers.push(serverConfig)
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverName: string): Promise<void> {
    await this.mcpManager.disconnectServer(serverName)
    this.config.servers = this.config.servers.filter(s => s.name !== serverName)
  }

  /**
   * Get all available tools from connected MCP servers
   */
  getAvailableTools(): Map<string, MCPTool> {
    return this.mcpManager.getAvailableTools()
  }

  /**
   * Get all available resources from connected MCP servers
   */
  getAvailableResources(): Map<string, MCPResource> {
    return this.mcpManager.getAvailableResources()
  }

  /**
   * Get all available prompts from connected MCP servers
   */
  getAvailablePrompts(): Map<string, MCPPrompt> {
    return this.mcpManager.getAvailablePrompts()
  }

  /**
   * Execute a tool from an MCP server
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    return await this.mcpManager.executeTool(toolName, args)
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(resourceUri: string): Promise<any> {
    return await this.mcpManager.readResource(resourceUri)
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(promptName: string, args?: Record<string, any>): Promise<string> {
    return await this.mcpManager.getPrompt(promptName, args)
  }

  /**
   * Get status of all connected servers
   */
  getServerStatus(): Array<{
    name: string
    connected: boolean
    toolCount: number
    resourceCount: number
    promptCount: number
  }> {
    const connectedServers = this.mcpManager.getConnectedServers()
    const tools = this.mcpManager.getAvailableTools()
    const resources = this.mcpManager.getAvailableResources()
    const prompts = this.mcpManager.getAvailablePrompts()

    return this.config.servers.map(server => {
      const connected = connectedServers.includes(server.name)
      const toolCount = Array.from(tools.keys()).filter(key => key.startsWith(`${server.name}:`)).length
      const resourceCount = Array.from(resources.keys()).filter(key => key.startsWith(`${server.name}:`)).length
      const promptCount = Array.from(prompts.keys()).filter(key => key.startsWith(`${server.name}:`)).length

      return {
        name: server.name,
        connected,
        toolCount,
        resourceCount,
        promptCount
      }
    })
  }

  /**
   * Integrate MCP tools with AI SDK for automatic tool calling
   */
  private async integrateWithAISDK(): Promise<void> {
    if (!this.agent) return

    try {
      const aiSDKTools = this.mcpManager.getAISDKTools()
      
      // Add MCP tools to the agent's available tools
      if (this.agent.tools) {
        Object.assign(this.agent.tools, aiSDKTools)
      } else {
        this.agent.tools = aiSDKTools
      }

      runtimeLogger.info(`🔧 Integrated ${Object.keys(aiSDKTools).length} MCP tools with AI SDK`)
    } catch (error) {
      runtimeLogger.error('❌ Failed to integrate MCP tools with AI SDK:', error)
    }
  }

  /**
   * Get extension configuration
   */
  getConfig(): MCPClientExtensionConfig {
    return { ...this.config }
  }

  /**
   * Update extension configuration
   */
  async updateConfig(updates: Partial<MCPClientExtensionConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    
    // Re-initialize if needed
    if (this.agent && updates.enabled !== undefined) {
      if (updates.enabled && !this.config.enabled) {
        await this.initialize(this.agent)
      } else if (!updates.enabled && this.config.enabled) {
        await this.cleanup()
      }
    }
  }
}

// Factory function for creating MCP Client Extension
export function createMCPClientExtension(config: MCPClientExtensionConfig): MCPClientExtension {
  return new MCPClientExtension(config)
}

export default MCPClientExtension