/**
 * MCP Client Resource Retrieval Skill
 * 
 * Handles retrieval and management of resources from remote MCP servers.
 */

import { Agent, ExtensionAction, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { McpClientExtension } from '../index.js'

export class ResourceRetrievalSkill {
  private extension: McpClientExtension

  constructor(extension: McpClientExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      list_resources: {
        name: 'list_resources',
        description: 'List available resources on servers',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of specific server (optional)',
            required: false
          },
          resourceType: {
            type: 'string',
            description: 'Filter by resource type',
            required: false
          },
          search: {
            type: 'string',
            description: 'Search term for resource names/descriptions',
            required: false
          },
          mimeType: {
            type: 'string',
            description: 'Filter by MIME type',
            required: false
          }
        },
        execute: this.listResources.bind(this)
      },
      get_resource: {
        name: 'get_resource',
        description: 'Retrieve a specific resource',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
            type: 'string',
            description: 'URI of the resource to retrieve',
            required: true
          },
          format: {
            type: 'string',
            description: 'Desired format (text, binary, json, base64)',
            required: false
          }
        },
        execute: this.getResource.bind(this)
      },
      get_resource_info: {
        name: 'get_resource_info',
        description: 'Get metadata about a resource',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
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
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
            type: 'string',
            description: 'URI of the resource to subscribe to',
            required: true
          },
          callback: {
            type: 'string',
            description: 'Callback function name',
            required: false
          }
        },
        execute: this.subscribeToResource.bind(this)
      },
      unsubscribe_from_resource: {
        name: 'unsubscribe_from_resource',
        description: 'Unsubscribe from resource changes',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
            type: 'string',
            description: 'URI of the resource to unsubscribe from',
            required: true
          }
        },
        execute: this.unsubscribeFromResource.bind(this)
      },
      search_resources: {
        name: 'search_resources',
        description: 'Search for resources across servers',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          query: {
            type: 'string',
            description: 'Search query',
            required: true
          },
          serverId: {
            type: 'string',
            description: 'Limit search to specific server',
            required: false
          },
          resourceType: {
            type: 'string',
            description: 'Filter by resource type',
            required: false
          },
          mimeType: {
            type: 'string',
            description: 'Filter by MIME type',
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
      download_resource: {
        name: 'download_resource',
        description: 'Download a resource to local file',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
            type: 'string',
            description: 'URI of the resource to download',
            required: true
          },
          localPath: {
            type: 'string',
            description: 'Local file path to save to',
            required: true
          },
          overwrite: {
            type: 'boolean',
            description: 'Overwrite existing file',
            required: false
          }
        },
        execute: this.downloadResource.bind(this)
      },
      batch_get_resources: {
        name: 'batch_get_resources',
        description: 'Retrieve multiple resources in batch',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          requests: {
            type: 'array',
            description: 'Array of resource requests',
            required: true
          },
          parallel: {
            type: 'boolean',
            description: 'Execute in parallel',
            required: false
          }
        },
        execute: this.batchGetResources.bind(this)
      },
      get_resource_templates: {
        name: 'get_resource_templates',
        description: 'Get resource URI templates from servers',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of specific server (optional)',
            required: false
          }
        },
        execute: this.getResourceTemplates.bind(this)
      },
      validate_resource_uri: {
        name: 'validate_resource_uri',
        description: 'Validate a resource URI',
        category: ActionCategory.RESOURCE_MANAGEMENT,
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          resourceUri: {
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
   * List available resources on servers
   */
  private async listResources(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceType, search, mimeType } = params
      
      const resources = await this.extension.listResources({
        serverId,
        resourceType,
        search,
        mimeType
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          resources: resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            resourceType: resource.resourceType,
            serverId: resource.serverId,
            serverName: resource.serverName,
            size: resource.size,
            lastModified: resource.lastModified?.toISOString(),
            version: resource.version,
            tags: resource.tags,
            metadata: resource.metadata,
            accessible: resource.accessible,
            permissions: resource.permissions
          })),
          total: resources.length,
          servers: Array.from(new Set(resources.map(r => r.serverId))),
          resourceTypes: Array.from(new Set(resources.map(r => r.resourceType).filter(Boolean))),
          mimeTypes: Array.from(new Set(resources.map(r => r.mimeType).filter(Boolean))),
          filters: { serverId, resourceType, search, mimeType }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list resources: ${error}`
      }
    }
  }

  /**
   * Retrieve a specific resource
   */
  private async getResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri, format = 'text' } = params
      
      if (!serverId || !resourceUri) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and resource URI are required'
        }
      }

      const resource = await this.extension.getResource({
        serverId,
        resourceUri,
        format
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          content: resource.content,
          format: resource.format,
          size: resource.size,
          encoding: resource.encoding,
          lastModified: resource.lastModified?.toISOString(),
          version: resource.version,
          checksum: resource.checksum,
          metadata: resource.metadata,
          serverId,
          retrievedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get resource: ${error}`
      }
    }
  }

  /**
   * Get metadata about a resource
   */
  private async getResourceInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri } = params
      
      if (!serverId || !resourceUri) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and resource URI are required'
        }
      }

      const info = await this.extension.getResourceInfo(serverId, resourceUri)
      
      if (!info) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: `Resource '${resourceUri}' not found on server '${serverId}'`
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          uri: info.uri,
          name: info.name,
          description: info.description,
          mimeType: info.mimeType,
          resourceType: info.resourceType,
          size: info.size,
          lastModified: info.lastModified?.toISOString(),
          created: info.created?.toISOString(),
          version: info.version,
          checksum: info.checksum,
          encoding: info.encoding,
          permissions: info.permissions,
          tags: info.tags,
          metadata: info.metadata,
          serverId,
          serverName: info.serverName,
          accessible: info.accessible,
          subscriptionSupported: info.subscriptionSupported,
          cacheable: info.cacheable,
          expires: info.expires?.toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get resource info: ${error}`
      }
    }
  }

  /**
   * Subscribe to resource changes
   */
  private async subscribeToResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri, callback } = params
      
      if (!serverId || !resourceUri) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and resource URI are required'
        }
      }

      const subscription = await this.extension.subscribeToResource({
        serverId,
        resourceUri,
        callback
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Subscribed to resource '${resourceUri}' on server '${serverId}'`,
          subscriptionId: subscription.subscriptionId,
          resourceUri,
          serverId,
          callback,
          subscribedAt: new Date().toISOString(),
          active: true
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to subscribe to resource: ${error}`
      }
    }
  }

  /**
   * Unsubscribe from resource changes
   */
  private async unsubscribeFromResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri } = params
      
      if (!serverId || !resourceUri) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and resource URI are required'
        }
      }

      await this.extension.unsubscribeFromResource({
        serverId,
        resourceUri
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Unsubscribed from resource '${resourceUri}' on server '${serverId}'`,
          resourceUri,
          serverId,
          unsubscribedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to unsubscribe from resource: ${error}`
      }
    }
  }

  /**
   * Search for resources across servers
   */
  private async searchResources(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { query, serverId, resourceType, mimeType, limit = 50 } = params
      
      if (!query) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Search query is required'
        }
      }

      const results = await this.extension.searchResources({
        query,
        serverId,
        resourceType,
        mimeType,
        limit
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          resources: results.resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            resourceType: resource.resourceType,
            serverId: resource.serverId,
            serverName: resource.serverName,
            relevanceScore: resource.relevanceScore,
            matchedFields: resource.matchedFields,
            snippet: resource.snippet,
            size: resource.size,
            lastModified: resource.lastModified?.toISOString(),
            tags: resource.tags
          })),
          total: results.total,
          hasMore: results.hasMore,
          searchTime: results.searchTime,
          query,
          filters: { serverId, resourceType, mimeType, limit },
          suggestions: results.suggestions || []
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Resource search failed: ${error}`
      }
    }
  }

  /**
   * Download a resource to local file
   */
  private async downloadResource(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri, localPath, overwrite = false } = params
      
      if (!serverId || !resourceUri || !localPath) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID, resource URI, and local path are required'
        }
      }

      const result = await this.extension.downloadResource({
        serverId,
        resourceUri,
        localPath,
        overwrite
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Resource downloaded to '${localPath}'`,
          resourceUri,
          serverId,
          localPath,
          fileSize: result.fileSize,
          downloadTime: result.downloadTime,
          checksum: result.checksum,
          mimeType: result.mimeType,
          downloadedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to download resource: ${error}`
      }
    }
  }

  /**
   * Retrieve multiple resources in batch
   */
  private async batchGetResources(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { requests, parallel = false } = params
      
      if (!requests || !Array.isArray(requests)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Requests array is required'
        }
      }

      const results = await this.extension.batchGetResources({
        requests,
        parallel
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          batchId: results.batchId,
          results: results.results.map(result => ({
            resourceUri: result.resourceUri,
            serverId: result.serverId,
            success: result.success,
            resource: result.resource ? {
              uri: result.resource.uri,
              name: result.resource.name,
              content: result.resource.content,
              mimeType: result.resource.mimeType,
              size: result.resource.size
            } : undefined,
            error: result.error,
            retrievalTime: result.retrievalTime
          })),
          summary: {
            total: results.results.length,
            successful: results.results.filter(r => r.success).length,
            failed: results.results.filter(r => !r.success).length,
            totalRetrievalTime: results.totalRetrievalTime,
            parallel
          },
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Batch resource retrieval failed: ${error}`
      }
    }
  }

  /**
   * Get resource URI templates from servers
   */
  private async getResourceTemplates(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId } = params
      
      const templates = await this.extension.getResourceTemplates(serverId)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          templates: templates.map(template => ({
            uriTemplate: template.uriTemplate,
            name: template.name,
            description: template.description,
            serverId: template.serverId,
            serverName: template.serverName,
            parameters: template.parameters?.map(param => ({
              name: param.name,
              description: param.description,
              type: param.type,
              required: param.required,
              default: param.default,
              examples: param.examples
            })),
            examples: template.examples,
            resourceType: template.resourceType,
            mimeTypes: template.mimeTypes
          })),
          total: templates.length,
          servers: Array.from(new Set(templates.map(t => t.serverId))),
          resourceTypes: Array.from(new Set(templates.map(t => t.resourceType).filter(Boolean)))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get resource templates: ${error}`
      }
    }
  }

  /**
   * Validate a resource URI
   */
  private async validateResourceUri(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, resourceUri } = params
      
      if (!serverId || !resourceUri) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Server ID and resource URI are required'
        }
      }

      const validation = await this.extension.validateResourceUri({
        serverId,
        resourceUri
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          valid: validation.valid,
          resourceUri,
          serverId,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          suggestions: validation.suggestions || [],
          exists: validation.exists,
          accessible: validation.accessible,
          resourceInfo: validation.resourceInfo ? {
            name: validation.resourceInfo.name,
            description: validation.resourceInfo.description,
            mimeType: validation.resourceInfo.mimeType,
            size: validation.resourceInfo.size
          } : undefined,
          template: validation.template ? {
            uriTemplate: validation.template.uriTemplate,
            parameters: validation.template.parameters
          } : undefined
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `URI validation failed: ${error}`
      }
    }
  }
}