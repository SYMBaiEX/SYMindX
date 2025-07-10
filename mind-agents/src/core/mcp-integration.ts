/**
 * MCP (Model Context Protocol) Integration
 *
 * Provides dynamic tool discovery and execution capabilities through MCP servers
 * Integrates with the AI SDK's experimental MCP client for seamless tool usage
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';

import { runtimeLogger } from '../utils/logger';

/**
 * MCP Client configuration interface
 */
export interface MCPClientConfig {
  name: string;
  version?: string;
  timeout?: number;
  retryAttempts?: number;
  autoReconnect?: boolean;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  autoReconnect?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  server: string;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export class MCPIntegration {
  private clients: Map<string, any> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private servers: Map<string, MCPServerConfig> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    runtimeLogger.info('🔧 Initializing MCP Integration');
  }

  /**
   * Add an MCP server configuration
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    try {
      this.servers.set(config.name, config);

      // Create MCP client for this server
      const client = new Client({
        name: 'symindx-mcp-client',
        version: '1.0.0',
      });

      // Connect to the server
      await this.connectToServer(config.name, client, config);

      runtimeLogger.info(`✅ Added MCP server: ${config.name}`);
    } catch (error) {
      runtimeLogger.error(`❌ Failed to add MCP server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Connect to an MCP server and discover its capabilities
   */
  private async connectToServer(
    serverName: string,
    client: any,
    config: MCPServerConfig
  ): Promise<void> {
    try {
      // Create transport based on configuration
      let transport: any;
      if (config.command) {
        // Import StdioClientTransport dynamically for command-based servers
        const { StdioClientTransport } = await import(
          '@modelcontextprotocol/sdk/client/stdio.js'
        );
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env || {},
        });
      } else {
        throw new Error(
          'Only command-based MCP servers are supported in this integration'
        );
      }

      // Connect to the server using the transport
      await client.connect(transport);

      this.clients.set(serverName, client);

      // Discover tools
      await this.discoverTools(serverName, client);

      // Discover resources
      await this.discoverResources(serverName, client);

      // Discover prompts
      await this.discoverPrompts(serverName, client);

      // Set up auto-reconnect if enabled
      if (config.autoReconnect) {
        this.setupAutoReconnect(serverName, client, config);
      }

      runtimeLogger.info(`🔗 Connected to MCP server: ${serverName}`);
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to connect to MCP server ${serverName}:`,
        error
      );

      // Retry if configured
      if (config.retryAttempts && config.retryAttempts > 0) {
        setTimeout(() => {
          this.retryConnection(
            serverName,
            client,
            config,
            config.retryAttempts! - 1
          );
        }, 5000);
      }

      throw error;
    }
  }

  /**
   * Retry connection to an MCP server
   */
  private async retryConnection(
    serverName: string,
    client: any,
    config: MCPServerConfig,
    attemptsLeft: number
  ): Promise<void> {
    if (attemptsLeft <= 0) {
      runtimeLogger.error(
        `❌ Failed to connect to MCP server ${serverName} after all retry attempts`
      );
      return;
    }

    try {
      await this.connectToServer(serverName, client, {
        ...config,
        retryAttempts: attemptsLeft,
      });
    } catch (error) {
      runtimeLogger.warn(
        `⚠️ Retry attempt failed for MCP server ${serverName}, ${attemptsLeft} attempts remaining`
      );
    }
  }

  /**
   * Set up auto-reconnection for an MCP server
   */
  private setupAutoReconnect(
    serverName: string,
    client: any,
    config: MCPServerConfig
  ): void {
    client.on('disconnect', () => {
      runtimeLogger.warn(
        `🔌 MCP server ${serverName} disconnected, attempting to reconnect...`
      );

      const timer = setTimeout(async () => {
        try {
          await this.connectToServer(serverName, client, config);
        } catch (error) {
          runtimeLogger.error(
            `❌ Auto-reconnect failed for MCP server ${serverName}:`,
            error
          );
        }
      }, 5000);

      this.reconnectTimers.set(serverName, timer);
    });

    client.on('connect', () => {
      const timer = this.reconnectTimers.get(serverName);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(serverName);
      }
    });
  }

  /**
   * Discover tools from an MCP server
   */
  private async discoverTools(serverName: string, client: any): Promise<void> {
    try {
      const response = await client.listTools();

      if (response.tools) {
        for (const tool of response.tools) {
          const mcpTool: MCPTool = {
            name: tool.name,
            description: tool.description || '',
            inputSchema: this.convertToZodSchema(tool.inputSchema),
            server: serverName,
          };

          this.tools.set(`${serverName}:${tool.name}`, mcpTool);
          runtimeLogger.debug(
            `🔧 Discovered tool: ${tool.name} from ${serverName}`
          );
        }
      }
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to discover tools from ${serverName}:`,
        error
      );
    }
  }

  /**
   * Discover resources from an MCP server
   */
  private async discoverResources(
    serverName: string,
    client: any
  ): Promise<void> {
    try {
      const response = await client.listResources();

      if (response.resources) {
        for (const resource of response.resources) {
          const mcpResource: MCPResource = {
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          };

          this.resources.set(`${serverName}:${resource.uri}`, mcpResource);
          runtimeLogger.debug(
            `📁 Discovered resource: ${resource.name} from ${serverName}`
          );
        }
      }
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to discover resources from ${serverName}:`,
        error
      );
    }
  }

  /**
   * Discover prompts from an MCP server
   */
  private async discoverPrompts(
    serverName: string,
    client: any
  ): Promise<void> {
    try {
      const response = await client.listPrompts();

      if (response.prompts) {
        for (const prompt of response.prompts) {
          const mcpPrompt: MCPPrompt = {
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
          };

          this.prompts.set(`${serverName}:${prompt.name}`, mcpPrompt);
          runtimeLogger.debug(
            `💭 Discovered prompt: ${prompt.name} from ${serverName}`
          );
        }
      }
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to discover prompts from ${serverName}:`,
        error
      );
    }
  }

  /**
   * Execute a tool from an MCP server
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const client = this.clients.get(tool.server);
    if (!client) {
      throw new Error(`MCP server not connected: ${tool.server}`);
    }

    try {
      // Validate arguments against schema
      tool.inputSchema.parse(args);

      const response = await client.callTool({
        name: tool.name,
        arguments: args,
      });

      runtimeLogger.debug(`🔧 Executed tool: ${toolName}`);

      return {
        content: response.content || [],
        isError: response.isError || false,
      };
    } catch (error) {
      runtimeLogger.error(`❌ Tool execution failed for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(resourceUri: string): Promise<MCPToolResult> {
    const resourceKey = Array.from(this.resources.keys()).find((key) =>
      key.endsWith(resourceUri)
    );
    if (!resourceKey) {
      throw new Error(`Resource not found: ${resourceUri}`);
    }

    const resource = this.resources.get(resourceKey)!;
    const serverName = resourceKey.split(':')[0];
    const client = this.clients.get(serverName);

    if (!client) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    try {
      const response = await client.readResource({
        uri: resource.uri,
      });

      runtimeLogger.debug(`📁 Read resource: ${resourceUri}`);

      return {
        content: response.contents || [],
        isError: false,
      };
    } catch (error) {
      runtimeLogger.error(`❌ Resource read failed for ${resourceUri}:`, error);
      throw error;
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(
    promptName: string,
    args?: Record<string, any>
  ): Promise<string> {
    const prompt = this.prompts.get(promptName);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    const serverName = promptName.split(':')[0];
    const client = this.clients.get(serverName);

    if (!client) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    try {
      const response = await client.getPrompt({
        name: prompt.name,
        arguments: args || {},
      });

      runtimeLogger.debug(`💭 Retrieved prompt: ${promptName}`);

      return response.messages?.[0]?.content?.text || '';
    } catch (error) {
      runtimeLogger.error(
        `❌ Prompt retrieval failed for ${promptName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): Map<string, MCPTool> {
    return new Map(this.tools);
  }

  /**
   * Get all available resources
   */
  getAvailableResources(): Map<string, MCPResource> {
    return new Map(this.resources);
  }

  /**
   * Get all available prompts
   */
  getAvailablePrompts(): Map<string, MCPPrompt> {
    return new Map(this.prompts);
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
        this.clients.delete(serverName);

        // Clean up tools, resources, and prompts from this server
        for (const key of Array.from(this.tools.keys())) {
          if (key.startsWith(`${serverName}:`)) {
            this.tools.delete(key);
          }
        }

        for (const key of Array.from(this.resources.keys())) {
          if (key.startsWith(`${serverName}:`)) {
            this.resources.delete(key);
          }
        }

        for (const key of Array.from(this.prompts.keys())) {
          if (key.startsWith(`${serverName}:`)) {
            this.prompts.delete(key);
          }
        }

        // Clear reconnect timer
        const timer = this.reconnectTimers.get(serverName);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(serverName);
        }

        runtimeLogger.info(`🔌 Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        runtimeLogger.error(
          `❌ Failed to disconnect from MCP server ${serverName}:`,
          error
        );
      }
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map((name) => this.disconnectServer(name)));
  }

  /**
   * Convert JSON Schema to Zod schema (simplified)
   */
  private convertToZodSchema(jsonSchema: any): z.ZodSchema {
    if (!jsonSchema) {
      return z.object({});
    }

    // This is a simplified conversion - in production you might want to use
    // a more robust JSON Schema to Zod converter
    switch (jsonSchema.type) {
      case 'object':
        const shape: Record<string, z.ZodTypeAny> = {};
        if (jsonSchema.properties) {
          for (const [key, prop] of Object.entries(
            jsonSchema.properties as any
          )) {
            shape[key] = this.convertToZodSchema(prop);
          }
        }
        return z.object(shape);

      case 'string':
        return z.string();

      case 'number':
        return z.number();

      case 'boolean':
        return z.boolean();

      case 'array':
        return z.array(this.convertToZodSchema(jsonSchema.items));

      default:
        return z.any();
    }
  }

  /**
   * Convert MCP tools to AI SDK compatible format
   */
  getAISDKTools(): Record<string, any> {
    const tools: Record<string, any> = {};

    for (const [toolKey, tool] of Array.from(this.tools.entries())) {
      tools[toolKey] = {
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          const result = await this.executeTool(toolKey, args);
          return result.content.map((c) => c.text || c.data || '').join('\n');
        },
      };
    }

    return tools;
  }
}

// Global MCP integration instance
export const mcpIntegration = new MCPIntegration();

export default mcpIntegration;
