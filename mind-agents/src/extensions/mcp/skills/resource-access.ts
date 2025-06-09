/**
 * MCP Resource Access Skill
 * 
 * Handles MCP resource management, access, and operations.
 */

import { Agent, ExtensionAction, ActionCategory, ActionResult } from '../../../types/agent.js'
import { McpExtension } from '../index.js'

export class ResourceAccessSkill {
  private extension: McpExtension

  constructor(extension: McpExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      list_resources: {
        name: 'list_resources',
        description: 'List all available MCP resources',
        category: ActionCategory.OBSERVATION,
        parameters: {
          type: {
            type: 'string',
            description: 'Filter resources by type',
            required: false
          },
          pattern: {
            type: 'string',
            description: 'Filter resources by URI pattern',
            required: false
          }
        },
        execute: this.listResources.bind(this)
      },
      read_resource: {
        name: 'read_resource',
        description: 'Read content from a specific MCP resource',
        category: ActionCategory.OBSERVATION,
        parameters: {
          uri: {
            type: 'string',
            description: 'URI of the resource to read',
            required: true
          }
        },
        execute: this.readResource.bind(this)
      },
      get_resource_info: {
        name: 'get_resource_info',
        description: 'Get detailed information about a resource',
        category: ActionCategory.OBSERVATION,
        parameters: {
          uri: {
            type: 'string',
            description: 'URI of the resource',
            required: true
          }
        },
        execute: this.getResourceInfo.bind(this)
      },
      subscribe_to_resource: {
        name: 'subscribe_to_resource',
        description: 'Subscribe to resource changes',
        category: ActionCategory.SYSTEM,
        parameters: {
          uri: {
            type: 'string',
            description: 'URI of the resource to subscribe to',
            required: true
          }
        },
        execute: this.subscribeToResource.bind(this)
      },
      unsubscribe_from_resource: {
        name: 'unsubscribe_from_resource',
        description: 'Unsubscribe from resource changes',
        category: ActionCategory.SYSTEM,
        parameters: {
          uri: {
            type: 'string',
            description: 'URI of the resource to unsubscribe from',
            required: true
          }
        },
        execute: this.unsubscribeFromResource.bind(this)
      },
      search_resources: {
        name: 'search_resources',
        description: 'Search for resources by content or metadata',
        category: ActionCategory.OBSERVATION,
        parameters: {
          query: {
            type: 'string',
            description: 'Search query',
            required: true
          },
          type: {
            type: 'string',
            description: 'Resource type filter',
            required: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            required: false
          }
        },
        execute: this.searchResources.bind(this)
      },
      get_resource_templates: {
        name: 'get_resource_templates',
        description: 'Get available resource templates',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: this.getResourceTemplates.bind(this)
      },
      validate_resource_uri: {
        name: 'validate_resource_uri',
        description: 'Validate a resource URI format',
        category: ActionCategory.SYSTEM,
        parameters: {
          uri: {
            type: 'string',
            description: 'URI to validate',
            required: true
          }
        },
        execute: this.validateResourceUri.bind(this)
      }
    }
  }

  /**
   * List all available resources
   */
  private async listResources(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const { type, pattern } = params
      let resources = this.extension.getAvailableResources()

      // Apply filters
      if (type) {
        resources = resources.filter(resource => resource.mimeType === type || resource.type === type)
      }

      if (pattern) {
        const regex = new RegExp(pattern, 'i')
        resources = resources.filter(resource => regex.test(resource.uri))
      }

      return {
        success: true,
        result: {
          resources: resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            type: resource.type,
            size: resource.size,
            lastModified: resource.lastModified,
            metadata: resource.metadata || {}
          })),
          total: resources.length,
          types: [...new Set(resources.map(r => r.mimeType || r.type))],
          filters: { type, pattern }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list resources: ${error}`
      }
    }
  }

  /**
   * Read content from a specific resource
   */
  private async readResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { uri } = params
      
      if (!uri) {
        return {
          success: false,
          error: 'Resource URI is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      // Validate URI
      const validation = this.extension.validateResourceUri(uri)
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid resource URI: ${validation.error}`
        }
      }

      const startTime = Date.now()
      const resource = await this.extension.readResource(uri)
      const readTime = Date.now() - startTime

      return {
        success: true,
        result: {
          uri,
          content: resource.content,
          mimeType: resource.mimeType,
          encoding: resource.encoding,
          size: resource.size,
          metadata: {
            readTime,
            timestamp: new Date().toISOString(),
            ...resource.metadata
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to read resource: ${error}`
      }
    }
  }

  /**
   * Get detailed information about a resource
   */
  private async getResourceInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { uri } = params
      
      if (!uri) {
        return {
          success: false,
          error: 'Resource URI is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const resources = this.extension.getAvailableResources()
      const resource = resources.find((r: any) => r.uri === uri)
      
      if (!resource) {
        return {
          success: false,
          error: `Resource not found: ${uri}`
        }
      }

      // Get access statistics
      const accessHistory = this.extension.getResourceAccessHistory(uri)
      const stats = {
        totalAccesses: accessHistory.length,
        lastAccessed: accessHistory.length > 0 
          ? accessHistory[accessHistory.length - 1].timestamp
          : null,
        averageReadTime: accessHistory.length > 0
          ? accessHistory.reduce((sum: number, a: any) => sum + (a.readTime || 0), 0) / accessHistory.length
          : 0
      }

      return {
        success: true,
        result: {
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          type: resource.type,
          size: resource.size,
          lastModified: resource.lastModified,
          created: resource.created,
          permissions: resource.permissions || [],
          metadata: resource.metadata || {},
          statistics: stats,
          capabilities: {
            readable: resource.readable !== false,
            subscribable: resource.subscribable === true,
            searchable: resource.searchable !== false
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get resource info: ${error}`
      }
    }
  }

  /**
   * Subscribe to resource changes
   */
  private async subscribeToResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { uri } = params
      
      if (!uri) {
        return {
          success: false,
          error: 'Resource URI is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const result = await this.extension.subscribeToResource(uri)
      
      return {
        success: true,
        result: {
          message: `Subscribed to resource: ${uri}`,
          uri,
          subscriptionId: result.subscriptionId,
          subscribed: result.success
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to subscribe to resource: ${error}`
      }
    }
  }

  /**
   * Unsubscribe from resource changes
   */
  private async unsubscribeFromResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { uri } = params
      
      if (!uri) {
        return {
          success: false,
          error: 'Resource URI is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const result = await this.extension.unsubscribeFromResource(uri)
      
      return {
        success: true,
        result: {
          message: `Unsubscribed from resource: ${uri}`,
          uri,
          unsubscribed: result.success
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to unsubscribe from resource: ${error}`
      }
    }
  }

  /**
   * Search for resources
   */
  private async searchResources(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { query, type, limit = 20 } = params
      
      if (!query) {
        return {
          success: false,
          error: 'Search query is required'
        }
      }

      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const results = await this.extension.searchResources(query, { type, limit })
      
      return {
        success: true,
        result: {
          query,
          results: results.map(result => ({
            uri: result.uri,
            name: result.name,
            description: result.description,
            mimeType: result.mimeType,
            relevance: result.relevance || 0,
            snippet: result.snippet,
            metadata: result.metadata || {}
          })),
          total: results.length,
          filters: { type, limit }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Resource search failed: ${error}`
      }
    }
  }

  /**
   * Get available resource templates
   */
  private async getResourceTemplates(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const templates = this.extension.getResourceTemplates()
      
      return {
        success: true,
        result: {
          templates: templates.map(template => ({
            name: template.name,
            description: template.description,
            uriTemplate: template.uriTemplate,
            mimeType: template.mimeType,
            parameters: template.parameters || [],
            examples: template.examples || []
          })),
          total: templates.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get resource templates: ${error}`
      }
    }
  }

  /**
   * Validate a resource URI
   */
  private async validateResourceUri(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { uri } = params
      
      if (!uri) {
        return {
          success: false,
          error: 'URI is required'
        }
      }

      const validation = this.extension.validateResourceUri(uri)
      
      return {
        success: true,
        result: {
          uri,
          valid: validation.valid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          suggestions: validation.suggestions || [],
          parsedUri: validation.parsedUri || null
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `URI validation failed: ${error}`
      }
    }
  }
}