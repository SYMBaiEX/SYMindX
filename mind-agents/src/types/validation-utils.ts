/**
 * Type Validation Utilities
 *
 * Comprehensive runtime type validation for better type safety
 */

import {
  isAgent,
  isAgentConfig,
  isMemoryRecord,
  isEmotionState,
  isThoughtResult,
  isPlan,
  isAgentAction,
  isAgentEvent,
  isExtension,
  isPortal,
  isUnifiedContext,
  isMessage,
  validateBatch,
  assertType,
} from './type-guards.js';

import type {
  Agent,
  AgentConfig,
  MemoryRecord,
  EmotionState,
  ThoughtResult,
  Plan,
  AgentAction,
  AgentEvent,
  Extension,
  Portal,
  UnifiedContext,
  Message,
} from './agent.js';

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: {
    totalChecked: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface ValidationError {
  field: string;
  value: unknown;
  expectedType: string;
  actualType: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  value: unknown;
  message: string;
  suggestion?: string;
}

export interface TypeValidationConfig {
  strict: boolean;
  allowUnknown: boolean;
  warnOnDeprecated: boolean;
  maxDepth: number;
  customValidators?: Record<string, (value: unknown) => boolean>;
}

/**
 * Comprehensive type validator for SYMindX types
 */
export class TypeValidator {
  private config: TypeValidationConfig;
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  constructor(config: Partial<TypeValidationConfig> = {}) {
    this.config = {
      strict: true,
      allowUnknown: false,
      warnOnDeprecated: true,
      maxDepth: 10,
      ...config,
    };
  }

  /**
   * Validate an Agent object
   */
  validateAgent(obj: unknown, fieldPath = 'agent'): obj is Agent {
    this.resetValidation();

    if (!isAgent(obj)) {
      this.addError(
        fieldPath,
        obj,
        'Agent',
        typeof obj,
        'Invalid agent structure'
      );
      return false;
    }

    // Deep validation of agent properties
    this.validateAgentConfig(obj.config, `${fieldPath}.config`);
    this.validateMemoryProvider(obj.memory, `${fieldPath}.memory`);
    this.validateEmotionModule(obj.emotion, `${fieldPath}.emotion`);

    if (obj.extensions) {
      obj.extensions.forEach((ext, index) => {
        this.validateExtension(ext, `${fieldPath}.extensions[${index}]`);
      });
    }

    if (obj.portal) {
      this.validatePortal(obj.portal, `${fieldPath}.portal`);
    }

    return this.errors.length === 0;
  }

  /**
   * Validate an AgentConfig object
   */
  validateAgentConfig(
    obj: unknown,
    fieldPath = 'agentConfig'
  ): obj is AgentConfig {
    if (!isAgentConfig(obj)) {
      this.addError(
        fieldPath,
        obj,
        'AgentConfig',
        typeof obj,
        'Invalid agent configuration'
      );
      return false;
    }

    // Check for deprecated naming patterns
    if (this.config.warnOnDeprecated) {
      this.checkDeprecatedNaming(obj, fieldPath);
    }

    return true;
  }

  /**
   * Validate a MemoryRecord object
   */
  validateMemoryRecord(
    obj: unknown,
    fieldPath = 'memoryRecord'
  ): obj is MemoryRecord {
    if (!isMemoryRecord(obj)) {
      this.addError(
        fieldPath,
        obj,
        'MemoryRecord',
        typeof obj,
        'Invalid memory record'
      );
      return false;
    }

    // Validate memory record constraints
    if (obj.importance < 0 || obj.importance > 1) {
      this.addWarning(
        fieldPath,
        obj.importance,
        'Importance should be between 0 and 1'
      );
    }

    if (obj.content.length === 0) {
      this.addWarning(fieldPath, obj.content, 'Memory content is empty');
    }

    return true;
  }

  /**
   * Validate an EmotionState object
   */
  validateEmotionState(
    obj: unknown,
    fieldPath = 'emotionState'
  ): obj is EmotionState {
    if (!isEmotionState(obj)) {
      this.addError(
        fieldPath,
        obj,
        'EmotionState',
        typeof obj,
        'Invalid emotion state'
      );
      return false;
    }

    // Validate emotion constraints
    if (obj.intensity < 0 || obj.intensity > 1) {
      this.addWarning(
        fieldPath,
        obj.intensity,
        'Emotion intensity should be between 0 and 1'
      );
    }

    return true;
  }

  /**
   * Validate a ThoughtResult object
   */
  validateThoughtResult(
    obj: unknown,
    fieldPath = 'thoughtResult'
  ): obj is ThoughtResult {
    if (!isThoughtResult(obj)) {
      this.addError(
        fieldPath,
        obj,
        'ThoughtResult',
        typeof obj,
        'Invalid thought result'
      );
      return false;
    }

    // Validate thought result constraints
    if (obj.confidence < 0 || obj.confidence > 1) {
      this.addWarning(
        fieldPath,
        obj.confidence,
        'Confidence should be between 0 and 1'
      );
    }

    // Validate nested objects
    this.validateEmotionState(obj.emotions, `${fieldPath}.emotions`);

    obj.actions.forEach((action, index) => {
      this.validateAgentAction(action, `${fieldPath}.actions[${index}]`);
    });

    obj.memories.forEach((memory, index) => {
      this.validateMemoryRecord(memory, `${fieldPath}.memories[${index}]`);
    });

    return this.errors.length === 0;
  }

  /**
   * Validate a Plan object
   */
  validatePlan(obj: unknown, fieldPath = 'plan'): obj is Plan {
    if (!isPlan(obj)) {
      this.addError(
        fieldPath,
        obj,
        'Plan',
        typeof obj,
        'Invalid plan structure'
      );
      return false;
    }

    // Validate plan constraints
    if (obj.priority < 0) {
      this.addWarning(
        fieldPath,
        obj.priority,
        'Plan priority should not be negative'
      );
    }

    if (obj.estimatedDuration <= 0) {
      this.addWarning(
        fieldPath,
        obj.estimatedDuration,
        'Estimated duration should be positive'
      );
    }

    return true;
  }

  /**
   * Validate an AgentAction object
   */
  validateAgentAction(
    obj: unknown,
    fieldPath = 'agentAction'
  ): obj is AgentAction {
    if (!isAgentAction(obj)) {
      this.addError(
        fieldPath,
        obj,
        'AgentAction',
        typeof obj,
        'Invalid agent action'
      );
      return false;
    }

    return true;
  }

  /**
   * Validate an AgentEvent object
   */
  validateAgentEvent(
    obj: unknown,
    fieldPath = 'agentEvent'
  ): obj is AgentEvent {
    if (!isAgentEvent(obj)) {
      this.addError(
        fieldPath,
        obj,
        'AgentEvent',
        typeof obj,
        'Invalid agent event'
      );
      return false;
    }

    return true;
  }

  /**
   * Validate an Extension object
   */
  validateExtension(obj: unknown, fieldPath = 'extension'): obj is Extension {
    if (!isExtension(obj)) {
      this.addError(
        fieldPath,
        obj,
        'Extension',
        typeof obj,
        'Invalid extension'
      );
      return false;
    }

    return true;
  }

  /**
   * Validate a Portal object
   */
  validatePortal(obj: unknown, fieldPath = 'portal'): obj is Portal {
    if (!isPortal(obj)) {
      this.addError(fieldPath, obj, 'Portal', typeof obj, 'Invalid portal');
      return false;
    }

    return true;
  }

  /**
   * Validate a UnifiedContext object
   */
  validateUnifiedContext(
    obj: unknown,
    fieldPath = 'unifiedContext'
  ): obj is UnifiedContext {
    if (!isUnifiedContext(obj)) {
      this.addError(
        fieldPath,
        obj,
        'UnifiedContext',
        typeof obj,
        'Invalid unified context'
      );
      return false;
    }

    return true;
  }

  /**
   * Validate a Message object
   */
  validateMessage(obj: unknown, fieldPath = 'message'): obj is Message {
    if (!isMessage(obj)) {
      this.addError(fieldPath, obj, 'Message', typeof obj, 'Invalid message');
      return false;
    }

    return true;
  }

  /**
   * Batch validate an array of objects
   */
  validateBatch<T>(
    objects: unknown[],
    validator: (obj: unknown) => obj is T,
    typeName: string
  ): { valid: T[]; invalid: unknown[] } {
    return validateBatch(objects, validator);
  }

  /**
   * Get validation report
   */
  getReport(): ValidationReport {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      statistics: {
        totalChecked: this.errors.length + this.warnings.length,
        validCount: this.errors.length === 0 ? 1 : 0,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }

  /**
   * Reset validation state
   */
  private resetValidation(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Add validation error
   */
  private addError(
    field: string,
    value: unknown,
    expectedType: string,
    actualType: string,
    message: string
  ): void {
    this.errors.push({
      field,
      value,
      expectedType,
      actualType,
      message,
      severity: 'error',
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(
    field: string,
    value: unknown,
    message: string,
    suggestion?: string
  ): void {
    this.warnings.push({
      field,
      value,
      message,
      suggestion,
    });
  }

  /**
   * Check for deprecated naming patterns
   */
  private checkDeprecatedNaming(
    obj: Record<string, unknown>,
    fieldPath: string
  ): void {
    const deprecatedPatterns = [
      'decision_making',
      'human_interaction',
      'autonomy_threshold',
      'ethical_constraints',
      'independence_level',
      'life_simulation',
      'goal_pursuit',
      'interruption_tolerance',
    ];

    for (const key of Object.keys(obj)) {
      if (deprecatedPatterns.some((pattern) => key.includes(pattern))) {
        this.addWarning(
          `${fieldPath}.${key}`,
          obj[key],
          `Property '${key}' uses deprecated snake_case naming`,
          'Consider migrating to camelCase naming convention'
        );
      }
    }
  }

  // Private methods for validating complex nested objects
  private validateMemoryProvider(obj: unknown, fieldPath: string): boolean {
    if (typeof obj !== 'object' || obj === null) {
      this.addError(
        fieldPath,
        obj,
        'MemoryProvider',
        typeof obj,
        'Invalid memory provider'
      );
      return false;
    }

    // Check for required methods
    const requiredMethods = [
      'store',
      'retrieve',
      'search',
      'delete',
      'clear',
      'getRecent',
    ];
    for (const method of requiredMethods) {
      if (!(method in obj) || typeof (obj as any)[method] !== 'function') {
        this.addError(
          `${fieldPath}.${method}`,
          (obj as any)[method],
          'function',
          typeof (obj as any)[method],
          `Missing required method '${method}'`
        );
      }
    }

    return this.errors.length === 0;
  }

  private validateEmotionModule(obj: unknown, fieldPath: string): boolean {
    if (typeof obj !== 'object' || obj === null) {
      this.addError(
        fieldPath,
        obj,
        'EmotionModule',
        typeof obj,
        'Invalid emotion module'
      );
      return false;
    }

    // Check for required methods
    const requiredMethods = [
      'getState',
      'processEvent',
      'updateEmotion',
      'decay',
      'reset',
    ];
    for (const method of requiredMethods) {
      if (!(method in obj) || typeof (obj as any)[method] !== 'function') {
        this.addError(
          `${fieldPath}.${method}`,
          (obj as any)[method],
          'function',
          typeof (obj as any)[method],
          `Missing required method '${method}'`
        );
      }
    }

    return this.errors.length === 0;
  }
}

/**
 * Create a global type validator instance
 */
export const globalTypeValidator = new TypeValidator({
  strict: true,
  allowUnknown: false,
  warnOnDeprecated: true,
  maxDepth: 10,
});

/**
 * Convenience function for validating agents
 */
export function validateAgent(obj: unknown): ValidationReport {
  const validator = new TypeValidator();
  validator.validateAgent(obj);
  return validator.getReport();
}

/**
 * Convenience function for validating agent configs
 */
export function validateAgentConfig(obj: unknown): ValidationReport {
  const validator = new TypeValidator();
  validator.validateAgentConfig(obj);
  return validator.getReport();
}

/**
 * Convenience function for validating memory records
 */
export function validateMemoryRecord(obj: unknown): ValidationReport {
  const validator = new TypeValidator();
  validator.validateMemoryRecord(obj);
  return validator.getReport();
}

/**
 * Type assertion with validation reporting
 */
export function assertValidType<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  typeName: string
): T {
  if (!validator(value)) {
    throw new TypeError(`Expected ${typeName}, got ${typeof value}`);
  }
  return value;
}

/**
 * Safe type casting with validation
 */
export function safeCast<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  defaultValue: T
): T {
  return validator(value) ? value : defaultValue;
}

/**
 * Validate and sanitize object properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: unknown,
  validator: (obj: unknown) => obj is T,
  sanitizers: Partial<Record<keyof T, (value: unknown) => unknown>> = {}
): T | null {
  if (!validator(obj)) {
    return null;
  }

  const sanitized = { ...obj };

  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    if (key in sanitized && sanitizer) {
      sanitized[key as keyof T] = sanitizer(
        sanitized[key as keyof T]
      ) as T[keyof T];
    }
  }

  return sanitized;
}
