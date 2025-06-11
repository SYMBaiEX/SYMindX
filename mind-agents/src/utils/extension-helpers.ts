/**
 * Extension helper utilities for creating properly typed ExtensionAction objects
 */

import { ExtensionAction, ActionCategory, Agent, ActionResult } from '../types/agent.js'
import { ActionParameters } from '../types/common.js'

/**
 * Create a properly typed ExtensionAction
 */
export function createExtensionAction(
  name: string,
  description: string,
  category: ActionCategory,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return {
    name,
    description,
    category,
    parameters,
    execute
  }
}

/**
 * Create a communication action
 */
export function createCommunicationAction(
  name: string,
  description: string,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return createExtensionAction(name, description, ActionCategory.COMMUNICATION, parameters, execute)
}

/**
 * Create a system action
 */
export function createSystemAction(
  name: string,
  description: string,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return createExtensionAction(name, description, ActionCategory.SYSTEM, parameters, execute)
}

/**
 * Create an observation action
 */
export function createObservationAction(
  name: string,
  description: string,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return createExtensionAction(name, description, ActionCategory.OBSERVATION, parameters, execute)
}

/**
 * Create a cognitive action
 */
export function createCognitiveAction(
  name: string,
  description: string,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return createExtensionAction(name, description, ActionCategory.COGNITIVE, parameters, execute)
}

/**
 * Create a tool execution action
 */
export function createToolExecutionAction(
  name: string,
  description: string,
  parameters: Record<string, {
    type: string
    description: string
    required: boolean
    default?: unknown
  }>,
  execute: (agent: Agent, params: ActionParameters) => Promise<ActionResult>
): ExtensionAction {
  return createExtensionAction(name, description, ActionCategory.TOOL_EXECUTION, parameters, execute)
}