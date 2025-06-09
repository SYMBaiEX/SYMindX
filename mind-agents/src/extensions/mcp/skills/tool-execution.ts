/**
 * MCP Tool Execution Skill
 * 
 * Handles execution of MCP tools and tool management operations.
 */

import { Agent, ExtensionAction, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { McpExtension } from '../index.js'

export class ToolExecutionSkill {
  private extension: McpExtension

  constructor(extension: McpExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      execute_mcp_tool: {
        name: 'execute_mcp_tool',
        description: 'Execute a specific MCP tool with parameters',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to execute',
            required: true
          },
          parameters: {
            type: 'object',
            description: 'Parameters to pass to the tool',
            required: false
          }
        },
        execute: this.executeTool.bind(this)
      },
      list_available_tools: {
        name: 'list_available_tools',
        description: 'List all available MCP tools',
        category: ActionCategory.SYSTEM,
        parameters: {
          category: {
            type: 'string',
            description: 'Filter tools by category',
            required: false
          }
        },
        execute: this.listAvailableTools.bind(this)
      },
      get_tool_info: {
        name: 'get_tool_info',
        description: 'Get detailed information about a specific tool',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to get info for',
            required: true
          }
        },
        execute: this.getToolInfo.bind(this)
      },
      validate_tool_parameters: {
        name: 'validate_tool_parameters',
        description: 'Validate parameters for a tool before execution',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolName: {
            type: 'string',
            description: 'Name of the tool',
            required: true
          },
          parameters: {
            type: 'object',
            description: 'Parameters to validate',
            required: true
          }
        },
        execute: this.validateToolParameters.bind(this)
      },
      get_tool_execution_history: {
        name: 'get_tool_execution_history',
        description: 'Get execution history for tools',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolName: {
            type: 'string',
            description: 'Filter by specific tool name',
            required: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records to return',
            required: false
          }
        },
        execute: this.getToolExecutionHistory.bind(this)
      },
      register_custom_tool: {
        name: 'register_custom_tool',
        description: 'Register a custom tool with the MCP server',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolDefinition: {
            type: 'object',
            description: 'Tool definition including name, description, and schema',
            required: true
          }
        },
        execute: this.registerCustomTool.bind(this)
      },
      unregister_tool: {
        name: 'unregister_tool',
        description: 'Unregister a tool from the MCP server',
        category: ActionCategory.SYSTEM,
        parameters: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to unregister',
            required: true
          }
        },
        execute: this.unregisterTool.bind(this)
      }
    }
  }

  /**
   * Execute a specific MCP tool
   */
  private async executeTool(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolName, parameters = {} } = params
      
      if (!toolName) {
        return {
          success: false,
          error: 'Tool name is required',
          type: ActionResultType.FAILURE
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running',
          type: ActionResultType.FAILURE
        }
      }

      // Check if tool exists
      const availableTools = this.extension.getAvailableTools()
      const tool = availableTools.find(t => t.name === toolName)
      
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found. Available tools: ${availableTools.map(t => t.name).join(', ')}`,
          type: ActionResultType.FAILURE
        }
      }

      // Validate parameters
      const validation = this.extension.validateToolParameters(toolName, parameters)
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid parameters: ${validation.errors?.join(', ')}`,
          type: ActionResultType.FAILURE
        }
      }

      // Execute the tool
      const startTime = Date.now()
      const result = await this.extension.executeTool(toolName, parameters)
      const executionTime = Date.now() - startTime

      // Log execution
      this.extension.logToolExecution({
        toolName,
        parameters,
        result,
        executionTime,
        timestamp: new Date(),
        success: result.success
      })

      return {
        success: true,
        result: {
          toolName,
          output: result.result,
          executionTime,
          metadata: {
            timestamp: new Date().toISOString(),
            parametersUsed: parameters
          }
        },
        type: ActionResultType.SUCCESS
      }
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error}`,
        type: ActionResultType.FAILURE
      }
    }
  }

  /**
   * List all available MCP tools
   */
  private async listAvailableTools(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running',
          type: ActionResultType.FAILURE
        }
      }

      const tools = this.extension.getAvailableTools()
      const { category } = params
      
      let filteredTools = tools
      if (category) {
        filteredTools = tools.filter((tool: any) => 
          tool.category === category || 
          tool.tags?.includes(category)
        )
      }

      return {
        success: true,
        result: {
          tools: filteredTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            category: tool.category || 'general',
            parameters: tool.inputSchema?.properties || {},
            required: tool.inputSchema?.required || [],
            tags: tool.tags || []
          })),
          total: filteredTools.length,
          categories: [...new Set(tools.map(t => t.category || 'general'))]
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list tools: ${error}`
      }
    }
  }

  /**
   * Get detailed information about a specific tool
   */
  private async getToolInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolName } = params
      
      if (!toolName) {
        return {
          success: false,
          error: 'Tool name is required',
          type: ActionResultType.FAILURE
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running',
          type: ActionResultType.FAILURE
        }
      }

      const tools = this.extension.getAvailableTools()
      const tool = tools.find(t => t.name === toolName)
      
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`
        }
      }

      // Get execution statistics
      const executionHistory = this.extension.getToolExecutionHistory(toolName)
      const stats = {
        totalExecutions: executionHistory.length,
        successRate: executionHistory.length > 0 
          ? (executionHistory.filter(e => e.success).length / executionHistory.length) * 100 
          : 0,
        averageExecutionTime: executionHistory.length > 0
          ? executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / executionHistory.length
          : 0,
        lastExecution: executionHistory.length > 0 
          ? executionHistory[executionHistory.length - 1].timestamp
          : null
      }

      return {
        success: true,
        result: {
          name: tool.name,
          description: tool.description,
          category: tool.category || 'general',
          version: tool.version,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          examples: tool.examples || [],
          tags: tool.tags || [],
          statistics: stats,
          metadata: tool.metadata || {}
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get tool info: ${error}`
      }
    }
  }

  /**
   * Validate tool parameters
   */
  private async validateToolParameters(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolName, parameters } = params
      
      if (!toolName || !parameters) {
        return {
          success: false,
          error: 'Tool name and parameters are required'
        }
      }

      const validation = this.extension.validateToolParameters(toolName, parameters)
      
      return {
        success: true,
        result: {
          valid: validation.valid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          suggestions: validation.suggestions || []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Parameter validation failed: ${error}`
      }
    }
  }

  /**
   * Get tool execution history
   */
  private async getToolExecutionHistory(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolName, limit = 50 } = params
      
      let history = this.extension.getToolExecutionHistory(toolName)
      
      // Apply limit
      if (limit > 0) {
        history = history.slice(-limit)
      }

      return {
        success: true,
        result: {
          executions: history.map(execution => ({
            toolName: execution.toolName,
            timestamp: execution.timestamp.toISOString(),
            success: execution.success,
            executionTime: execution.executionTime,
            parameters: execution.parameters,
            result: execution.result,
            error: execution.error
          })),
          total: history.length,
          summary: {
            totalExecutions: history.length,
            successfulExecutions: history.filter(e => e.success).length,
            failedExecutions: history.filter(e => !e.success).length,
            averageExecutionTime: history.length > 0
              ? history.reduce((sum, e) => sum + e.executionTime, 0) / history.length
              : 0
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get execution history: ${error}`
      }
    }
  }

  /**
   * Register a custom tool
   */
  private async registerCustomTool(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolDefinition } = params
      
      if (!toolDefinition) {
        return {
          success: false,
          error: 'Tool definition is required'
        }
      }

      if (!toolDefinition.name || !toolDefinition.description) {
        return {
          success: false,
          error: 'Tool name and description are required'
        }
      }

      const result = await this.extension.registerCustomTool(toolDefinition)
      
      return {
        success: true,
        result: {
          message: `Tool '${toolDefinition.name}' registered successfully`,
          toolName: toolDefinition.name,
          registered: result
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to register tool: ${error}`
      }
    }
  }

  /**
   * Unregister a tool
   */
  private async unregisterTool(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { toolName } = params
      
      if (!toolName) {
        return {
          success: false,
          error: 'Tool name is required',
          type: ActionResultType.FAILURE
        }
      }

      const result = await this.extension.unregisterTool(toolName)
      
      return {
        success: true,
        result: {
          message: `Tool '${toolName}' unregistered successfully`,
          toolName,
          unregistered: result
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to unregister tool: ${error}`
      }
    }
  }
}