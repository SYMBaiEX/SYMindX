/**
 * Extensions Type Definitions
 * Central export point for all extension-related types
 */

// Export API types
export * from './api';

// Export Skills types
export * from './skills';

// Export MCP types
export * from './mcp';

// Re-export common extension types from agent for convenience
export type {
  Extension,
  ExtensionType,
  ExtensionStatus,
  ExtensionAction,
  ExtensionEventHandler,
} from '../agent';

// Re-export ExtensionConfig from common
export type { ExtensionConfig } from '../common';
