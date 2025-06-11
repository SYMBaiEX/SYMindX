/**
 * Action helper utilities for creating properly typed ActionResult objects
 */

import { ActionResult, ActionResultType } from '../types/agent.js'
import { GenericData, Metadata } from '../types/common.js'

/**
 * Create a successful ActionResult
 */
export function createSuccessResult(
  result?: GenericData,
  metadata?: Metadata
): ActionResult {
  return {
    success: true,
    type: ActionResultType.SUCCESS,
    result,
    metadata,
    timestamp: new Date()
  }
}

/**
 * Create a failed ActionResult
 */
export function createFailureResult(
  error: string,
  metadata?: Metadata
): ActionResult {
  return {
    success: false,
    type: ActionResultType.FAILURE,
    error,
    metadata,
    timestamp: new Date()
  }
}

/**
 * Create a partial ActionResult
 */
export function createPartialResult(
  result?: GenericData,
  error?: string,
  metadata?: Metadata
): ActionResult {
  return {
    success: true,
    type: ActionResultType.PARTIAL,
    result,
    error,
    metadata,
    timestamp: new Date()
  }
}

/**
 * Create a pending ActionResult
 */
export function createPendingResult(
  metadata?: Metadata
): ActionResult {
  return {
    success: true,
    type: ActionResultType.PENDING,
    metadata,
    timestamp: new Date()
  }
}

/**
 * Create a cancelled ActionResult
 */
export function createCancelledResult(
  error?: string,
  metadata?: Metadata
): ActionResult {
  return {
    success: false,
    type: ActionResultType.CANCELLED,
    error: error || 'Action was cancelled',
    metadata,
    timestamp: new Date()
  }
}

/**
 * Create an ActionResult with timing information
 */
export function createTimedResult(
  success: boolean,
  startTime: number,
  result?: GenericData,
  error?: string,
  metadata?: Metadata
): ActionResult {
  const duration = Date.now() - startTime
  const type = success ? ActionResultType.SUCCESS : ActionResultType.FAILURE
  
  return {
    success,
    type,
    result,
    error,
    metadata,
    duration,
    timestamp: new Date()
  }
}