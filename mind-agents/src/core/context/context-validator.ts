/**
 * Context Validator
 * Validates context data structures and enforces constraints
 */

import type { UnifiedContext } from '../../types/context/unified-context.js';

export class ContextValidator {
  validateContext(context: UnifiedContext): boolean {
    // Basic validation
    if (!context || typeof context !== 'object') {
      return false;
    }

    // Required fields
    if (!context.id || !context.agentId || !context.userId) {
      return false;
    }

    // Messages array validation
    if (!Array.isArray(context.messages)) {
      return false;
    }

    return true;
  }

  validateMessage(message: any): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.role || !message.content) {
      return false;
    }

    return true;
  }

  validateEnrichment(enrichment: any): boolean {
    if (!enrichment || typeof enrichment !== 'object') {
      return false;
    }

    return true;
  }
}