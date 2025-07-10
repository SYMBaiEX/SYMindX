/**
 * Types for MCP Server Extension
 */

export interface MCPServerConfig {
  enabled: boolean;
  port?: number;
  host?: string;
  name?: string;
  version?: string;
  enableStdio?: boolean;
  enableWebSocket?: boolean;
  enableHTTP?: boolean;
  cors?: {
    enabled: boolean;
    origins?: string[];
    credentials?: boolean;
  };
  auth?: {
    enabled: boolean;
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKeyHeader?: string;
  };
  rateLimit?: {
    enabled: boolean;
    requests: number;
    windowMs: number;
  };
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    includeArgs: boolean;
    includeResults: boolean;
  };
  exposedCapabilities?: {
    chat: boolean;
    textGeneration: boolean;
    embedding: boolean;
    memoryAccess: boolean;
    emotionState: boolean;
    cognitiveState: boolean;
    agentManagement: boolean;
    extensionControl: boolean;
  };
}

export interface MCPServerTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
  metadata?: {
    category?: string;
    readOnly?: boolean;
    destructive?: boolean;
    requiresAuth?: boolean;
  };
}

export interface MCPServerResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<any>;
  metadata?: {
    cacheable?: boolean;
    refreshInterval?: number;
    requiresAuth?: boolean;
  };
}

export interface MCPServerPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: string;
    default?: any;
  }>;
  handler: (args: any) => Promise<string>;
  metadata?: {
    category?: string;
    requiresAuth?: boolean;
  };
}

export interface MCPRequest {
  id: string | number;
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string | number;
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
  experimental?: Record<string, any>;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: MCPCapabilities;
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPServerStats {
  startTime: Date;
  requestCount: number;
  errorCount: number;
  activeConnections: number;
  toolExecutions: number;
  resourceAccesses: number;
  promptRequests: number;
  uptime: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface MCPConnectionInfo {
  id: string;
  type: 'stdio' | 'websocket' | 'http';
  remoteAddress?: string;
  userAgent?: string;
  connectedAt: Date;
  requestCount: number;
  lastActivity: Date;
}
