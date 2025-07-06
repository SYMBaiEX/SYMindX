/**
 * Core SYMindX Runtime Components
 * 
 * This module exports the core runtime components including the event bus,
 * plugin loader, registry, and runtime orchestrator.
 */

export { SYMindXRuntime } from './runtime'
export { SYMindXModuleRegistry } from './registry'
export type { SimplePluginLoader } from './plugin-loader'
export { SimpleEventBus } from './event-bus'
export { MCPIntegration, mcpIntegration } from './mcp-integration'
export type { 
  MCPServerConfig, 
  MCPTool, 
  MCPToolResult, 
  MCPResource, 
  MCPPrompt 
} from './mcp-integration'

// Complex plugin system removed during emergency cleanup