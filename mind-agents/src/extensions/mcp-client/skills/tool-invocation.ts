/**
 * MCP Client Tool Invocation Skill
 * 
 * Handles invocation of tools on remote MCP servers.
 */

import { Agent, ExtensionAction, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { McpClientExtension } from '../index.js'

export class ToolInvocationSkill {
  private extension: McpClientExtension

  constructor(extension: McpClientExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      invoke_tool: {
        name: 'invoke_tool',
        description: 'Invoke a tool on a remote MCP server',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to invoke tool on',
            required: true
          },
          toolName: {
            type: 'string',
            description: 'Name of the tool to invoke',
            required: true
          },
          arguments: {
            type: 'object',
            description: 'Arguments to pass to the tool',
            required: false
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
            required: false
          }
        },
        execute: this.invokeTool.bind(this)
      },
      list_tools: {
        name: 'list_tools',
        description: 'List available tools on servers',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of specific server (optional)',
            required: false
          },
          category: {
            type: 'string',
            description: 'Filter by tool category',
            required: false
          },
          search: {
            type: 'string',
            description: 'Search term for tool names/descriptions',
            required: false
          }
        },
        execute: this.listTools.bind(this)
      },
      get_tool_info: {
        name: 'get_tool_info',
        description: 'Get detailed information about a tool',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          toolName: {
            type: 'string',
            description: 'Name of the tool',
            required: true
          },
          includeSchema: {
            type: 'boolean',
            description: 'Include input schema details',
            required: false
          }
        },
        execute: this.getToolInfo.bind(this)
      },
      validate_tool_arguments: {
        name: 'validate_tool_arguments',
        description: 'Validate arguments for a tool',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          toolName: {
            type: 'string',
            description: 'Name of the tool',
            required: true
          },
          arguments: {
            type: 'object',
            description: 'Arguments to validate',
            required: true
          }
        },
        execute: this.validateToolArguments.bind(this)
      },
      batch_invoke_tools: {
        name: 'batch_invoke_tools',
        description: 'Invoke multiple tools in batch',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          invocations: {
            type: 'array',
            description: 'Array of tool invocations',
            required: true
          },
          parallel: {
            type: 'boolean',
            description: 'Execute in parallel',
            required: false
          },
          stopOnError: {
            type: 'boolean',
            description: 'Stop batch on first error',
            required: false
          }
        },
        execute: this.batchInvokeTools.bind(this)
      },
      get_invocation_history: {
        name: 'get_invocation_history',
        description: 'Get tool invocation history',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'Filter by server ID',
            required: false
          },
          toolName: {
            type: 'string',
            description: 'Filter by tool name',
            required: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records',
            required: false
          },
          since: {
            type: 'string',
            description: 'ISO date string to filter from',
            required: false
          }
        },
        execute: this.getInvocationHistory.bind(this)
      },
      cancel_invocation: {
        name: 'cancel_invocation',
        description: 'Cancel a running tool invocation',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          invocationId: {
            type: 'string',
            description: 'ID of the invocation to cancel',
            required: true
          }
        },
        execute: this.cancelInvocation.bind(this)
      },
      get_invocation_status: {
        name: 'get_invocation_status',
        description: 'Get status of a tool invocation',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          invocationId: {
            type: 'string',
            description: 'ID of the invocation',
            required: true
          }
        },
        execute: this.getInvocationStatus.bind(this)
      },
      create_tool_alias: {
        name: 'create_tool_alias',
        description: 'Create an alias for a tool',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          toolName: {
            type: 'string',
            description: 'Original tool name',
            required: true
          },
          alias: {
            type: 'string',
            description: 'Alias name',
            required: true
          },
          defaultArguments: {
            type: 'object',
            description: 'Default arguments for the alias',
            required: false
          }
        },
        execute: this.createToolAlias.bind(this)
      },
      remove_tool_alias: {
        name: 'remove_tool_alias',
        description: 'Remove a tool alias',
        category: ActionCategory.TOOL_EXECUTION,
        parameters: {
          alias: {
            type: 'string',
            description: 'Alias name to remove',
            required: true
          }
        },
        execute: this.removeToolAlias.bind(this)
      }
    }
  }

  /**
   * Invoke a tool on a remote MCP server
   */
  private async invokeTool(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, toolName, arguments: toolArgs = {}, timeout = 30000 } = params
      
      if (!serverId || !toolName) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and tool name are required'
        }
      }

      const result = await this.extension.invokeTool({
        serverId,
        toolName,
        arguments: toolArgs,
        timeout
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          invocationId: result.invocationId,
          toolName,
          serverId,
          arguments: toolArgs,
          result: result.result,
          metadata: {
            executionTime: result.executionTime,
            timestamp: result.timestamp?.toISOString(),
            serverVersion: result.serverVersion,
            toolVersion: result.toolVersion
          },
          status: 'completed'
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Tool invocation failed: ${error}`
      }
    }
  }

  /**
   * List available tools on servers
   */
  private async listTools(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, category, search } = params
      
      const tools = await this.extension.listTools({
        serverId,
        category,
        search
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            serverId: tool.serverId,
            serverName: tool.serverName,
            category: tool.category,
            inputSchema: {
              type: tool.inputSchema?.type,
              properties: Object.keys(tool.inputSchema?.properties || {}),
              required: tool.inputSchema?.required || []
            },
            outputSchema: tool.outputSchema ? {
              type: tool.outputSchema.type,
              properties: Object.keys(tool.outputSchema.properties || {})
            } : undefined,
            version: tool.version,
            deprecated: tool.deprecated,
            experimental: tool.experimental
          })),
          total: tools.length,
          servers: Array.from(new Set(tools.map(t => t.serverId))),
          categories: Array.from(new Set(tools.map(t => t.category).filter(Boolean))),
          filters: { serverId, category, search }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list tools: ${error}`
      }
    }
  }

  /**
   * Get detailed tool information
   */
  private async getToolInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, toolName, includeSchema = true } = params
      
      if (!serverId || !toolName) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and tool name are required'
        }
      }

      const toolInfo = await this.extension.getToolInfo(serverId, toolName, {
        includeSchema
      })
      
      if (!toolInfo) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: `Tool '${toolName}' not found on server '${serverId}'`
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name: toolInfo.name,
          description: toolInfo.description,
          serverId: toolInfo.serverId,
          serverName: toolInfo.serverName,
          category: toolInfo.category,
          version: toolInfo.version,
          deprecated: toolInfo.deprecated,
          experimental: toolInfo.experimental,
          inputSchema: includeSchema ? toolInfo.inputSchema : undefined,
          outputSchema: includeSchema ? toolInfo.outputSchema : undefined,
          examples: toolInfo.examples?.map(example => ({
            name: example.name,
            description: example.description,
            arguments: example.arguments,
            expectedOutput: example.expectedOutput
          })),
          documentation: toolInfo.documentation,
          tags: toolInfo.tags,
          metadata: toolInfo.metadata,
          usage: {
            totalInvocations: toolInfo.usage?.totalInvocations || 0,
            successRate: toolInfo.usage?.successRate || 0,
            averageExecutionTime: toolInfo.usage?.averageExecutionTime || 0,
            lastUsed: toolInfo.usage?.lastUsed?.toISOString()
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get tool info: ${error}`
      }
    }
  }

  /**
   * Validate tool arguments
   */
  private async validateToolArguments(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, toolName, arguments: toolArgs } = params
      
      if (!serverId || !toolName || !toolArgs) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID, tool name, and arguments are required'
        }
      }

      const validation = await this.extension.validateToolArguments({
        serverId,
        toolName,
        arguments: toolArgs
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          valid: validation.valid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          suggestions: validation.suggestions || [],
          missingRequired: validation.missingRequired || [],
          unexpectedProperties: validation.unexpectedProperties || [],
          typeErrors: validation.typeErrors || [],
          correctedArguments: validation.correctedArguments,
          toolName,
          serverId
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Argument validation failed: ${error}`
      }
    }
  }

  /**
   * Invoke multiple tools in batch
   */
  private async batchInvokeTools(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { invocations, parallel = false, stopOnError = false } = params
      
      if (!invocations || !Array.isArray(invocations)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Invocations array is required'
        }
      }

      const results = await this.extension.batchInvokeTools({
        invocations,
        parallel,
        stopOnError
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          batchId: results.batchId,
          results: results.results.map(result => ({
            invocationId: result.invocationId,
            toolName: result.toolName,
            serverId: result.serverId,
            success: result.success,
            result: result.result,
            error: result.error,
            executionTime: result.executionTime,
            timestamp: result.timestamp?.toISOString()
          })),
          summary: {
            total: results.results.length,
            successful: results.results.filter(r => r.success).length,
            failed: results.results.filter(r => !r.success).length,
            totalExecutionTime: results.totalExecutionTime,
            parallel,
            stopOnError,
            completed: results.completed
          },
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Batch invocation failed: ${error}`
      }
    }
  }

  /**
   * Get tool invocation history
   */
  private async getInvocationHistory(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, toolName, limit = 100, since } = params
      
      const history = await this.extension.getInvocationHistory({
        serverId,
        toolName,
        limit,
        since: since ? new Date(since) : undefined
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          invocations: history.invocations.map(inv => ({
            id: inv.id,
            toolName: inv.toolName,
            serverId: inv.serverId,
            serverName: inv.serverName,
            arguments: inv.arguments,
            result: inv.result,
            success: inv.success,
            error: inv.error,
            executionTime: inv.executionTime,
            timestamp: inv.timestamp?.toISOString(),
            userId: inv.userId,
            sessionId: inv.sessionId
          })),
          total: history.total,
          hasMore: history.hasMore,
          filters: { serverId, toolName, limit, since },
          statistics: {
            totalInvocations: history.statistics?.totalInvocations || 0,
            successfulInvocations: history.statistics?.successfulInvocations || 0,
            failedInvocations: history.statistics?.failedInvocations || 0,
            averageExecutionTime: history.statistics?.averageExecutionTime || 0,
            mostUsedTools: history.statistics?.mostUsedTools || [],
            mostActiveServers: history.statistics?.mostActiveServers || []
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get invocation history: ${error}`
      }
    }
  }

  /**
   * Cancel a running tool invocation
   */
  private async cancelInvocation(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { invocationId } = params
      
      if (!invocationId) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Invocation ID is required'
        }
      }

      const result = await this.extension.cancelInvocation(invocationId)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Invocation '${invocationId}' cancelled`,
          invocationId,
          cancelled: result.cancelled,
          reason: result.reason,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to cancel invocation: ${error}`
      }
    }
  }

  /**
   * Get invocation status
   */
  private async getInvocationStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { invocationId } = params
      
      if (!invocationId) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Invocation ID is required'
        }
      }

      const status = await this.extension.getInvocationStatus(invocationId)
      
      if (!status) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: `Invocation '${invocationId}' not found`
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          invocationId,
          status: status.status,
          toolName: status.toolName,
          serverId: status.serverId,
          progress: status.progress,
          result: status.result,
          error: status.error,
          startTime: status.startTime?.toISOString(),
          endTime: status.endTime?.toISOString(),
          executionTime: status.executionTime,
          metadata: status.metadata
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get invocation status: ${error}`
      }
    }
  }

  /**
   * Create a tool alias
   */
  private async createToolAlias(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, toolName, alias, defaultArguments = {} } = params
      
      if (!serverId || !toolName || !alias) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID, tool name, and alias are required'
        }
      }

      await this.extension.createToolAlias({
        serverId,
        toolName,
        alias,
        defaultArguments
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Alias '${alias}' created for tool '${toolName}' on server '${serverId}'`,
          alias,
          toolName,
          serverId,
          defaultArguments,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create tool alias: ${error}`
      }
    }
  }

  /**
   * Remove a tool alias
   */
  private async removeToolAlias(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { alias } = params
      
      if (!alias) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Alias name is required'
        }
      }

      await this.extension.removeToolAlias(alias)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Alias '${alias}' removed`,
          alias,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to remove tool alias: ${error}`
      }
    }
  }
}