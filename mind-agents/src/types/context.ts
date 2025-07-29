/**
 * Context types for agent interactions
 */

/**
 * Base context properties that can be extended
 */
export interface BaseContext {
  sessionId?: string;
  userId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Portal-specific context for AI generation
 */
export interface PortalContext extends BaseContext {
  systemPrompt?: string;
  cognitiveContext?: {
    thoughts: string[];
    cognitiveConfidence?: number;
  };
  previousThoughts?: string;
  environment?: {
    location?: string;
  };
  events?: unknown[];
}

/**
 * Tool result structure from AI SDK v5
 */
export interface ToolResult {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  error?: unknown;
  timestamp: Date;
}

/**
 * Portal configuration type
 */
export interface PortalConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

/**
 * MCP tool definition for type safety
 */
export interface MCPTool {
  description?: string;
  parameters?: Record<string, unknown>;
  execute?: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Type-safe MCP tools collection
 */
export type MCPToolSet = Record<string, MCPTool>;

// Note: Unified context types are available from './context/index.js'
// This file focuses on base context types