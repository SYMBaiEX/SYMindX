/**
 * MCP Prompt Management Skill
 * 
 * Handles MCP prompt operations, templates, and management.
 */

import { Agent, ExtensionAction, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { ActionParameters } from '../../../types/common.js'
import { createSuccessResult, createFailureResult } from '../../../utils/action-helpers.js'
import { createCognitiveAction, createSystemAction } from '../../../utils/extension-helpers.js'
import { McpExtension } from '../index.js'

export class PromptManagementSkill {
  private extension: McpExtension

  constructor(extension: McpExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      list_prompts: createCognitiveAction(
        'list_prompts',
        'List all available MCP prompts',
        {
          category: '',
          tag: ''
        },
        this.listPrompts.bind(this)
      ),
      get_prompt: createCognitiveAction(
        'get_prompt',
        'Get a specific prompt with optional parameter substitution',
        {
          name: '',
          arguments: {}
        },
        this.getPrompt.bind(this)
      ),
      get_prompt_info: createCognitiveAction(
        'get_prompt_info',
        'Get detailed information about a prompt',
        {
          name: ''
        },
        this.getPromptInfo.bind(this)
      ),
      execute_prompt: createCognitiveAction(
        'execute_prompt',
        'Execute a prompt and get the result',
        {
          name: '',
          arguments: {},
          context: {}
        },
        this.executePrompt.bind(this)
      ),
      validate_prompt_arguments: createCognitiveAction(
        'validate_prompt_arguments',
        'Validate arguments for a prompt',
        {
          name: '',
          arguments: {}
        },
        this.validatePromptArguments.bind(this)
      ),
      create_prompt_template: createCognitiveAction(
        'create_prompt_template',
        'Create a new prompt template',
        {
          template: {}
        },
        this.createPromptTemplate.bind(this)
      ),
      update_prompt_template: createCognitiveAction(
        'update_prompt_template',
        'Update an existing prompt template',
        {
          name: '',
          template: {}
        },
        this.updatePromptTemplate.bind(this)
      ),
      delete_prompt_template: createCognitiveAction(
        'delete_prompt_template',
        'Delete a prompt template',
        {
          name: ''
        },
        this.deletePromptTemplate.bind(this)
      ),
      get_prompt_execution_history: createCognitiveAction(
        'get_prompt_execution_history',
        'Get execution history for prompts',
        {
          name: {
            type: 'string',
            description: 'Filter by specific prompt name',
            required: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records to return',
            required: false
          }
        },
        this.getPromptExecutionHistory.bind(this)
      )
    }
  }

  /**
   * List all available prompts
   */
  private async listPrompts(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (!this.extension.isServerRunning()) {
        return createFailureResult('MCP server is not running')
      }

      const { category, tag } = params
      let prompts = this.extension.getAvailablePrompts()

      // Apply filters
      if (category) {
        prompts = prompts.filter(prompt => prompt.category === category)
      }

      if (tag) {
        prompts = prompts.filter(prompt => prompt.tags?.includes(tag))
      }

      return createSuccessResult({
        prompts: prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          category: prompt.category || 'general',
          tags: prompt.tags || [],
          arguments: prompt.arguments || [],
          version: prompt.version,
          author: prompt.author,
          lastModified: prompt.lastModified
        })),
        total: prompts.length,
        categories: [...new Set(prompts.map(p => p.category || 'general'))],
        tags: [...new Set(prompts.flatMap(p => p.tags || []))],
        filters: { category, tag }
      })
    } catch (error) {
      return createFailureResult(`Failed to list prompts: ${error}`)
    }
  }

  /**
   * Get a specific prompt
   */
  private async getPrompt(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name, arguments: promptArgs = {} } = params
      
      if (!name) {
        return {
          success: false,
          error: 'Prompt name is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return createFailureResult('MCP server is not running')
      }

      const prompts = this.extension.getAvailablePrompts()
      const prompt = prompts.find(p => p.name === name)
      
      if (!prompt) {
        return {
          success: false,
          error: `Prompt '${name}' not found`
        }
      }

      // Validate arguments if provided
      if (Object.keys(promptArgs).length > 0) {
        const validation = this.extension.validatePromptArguments(name, promptArgs)
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid arguments: ${validation.errors?.join(', ')}`
          }
        }
      }

      // Get the prompt with substituted parameters
      const result = await this.extension.getPrompt(name, promptArgs)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name: prompt.name,
          description: prompt.description,
          messages: result.messages,
          arguments: promptArgs,
          metadata: {
            category: prompt.category,
            tags: prompt.tags,
            version: prompt.version,
            timestamp: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get prompt: ${error}`
      }
    }
  }

  /**
   * Get detailed information about a prompt
   */
  private async getPromptInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name } = params
      
      if (!name) {
        return {
          success: false,
          error: 'Prompt name is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return createFailureResult('MCP server is not running')
      }

      const prompts = this.extension.getAvailablePrompts()
      const prompt = prompts.find(p => p.name === name)
      
      if (!prompt) {
        return {
          success: false,
          error: `Prompt '${name}' not found`
        }
      }

      // Get execution statistics
      const executionHistory = this.extension.getPromptExecutionHistory(name)
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
        type: ActionResultType.SUCCESS,
        result: {
          name: prompt.name,
          description: prompt.description,
          category: prompt.category || 'general',
          tags: prompt.tags || [],
          version: prompt.version,
          author: prompt.author,
          created: prompt.created,
          lastModified: prompt.lastModified,
          arguments: prompt.arguments || [],
          examples: prompt.examples || [],
          template: prompt.template,
          statistics: stats,
          metadata: prompt.metadata || {}
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get prompt info: ${error}`
      }
    }
  }

  /**
   * Execute a prompt
   */
  private async executePrompt(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name, arguments: promptArgs = {}, context = {} } = params
      
      if (!name) {
        return {
          success: false,
          error: 'Prompt name is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return createFailureResult('MCP server is not running')
      }

      // Validate arguments
      const validation = this.extension.validatePromptArguments(name, promptArgs)
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid arguments: ${validation.errors?.join(', ')}`
        }
      }

      const startTime = Date.now()
      const result = await this.extension.executePrompt(name, promptArgs, context)
      const executionTime = Date.now() - startTime

      // Log execution
      this.extension.logPromptExecution({
        promptName: name,
        arguments: promptArgs,
        context,
        result,
        executionTime,
        timestamp: new Date(),
        success: result.success
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          promptName: name,
          output: result.result,
          messages: result.messages,
          executionTime,
          metadata: {
            timestamp: new Date().toISOString(),
            argumentsUsed: promptArgs,
            context
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Prompt execution failed: ${error}`
      }
    }
  }

  /**
   * Validate prompt arguments
   */
  private async validatePromptArguments(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name, arguments: promptArgs } = params
      
      if (!name || !promptArgs) {
        return {
          success: false,
          error: 'Prompt name and arguments are required'
        }
      }

      const validation = this.extension.validatePromptArguments(name, promptArgs)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
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
        error: `Argument validation failed: ${error}`
      }
    }
  }

  /**
   * Create a new prompt template
   */
  private async createPromptTemplate(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { template } = params
      
      if (!template) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Prompt template is required'
        }
      }

      if (!template.name || !template.description) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Template name and description are required'
        }
      }

      const result = await this.extension.createPromptTemplate(template)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Prompt template '${template.name}' created successfully`,
          name: template.name,
          created: result
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create prompt template: ${error}`
      }
    }
  }

  /**
   * Update an existing prompt template
   */
  private async updatePromptTemplate(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name, template } = params
      
      if (!name || !template) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Prompt name and template are required'
        }
      }

      const result = await this.extension.updatePromptTemplate(name, template)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Prompt template '${name}' updated successfully`,
          name,
          updated: result
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update prompt template: ${error}`
      }
    }
  }

  /**
   * Delete a prompt template
   */
  private async deletePromptTemplate(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name } = params
      
      if (!name) {
        return {
          success: false,
          error: 'Prompt name is required'
        }
      }

      const result = await this.extension.deletePromptTemplate(name)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Prompt template '${name}' deleted successfully`,
          name,
          deleted: result
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete prompt template: ${error}`
      }
    }
  }

  /**
   * Get prompt execution history
   */
  private async getPromptExecutionHistory(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { name, limit = 50 } = params
      
      let history = this.extension.getPromptExecutionHistory(name)
      
      // Apply limit
      if (limit > 0) {
        history = history.slice(-limit)
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          executions: history.map(execution => ({
            promptName: execution.promptName,
            timestamp: execution.timestamp.toISOString(),
            success: execution.success,
            executionTime: execution.executionTime,
            arguments: execution.arguments,
            context: execution.context,
            result: execution.result,
            error: execution.error
          })),
          total: history.length,
          summary: {
            totalExecutions: history.length,
            successfulExecutions: history.filter((e: any) => e.success).length,
            failedExecutions: history.filter((e: any) => !e.success).length,
            averageExecutionTime: history.length > 0
              ? history.reduce((sum: any, e: any) => sum + e.executionTime, 0) / history.length
              : 0
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get execution history: ${error}`
      }
    }
  }
}