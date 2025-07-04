/**
 * Core SYMindX Runtime Components
 * 
 * This module exports the core runtime components including the event bus,
 * plugin loader, registry, and runtime orchestrator.
 */

export { SYMindXRuntime } from './runtime.js'
export { SYMindXModuleRegistry } from './registry.js'
export type { SimplePluginLoader } from './plugin-loader.js'
export { SimpleEventBus } from './event-bus.js'
export { MCPIntegration, mcpIntegration } from './mcp-integration.js'
export type { 
  MCPServerConfig, 
  MCPTool, 
  MCPToolResult, 
  MCPResource, 
  MCPPrompt 
} from './mcp-integration.js'

// Complex plugin system removed during emergency cleanup