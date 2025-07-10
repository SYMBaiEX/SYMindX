/**
 * SYMindX Tool System
 *
 * Unified tool system that integrates with MCP servers and AI SDK v5
 * for seamless tool discovery, validation, and execution
 */

import { z } from 'zod';

import { Agent } from '../../types/agent';
import { BaseConfig } from '../../types/common';
import { runtimeLogger } from '../../utils/logger';

// Tool parameter and result types
export interface ToolParameters {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | boolean[]
    | ToolParameters;
}

export type ToolResult =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | boolean[]
  | ToolParameters;
export type ToolSchema = z.ZodSchema | Record<string, z.ZodType> | JSONSchema;

// JSON Schema interface for external tools
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: (string | number)[];
}

export interface ToolSystemConfig extends BaseConfig {
  enabled: boolean;
  autoDiscovery: boolean;
  validationEnabled: boolean;
  executionTimeout: number;
  maxConcurrentExecutions: number;
  errorHandling: {
    retryAttempts: number;
    retryDelay: number;
    fallbackEnabled: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    logExecutions: boolean;
    logErrors: boolean;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolSchema;
  execute: (args: ToolParameters) => Promise<ToolResult>;
  metadata?: {
    source?: string;
    server?: string;
    originalName?: string;
    category?: string;
    version?: string;
    readOnly?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result?: ToolResult;
  error?: string;
  executionTime: number;
  metadata: {
    toolName: string;
    source: string;
    timestamp: Date;
  };
}

export interface ToolSystem {
  readonly name: string;
  readonly version: string;
  config: ToolSystemConfig;

  // Core methods
  initialize(agent: Agent): Promise<void>;
  cleanup(): Promise<void>;

  // Tool management
  registerTool(name: string, tool: ToolDefinition): void;
  unregisterTool(name: string): void;
  getTool(name: string): ToolDefinition | undefined;
  getAllTools(): Map<string, ToolDefinition>;

  // Tool execution
  executeTool(name: string, args: ToolParameters): Promise<ToolExecutionResult>;

  // AI SDK integration
  getAISDKTools(): Record<string, ToolDefinition>;

  // Status and monitoring
  getStatus(): {
    initialized: boolean;
    toolCount: number;
    executionCount: number;
    errorCount: number;
    averageExecutionTime: number;
    activeExecutions: number;
    servers: Record<string, { toolCount: number; tools: string[] }>;
  };

  // Server-specific methods
  getToolsByServer(serverName: string): Map<string, ToolDefinition>;
  getAvailableServers(): string[];
}

export * from './dynamic-tool-system';
export * from './factory';
