/**
 * MCP (Model Context Protocol) Extension Type Definitions
 * Provides strongly-typed interfaces for MCP server functionality
 */

import type { Agent } from '../agent';

/**
 * MCP tool definition with proper typing
 */
export interface MCPTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON Schema for input parameters */
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPParameterSchema>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * MCP parameter schema definition
 */
export interface MCPParameterSchema {
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  /** Parameter description */
  description?: string;
  /** Default value */
  default?: any;
  /** Enum values for validation */
  enum?: any[];
  /** Array items schema */
  items?: MCPParameterSchema;
  /** Object properties schema */
  properties?: Record<string, MCPParameterSchema>;
  /** Required properties for objects */
  required?: string[];
  /** Additional properties allowed */
  additionalProperties?: boolean | MCPParameterSchema;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Minimum length for strings/arrays */
  minLength?: number;
  /** Maximum length for strings/arrays */
  maxLength?: number;
  /** Pattern for string validation */
  pattern?: string;
}

/**
 * MCP resource definition
 */
export interface MCPResource {
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** Resource MIME type */
  mimeType?: string;
}

/**
 * MCP prompt template
 */
export interface MCPPrompt {
  /** Prompt name */
  name: string;
  /** Prompt description */
  description?: string;
  /** Prompt arguments */
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP server information
 */
export interface MCPServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Protocol version */
  protocolVersion: string;
  /** Server capabilities */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
}

/**
 * MCP request types
 */
export type MCPRequest =
  | InitializeRequest
  | ListToolsRequest
  | CallToolRequest
  | ListResourcesRequest
  | ReadResourceRequest
  | ListPromptsRequest
  | GetPromptRequest;

/**
 * MCP response types
 */
export type MCPResponse =
  | InitializeResponse
  | ListToolsResponse
  | CallToolResponse
  | ListResourcesResponse
  | ReadResourceResponse
  | ListPromptsResponse
  | GetPromptResponse
  | ErrorResponse;

/**
 * Initialize request
 */
export interface InitializeRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'initialize';
  params: {
    protocolVersion: string;
    capabilities?: {
      tools?: boolean;
      resources?: boolean;
      prompts?: boolean;
    };
    clientInfo?: {
      name: string;
      version: string;
    };
  };
}

/**
 * Initialize response
 */
export interface InitializeResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    protocolVersion: string;
    capabilities: {
      tools?: boolean;
      resources?: boolean;
      prompts?: boolean;
      logging?: boolean;
    };
    serverInfo: MCPServerInfo;
  };
}

/**
 * List tools request
 */
export interface ListToolsRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/list';
  params?: {};
}

/**
 * List tools response
 */
export interface ListToolsResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    tools: MCPTool[];
  };
}

/**
 * Call tool request
 */
export interface CallToolRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

/**
 * Call tool response
 */
export interface CallToolResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
      uri?: string;
    }>;
    isError?: boolean;
  };
}

/**
 * List resources request
 */
export interface ListResourcesRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'resources/list';
  params?: {};
}

/**
 * List resources response
 */
export interface ListResourcesResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    resources: MCPResource[];
  };
}

/**
 * Read resource request
 */
export interface ReadResourceRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'resources/read';
  params: {
    uri: string;
  };
}

/**
 * Read resource response
 */
export interface ReadResourceResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    contents: Array<{
      uri: string;
      mimeType?: string;
      text?: string;
      blob?: string;
    }>;
  };
}

/**
 * List prompts request
 */
export interface ListPromptsRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'prompts/list';
  params?: {};
}

/**
 * List prompts response
 */
export interface ListPromptsResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    prompts: MCPPrompt[];
  };
}

/**
 * Get prompt request
 */
export interface GetPromptRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'prompts/get';
  params: {
    name: string;
    arguments?: Record<string, string>;
  };
}

/**
 * Get prompt response
 */
export interface GetPromptResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    description?: string;
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: {
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
        uri?: string;
      };
    }>;
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP server implementation interface
 */
export interface MCPServer {
  /** Server info */
  serverInfo: MCPServerInfo;

  /** Initialize the server */
  initialize(
    params: InitializeRequest['params']
  ): Promise<InitializeResponse['result']>;

  /** List available tools */
  listTools(): Promise<MCPTool[]>;

  /** Call a tool */
  callTool(
    name: string,
    args?: Record<string, any>
  ): Promise<CallToolResponse['result']>;

  /** List available resources */
  listResources(): Promise<MCPResource[]>;

  /** Read a resource */
  readResource(uri: string): Promise<ReadResourceResponse['result']>;

  /** List available prompts */
  listPrompts(): Promise<MCPPrompt[]>;

  /** Get a prompt */
  getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<GetPromptResponse['result']>;

  /** Handle raw request */
  handleRequest(request: MCPRequest): Promise<MCPResponse>;

  /** Close the server */
  close(): Promise<void>;
}

/**
 * MCP client interface for connecting to MCP servers
 */
export interface MCPClient {
  /** Connect to server */
  connect(transport: MCPTransport): Promise<void>;

  /** Initialize connection */
  initialize(): Promise<InitializeResponse['result']>;

  /** List tools */
  listTools(): Promise<MCPTool[]>;

  /** Call tool */
  callTool(
    name: string,
    args?: Record<string, any>
  ): Promise<CallToolResponse['result']>;

  /** List resources */
  listResources(): Promise<MCPResource[]>;

  /** Read resource */
  readResource(uri: string): Promise<ReadResourceResponse['result']>;

  /** List prompts */
  listPrompts(): Promise<MCPPrompt[]>;

  /** Get prompt */
  getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<GetPromptResponse['result']>;

  /** Close connection */
  close(): Promise<void>;
}

/**
 * MCP transport layer interface
 */
export interface MCPTransport {
  /** Send request */
  send(request: MCPRequest): Promise<void>;

  /** Receive response */
  receive(): Promise<MCPResponse>;

  /** Check if connected */
  isConnected(): boolean;

  /** Close transport */
  close(): Promise<void>;
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Available tools */
  tools?: MCPTool[];
  /** Available resources */
  resources?: MCPResource[];
  /** Available prompts */
  prompts?: MCPPrompt[];
  /** Custom handlers */
  handlers?: {
    onToolCall?: (name: string, args: any, agent: Agent) => Promise<any>;
    onResourceRead?: (uri: string, agent: Agent) => Promise<any>;
    onPromptGet?: (name: string, args: any, agent: Agent) => Promise<any>;
  };
}

/**
 * Type guards for MCP types
 */
export const isMCPRequest = (obj: any): obj is MCPRequest => {
  return obj && obj.jsonrpc === '2.0' && 'method' in obj;
};

export const isMCPResponse = (obj: any): obj is MCPResponse => {
  return obj && obj.jsonrpc === '2.0' && ('result' in obj || 'error' in obj);
};

export const isErrorResponse = (obj: any): obj is ErrorResponse => {
  return obj && obj.jsonrpc === '2.0' && 'error' in obj;
};

export const isToolCallRequest = (obj: any): obj is CallToolRequest => {
  return isMCPRequest(obj) && obj.method === 'tools/call';
};

export const isResourceReadRequest = (obj: any): obj is ReadResourceRequest => {
  return isMCPRequest(obj) && obj.method === 'resources/read';
};
