/**
 * Extension types for SYMindX
 */

import { Logger } from '../utils/logger.js'
import { ExtensionConfig } from './common.js'
import { Agent } from './agent.js'

/**
 * Extension context provided to extensions during initialization
 */
export interface ExtensionContext {
  /** Logger instance for the extension */
  logger: Logger
  /** Extension configuration */
  config: ExtensionConfig
  /** Agent instance */
  agent?: Agent
}

/**
 * Base extension interface
 */
export interface Extension {
  /** Unique extension identifier */
  id: string
  /** Human-readable extension name */
  name: string
  /** Extension version */
  version: string
  /** Extension type */
  type: string
  /** Whether the extension is enabled */
  enabled: boolean
  /** Current extension status */
  status: string
  /** Extension configuration */
  config: ExtensionConfig
  /** Available actions */
  actions: Record<string, any>
  /** Event handlers */
  events: Record<string, any>
  
  /** Initialize the extension */
  init(): Promise<void>
  /** Cleanup the extension */
  cleanup?(): Promise<void>
}