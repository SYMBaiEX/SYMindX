/**
 * MCP Server Management Skill
 * 
 * Handles MCP server lifecycle, configuration, and management operations.
 */

import { Agent, ExtensionAction, ActionCategory, ActionResult, ActionResultType } from '../../../types/agent.js'
import { GenericData } from '../../../types/common.js'
import { McpExtension } from '../index.js'

export class ServerManagementSkill {
  private extension: McpExtension

  constructor(extension: McpExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      start_mcp_server: {
        name: 'start_mcp_server',
        description: 'Start the MCP server with specified configuration',
        category: ActionCategory.SYSTEM,
        parameters: {
          config: {
            type: 'object',
            description: 'Server configuration options',
            required: false
          }
        },
        execute: this.startServer.bind(this)
      },
      stop_mcp_server: {
        name: 'stop_mcp_server',
        description: 'Stop the running MCP server',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: this.stopServer.bind(this)
      },
      restart_mcp_server: {
        name: 'restart_mcp_server',
        description: 'Restart the MCP server',
        category: ActionCategory.SYSTEM,
        parameters: {
          config: {
            type: 'object',
            description: 'Optional new configuration',
            required: false
          }
        },
        execute: this.restartServer.bind(this)
      },
      get_server_status: {
        name: 'get_server_status',
        description: 'Get current MCP server status and information',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: this.getServerStatus.bind(this)
      },
      update_server_config: {
        name: 'update_server_config',
        description: 'Update MCP server configuration',
        category: ActionCategory.SYSTEM,
        parameters: {
          config: {
            type: 'object',
            description: 'New configuration settings',
            required: true
          }
        },
        execute: this.updateServerConfig.bind(this)
      },
      list_server_capabilities: {
        name: 'list_server_capabilities',
        description: 'List all available server capabilities',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: this.listServerCapabilities.bind(this)
      },
      get_server_info: {
        name: 'get_server_info',
        description: 'Get detailed server information and metadata',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: this.getServerInfo.bind(this)
      }
    }
  }

  /**
   * Start the MCP server
   */
  private async startServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const config = params.config || this.extension.config
      
      if (this.extension.isServerRunning()) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'MCP server is already running'
        }
      }

      await this.extension.startServer(config)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          message: 'MCP server started successfully',
          port: config.port,
          transport: config.transport,
          capabilities: this.extension.getServerCapabilities()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to start MCP server: ${error}`
      }
    }
  }

  /**
   * Stop the MCP server
   */
  private async stopServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (!this.extension.isServerRunning()) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'MCP server is not running'
        }
      }

      await this.extension.stopServer()
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          message: 'MCP server stopped successfully'
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stop MCP server: ${error}`
      }
    }
  }

  /**
   * Restart the MCP server
   */
  private async restartServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const config = params.config || this.extension.config
      
      if (this.extension.isServerRunning()) {
        await this.extension.stopServer()
      }
      
      await this.extension.startServer(config)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          message: 'MCP server restarted successfully',
          port: config.port,
          transport: config.transport,
          capabilities: this.extension.getServerCapabilities()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to restart MCP server: ${error}`
      }
    }
  }

  /**
   * Get server status
   */
  private async getServerStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const isRunning = this.extension.isServerRunning()
      const config = this.extension.config
      const uptime = this.extension.getServerUptime()
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          running: isRunning,
          uptime,
          config: {
            port: config.settings.port,
            transport: config.settings.transport,
            name: config.settings.serverName,
            version: config.settings.serverVersion
          },
          capabilities: this.extension.getServerCapabilities(),
          stats: this.extension.getServerStats()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get server status: ${error}`
      }
    }
  }

  /**
   * Update server configuration
   */
  private async updateServerConfig(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const newConfig = params.config
      
      if (!newConfig) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Configuration is required'
        }
      }

      const wasRunning = this.extension.isServerRunning()
      
      if (wasRunning) {
        await this.extension.stopServer()
      }
      
      this.extension.updateConfig(newConfig)
      
      if (wasRunning) {
        await this.extension.startServer(newConfig)
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          message: 'Server configuration updated successfully',
          config: { ...this.extension.config } as any,
          restarted: wasRunning
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to update server configuration: ${error}`
      }
    }
  }

  /**
   * List server capabilities
   */
  private async listServerCapabilities(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const capabilities = this.extension.getServerCapabilities()
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          capabilities,
          tools: capabilities.tools || [],
          resources: capabilities.resources || [],
          prompts: capabilities.prompts || []
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to list server capabilities: ${error}`
      }
    }
  }

  /**
   * Get detailed server information
   */
  private async getServerInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const config = this.extension.config
      const capabilities = this.extension.getServerCapabilities()
      const stats = this.extension.getServerStats()
      const uptime = this.extension.getServerUptime()
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          server: {
            name: config.settings.serverName,
            version: config.settings.serverVersion,
            description: config.settings.description || 'MCP Server',
            running: this.extension.isServerRunning(),
            uptime,
            transport: config.settings.transport || 'stdio',
            port: config.settings.port || 0
          },
          capabilities: {
            tools: capabilities.tools?.length || 0,
            resources: capabilities.resources?.length || 0,
            prompts: capabilities.prompts?.length || 0,
            experimental: capabilities.experimental || {}
          },
          statistics: {
            totalRequests: stats.totalRequests || 0,
            activeConnections: stats.activeConnections || 0,
            errorCount: stats.errorCount || 0,
            lastActivity: stats.lastActivity
          },
          health: {
            status: this.extension.isServerRunning() ? 'healthy' : 'stopped',
            checks: {
              server: this.extension.isServerRunning(),
              transport: !!config.transport,
              capabilities: Object.keys(capabilities).length > 0
            }
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get server info: ${error}`
      }
    }
  }
}