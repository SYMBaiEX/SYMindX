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
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
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
  handler: () => Promise<unknown>;
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
  handler: (args: Record<string, unknown>) => Promise<string>;
  metadata?: {
    category?: string;
    requiresAuth?: boolean;
  };
}

export interface MCPRequest {
  id: string | number;
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  id: string | number;
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
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
  experimental?: Record<string, unknown>;
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

/**
 * Base interface for MCP Skills
 * Skills encapsulate related tools, resources, and prompts for specific functionality
 */
export interface BaseSkill {
  /** Unique identifier for the skill */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this skill provides */
  description: string;
  
  /** Version of the skill */
  version: string;
  
  /** Category of the skill */
  category: 'communication' | 'memory' | 'emotion' | 'cognition' | 'administration' | 'diagnostics';
  
  /** Whether the skill is enabled */
  enabled: boolean;
  
  /** Dependencies required by this skill */
  dependencies?: string[];
  
  /** Configuration options for the skill */
  readonly config?: Record<string, unknown>;
  
  /**
   * Initialize the skill with agent context
   */
  initialize(agent: import('../../types/agent').Agent): Promise<void>;
  
  /**
   * Get all tools provided by this skill
   */
  getTools(): Promise<MCPServerTool[]>;
  
  /**
   * Get all resources provided by this skill
   */
  getResources(): Promise<MCPServerResource[]>;
  
  /**
   * Get all prompts provided by this skill
   */
  getPrompts(): Promise<MCPServerPrompt[]>;
  
  /**
   * Cleanup resources when skill is disabled
   */
  cleanup(): Promise<void>;
  
  /**
   * Health check for the skill
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Configuration for a skill
 */
export interface SkillConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
}

/**
 * MCP Skill Manager for organizing and managing skills
 */
export interface MCPSkillManager {
  /** Register a skill with the manager */
  registerSkill(skill: BaseSkill): Promise<void>;
  
  /** Get all registered skills */
  getSkills(): BaseSkill[];
  
  /** Get a specific skill by ID */
  getSkill(id: string): BaseSkill | undefined;
  
  /** Initialize all skills */
  initializeAll(agent: import('../../types/agent').Agent): Promise<void>;
  
  /** Get all tools from all skills */
  getAllTools(): Promise<MCPServerTool[]>;
  
  /** Get all resources from all skills */
  getAllResources(): Promise<MCPServerResource[]>;
  
  /** Get all prompts from all skills */
  getAllPrompts(): Promise<MCPServerPrompt[]>;
  
  /** Cleanup all skills */
  cleanupAll(): Promise<void>;
}
