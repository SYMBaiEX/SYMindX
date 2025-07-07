/**
 * MCP Client Extension for SYMindX
 * 
 * Provides dynamic tool discovery and execution capabilities through MCP servers.
 * This extension allows agents to connect to external MCP servers and use their tools,
 * resources, and prompts.
 */

import { ExtensionConfig, Extension, ExtensionMetadata, Agent } from '../../types/index'
import { runtimeLogger } from '../../utils/logger'
import { MCPClientManager } from './mcp-client-manager'
import { MCPServerConfig } from './types'

export interface MCPClientExtensionConfig extends ExtensionConfig {
  enabled: boolean
  mcpServers: Record<string, MCPServerConfig>
  globalTimeout?: number
  maxRetries?: number
  enableAutoReconnect?: boolean
  aiSDKIntegration?: boolean
}

export class MCPClientExtension implements Extension {
  public readonly id = 'mcp-client'
  public readonly name = 'MCP Client Extension'
  public readonly version = '1.0.0'
  public readonly type = 'MCP_CLIENT' as const
  public enabled = true
  public status = 'stopped'
  
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

  public config: MCPClientExtensionConfig
  public actions: Record<string, any> = {}
  public events: Record<string, any> = {}
  
  private mcpManager: MCPClientManager
  private agent?: Agent

  constructor(config: MCPClientExtensionConfig) {
    this.config = {
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

  async init(): Promise<void> {
    // Initialize without agent for factory compatibility
    this.status = 'initializing'
  }
  
  async tick(agent: Agent): Promise<void> {
    // Periodic tick - could be used for tool discovery refresh
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
      for (const [serverName, serverConfig] of Object.entries(this.config.mcpServers)) {
        try {
          // Ensure the server has a name
          const configWithName = { ...serverConfig, name: serverName }
          
          // Add timeout wrapper for server connection
          const connectionPromise = this.mcpManager.addServer(configWithName)
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Server connection timeout')), 30000)
          })
          
          await Promise.race([connectionPromise, timeoutPromise])
          runtimeLogger.info(`✅ Connected to MCP server: ${serverName}`)
        } catch (error) {
          runtimeLogger.error(`❌ Failed to connect to MCP server ${serverName}:`, error)
          // Continue with other servers even if one fails
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
  async addServer(serverName: string, serverConfig: MCPServerConfig): Promise<void> {
    const configWithName = { ...serverConfig, name: serverName }
    await this.mcpManager.addServer(configWithName)
    this.config.mcpServers[serverName] = serverConfig
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverName: string): Promise<void> {
    await this.mcpManager.removeServer(serverName)
    delete this.config.mcpServers[serverName]
  }

  /**
   * Get all available tools from connected MCP servers
   */
  getAvailableTools(): Record<string, unknown> {
    return this.mcpManager.getAvailableTools()
  }


  /**
   * Get status of all connected servers
   */
  getServerStatus(): Array<{
    name: string
    connected: boolean
    toolCount: number
  }> {
    const connectedServers = this.mcpManager.getConnectedServers()
    const tools = this.mcpManager.getAvailableTools()

    return Object.entries(this.config.mcpServers).map(([serverName, server]) => {
      const connected = connectedServers.includes(serverName)
      const toolCount = Object.keys(tools).filter(key => key.startsWith(`${serverName}:`)).length

      return {
        name: serverName,
        connected,
        toolCount
      }
    })
  }

  /**
   * Integrate MCP tools with AI SDK for automatic tool calling
   */
  async integrateWithAISDK(): Promise<Record<string, unknown>> {
    try {
      const aiSDKTools = this.mcpManager.getAISDKTools()
      runtimeLogger.info(`🔧 Integrated ${Object.keys(aiSDKTools).length} MCP tools with AI SDK`)
      return aiSDKTools
    } catch (error) {
      runtimeLogger.error('❌ Failed to integrate MCP tools with AI SDK:', error)
      return {}
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