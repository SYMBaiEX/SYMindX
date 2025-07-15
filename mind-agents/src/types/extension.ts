/**
 * Extension types for SYMindX
 */

import { Logger } from '../utils/logger';

import { Agent } from './agent';
import { ExtensionConfig } from './common';

/**
 * Extension action handler type
 */
export type ExtensionAction = (
  agent: Agent,
  ...args: unknown[]
) => Promise<unknown>;

/**
 * Extension event handler type
 */
export type ExtensionEventHandler = (
  event: ExtensionEvent
) => void | Promise<void>;

/**
 * Extension event structure
 */
export interface ExtensionEvent {
  type: string;
  data: unknown;
  timestamp: Date;
  source: string;
}

/**
 * Extension context provided to extensions during initialization
 */
export interface ExtensionContext {
  /** Logger instance for the extension */
  logger: Logger;
  /** Extension configuration */
  config: ExtensionConfig;
  /** Agent instance */
  agent?: Agent;
}

/**
 * Base extension interface
 */
export interface Extension {
  /** Unique extension identifier */
  id: string;
  /** Human-readable extension name */
  name: string;
  /** Extension version */
  version: string;
  /** Extension type */
  type: string;
  /** Whether the extension is enabled */
  enabled: boolean;
  /** Current extension status */
  status: string;
  /** Extension configuration */
  config: ExtensionConfig;
  /** Available actions */
  actions: Record<string, ExtensionAction>;
  /** Event handlers */
  events: Record<string, ExtensionEventHandler>;

  /** Initialize the extension */
  init(): Promise<void>;
  /** Cleanup the extension */
  cleanup?(): Promise<void>;
}
