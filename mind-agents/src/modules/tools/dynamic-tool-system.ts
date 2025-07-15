/**
 * Dynamic Tool System Implementation
 *
 * Main tool system that dynamically integrates with MCP servers
 * and provides AI SDK v5 compatible tool execution
 */

import { z } from 'zod';

import { Agent } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';
import { buildObject } from '../../utils/type-helpers';

import {
  ToolSystem,
  ToolSystemConfig,
  ToolDefinition,
  ToolExecutionResult,
  ToolParameters,
  ToolResult,
  ToolSchema,
  JSONSchema,
} from './index';

export class DynamicToolSystem implements ToolSystem {
  readonly name = 'dynamic';
  readonly version = '1.0.0';

  public config: ToolSystemConfig;
  private agent?: Agent;
  private tools = new Map<string, ToolDefinition>();
  private executionStats = {
    executionCount: 0,
    errorCount: 0,
    totalExecutionTime: 0,
  };
  private initialized = false;
  private activeExecutions = new Set<string>();

  constructor(config: ToolSystemConfig) {
    this.config = config;
  }

  async initialize(agent: Agent): Promise<void> {
    if (this.initialized) {
      runtimeLogger.warn('🔧 Tool system already initialized');
      return;
    }

    this.agent = agent;

    try {
      // Auto-discover tools from MCP extensions if enabled
      if (this.config.autoDiscovery) {
        await this.discoverMCPTools();
      }

      // Set up the agent's toolSystem reference
      agent.toolSystem = this.getAISDKTools();

      this.initialized = true;
      runtimeLogger.info(
        `🔧 Dynamic tool system initialized with ${this.tools.size} tools`
      );
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize tool system:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.tools.clear();
    this.activeExecutions.clear();
    this.initialized = false;
    runtimeLogger.info('🔧 Tool system cleaned up');
  }

  registerTool(name: string, tool: ToolDefinition): void {
    this.tools.set(name, tool);

    if (this.config.logging.enabled && this.config.logging.level === 'debug') {
      runtimeLogger.debug(`🔧 Registered tool: ${name}`);
    }

    // Update agent's toolSystem if available
    if (this.agent) {
      this.agent.toolSystem = this.getAISDKTools();
    }
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);

    if (this.config.logging.enabled && this.config.logging.level === 'debug') {
      runtimeLogger.debug(`🔧 Unregistered tool: ${name}`);
    }

    // Update agent's toolSystem if available
    if (this.agent) {
      this.agent.toolSystem = this.getAISDKTools();
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Map<string, ToolDefinition> {
    return new Map(this.tools);
  }

  async executeTool(
    name: string,
    args: ToolParameters
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = `${name}-${startTime}`;

    try {
      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
        throw new Error(
          `Maximum concurrent executions reached (${this.config.maxConcurrentExecutions})`
        );
      }

      this.activeExecutions.add(executionId);

      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Validate arguments if validation is enabled
      if (this.config.validationEnabled && tool.parameters) {
        this.validateArguments(tool.parameters, args);
      }

      if (this.config.logging.enabled && this.config.logging.logExecutions) {
        runtimeLogger.info(`🔧 Executing tool: ${name}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(tool.execute, args);

      const executionTime = Date.now() - startTime;
      this.executionStats.executionCount++;
      this.executionStats.totalExecutionTime += executionTime;

      return {
        success: true,
        result,
        executionTime,
        metadata: {
          toolName: name,
          source: tool.metadata?.source || 'unknown',
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.executionStats.errorCount++;

      if (this.config.logging.enabled && this.config.logging.logErrors) {
        runtimeLogger.error(`❌ Tool execution failed for ${name}:`, error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          toolName: name,
          source: this.tools.get(name)?.metadata?.source || 'unknown',
          timestamp: new Date(),
        },
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  getAISDKTools(): Record<string, ToolDefinition> {
    const aiSDKTools: Record<string, ToolDefinition> = {};

    for (const [name, tool] of this.tools) {
      const toolDef = buildObject<ToolDefinition>({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        execute: async (args: ToolParameters) => {
          const result = await this.executeTool(name, args);
          if (result.success) {
            return result.result || '';
          } else {
            throw new Error(result.error || 'Tool execution failed');
          }
        },
      })
        .addOptional('metadata', tool.metadata)
        .build();

      aiSDKTools[name] = toolDef;
    }

    return aiSDKTools;
  }

  getStatus(): {
    initialized: boolean;
    toolCount: number;
    executionCount: number;
    errorCount: number;
    averageExecutionTime: number;
    servers: Array<{
      uri: string;
      status: 'connected' | 'disconnected' | 'error';
      tools: number;
    }>;
  } {
    const serverStats = this.getServerStats();

    return {
      initialized: this.initialized,
      toolCount: this.tools.size,
      executionCount: this.executionStats.executionCount,
      errorCount: this.executionStats.errorCount,
      averageExecutionTime:
        this.executionStats.executionCount > 0
          ? this.executionStats.totalExecutionTime /
            this.executionStats.executionCount
          : 0,
      activeExecutions: this.activeExecutions.size,
      servers: serverStats,
    };
  }

  /**
   * Get tools from a specific server
   */
  getToolsByServer(serverName: string): Map<string, ToolDefinition> {
    const serverTools = new Map<string, ToolDefinition>();

    for (const [toolName, tool] of this.tools) {
      if (
        tool.metadata?.server === serverName ||
        toolName.startsWith(`${serverName}:`)
      ) {
        serverTools.set(toolName, tool);
      }
    }

    return serverTools;
  }

  /**
   * Get statistics by server
   */
  private getServerStats(): Record<
    string,
    { toolCount: number; tools: string[] }
  > {
    const stats: Record<string, { toolCount: number; tools: string[] }> = {};

    for (const [toolName, tool] of this.tools) {
      const serverName = tool.metadata?.server || 'unknown';

      if (!stats[serverName]) {
        stats[serverName] = { toolCount: 0, tools: [] };
      }

      stats[serverName].toolCount++;
      stats[serverName].tools.push(tool.metadata?.originalName || toolName);
    }

    return stats;
  }

  /**
   * List all available servers
   */
  getAvailableServers(): string[] {
    const servers = new Set<string>();

    for (const [, tool] of this.tools) {
      if (tool.metadata?.server) {
        servers.add(tool.metadata.server);
      }
    }

    return Array.from(servers).sort();
  }

  /**
   * Discover and register tools from MCP extensions using server-based naming
   */
  private async discoverMCPTools(): Promise<void> {
    if (!this.agent) return;

    // Find MCP Client extension
    const mcpExtension = Array.from(this.agent.extensions || []).find(
      (ext) => ext.id === 'mcp-client'
    );

    if (!mcpExtension || !mcpExtension.enabled) {
      runtimeLogger.debug('🔧 No MCP Client extension found or enabled');
      return;
    }

    try {
      // Check if extension has the required MCP methods
      if (typeof (mcpExtension as any).getAvailableTools !== 'function') {
        runtimeLogger.debug(
          '🔧 MCP extension does not provide getAvailableTools method'
        );
        return;
      }

      const mcpTools = (mcpExtension as any).getAvailableTools();
      let totalToolsRegistered = 0;

      for (const [toolKey, mcpTool] of mcpTools) {
        // Extract server name from toolKey (format: "servername:toolname")
        const [serverName, toolName] = toolKey.includes(':')
          ? toolKey.split(':', 2)
          : ['unknown', toolKey];

        // Create server-namespaced tool name
        const namespacedToolName = `${serverName}:${toolName}`;

        const toolDefinition: ToolDefinition = {
          name: namespacedToolName,
          description: `[${serverName.toUpperCase()}] ${mcpTool.description}`,
          parameters: mcpTool.inputSchema,
          execute: async (args: ToolParameters): Promise<ToolResult> => {
            const result = await (mcpExtension as any).executeTool(
              toolKey,
              args
            );
            if (result.content && Array.isArray(result.content)) {
              return result.content
                .map((c: any) => c.text || c.data || '')
                .join('\n');
            }
            return result as ToolResult;
          },
          metadata: {
            source: 'mcp',
            server: serverName,
            originalName: toolName,
            category: mcpTool.metadata?.category || 'general',
            readOnly: mcpTool.metadata?.readOnly,
            destructive: mcpTool.metadata?.destructive,
            idempotent: mcpTool.metadata?.idempotent,
          },
        };

        this.registerTool(namespacedToolName, toolDefinition);
        totalToolsRegistered++;

        if (
          this.config.logging.enabled &&
          this.config.logging.level === 'debug'
        ) {
          runtimeLogger.debug(
            `🔧 Registered MCP tool: ${namespacedToolName} from server ${serverName}`
          );
        }
      }

      runtimeLogger.info(
        `🔧 Auto-registered ${totalToolsRegistered} tools from ${this.getUniqueServerCount(mcpTools)} MCP servers`
      );
    } catch (error) {
      runtimeLogger.error('❌ Failed to discover MCP tools:', error);
    }
  }

  /**
   * Count unique MCP servers from tool keys
   */
  private getUniqueServerCount(mcpTools: Map<string, any>): number {
    const servers = new Set<string>();
    for (const [toolKey] of mcpTools) {
      const serverName = toolKey.includes(':')
        ? toolKey.split(':', 2)[0] || 'unknown'
        : 'unknown';
      servers.add(serverName);
    }
    return servers.size;
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout(
    fn: (args: ToolParameters) => Promise<ToolResult>,
    args: ToolParameters
  ): Promise<ToolResult> {
    return new Promise<ToolResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Tool execution timed out after ${this.config.executionTimeout}ms`
          )
        );
      }, this.config.executionTimeout);

      fn(args)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Validate arguments against schema
   */
  private validateArguments(schema: ToolSchema, args: ToolParameters): void {
    try {
      if (schema && typeof schema === 'object' && 'parse' in schema) {
        // Zod schema
        (schema as z.ZodSchema).parse(args);
      } else if (schema && typeof schema === 'object' && 'type' in schema) {
        // JSON schema - basic validation
        const jsonSchema = schema as JSONSchema;
        if (jsonSchema.type === 'object' && jsonSchema.properties) {
          for (const [key, _prop] of Object.entries(jsonSchema.properties)) {
            if (
              jsonSchema.required &&
              jsonSchema.required.includes(key) &&
              !(key in args)
            ) {
              throw new Error(`Missing required parameter: ${key}`);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Argument validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
