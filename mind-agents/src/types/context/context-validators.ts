/**
 * Context Validation Framework Types
 * 
 * Provides comprehensive validation types for the SYMindX context system,
 * ensuring context integrity and preventing downstream errors.
 * 
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import { UnifiedContext } from './unified-context.js';

/**
 * Severity levels for validation results
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Categories of validation rules
 */
export enum ValidationCategory {
  SCHEMA = 'schema',
  BUSINESS = 'business',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CONSISTENCY = 'consistency',
  FORMAT = 'format',
  RELATIONSHIP = 'relationship'
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Unique identifier for this validation result */
  id: string;
  /** Whether the validation passed */
  isValid: boolean;
  /** Severity level of any issues found */
  severity: ValidationSeverity;
  /** Category of validation */
  category: ValidationCategory;
  /** Human-readable description of the result */
  message: string;
  /** Detailed error information if validation failed */
  details?: {
    field?: string;
    value?: any;
    expected?: any;
    actual?: any;
    code?: string;
    path?: string;
  };
  /** Performance metrics for this validation */
  metrics?: {
    executionTime: number;
    memoryUsage?: number;
    complexity?: number;
  };
  /** Suggestions for fixing validation errors */
  suggestions?: string[];
  /** Timestamp when validation was performed */
  timestamp: Date;
}

/**
 * Configuration for validation levels
 */
export enum ValidationLevel {
  /** Minimal validation - only critical errors */
  MINIMAL = 'minimal',
  /** Basic validation - errors and warnings */
  BASIC = 'basic',
  /** Standard validation - all severities except info */
  STANDARD = 'standard',
  /** Comprehensive validation - all validations including info */
  COMPREHENSIVE = 'comprehensive',
  /** Custom validation level with specific rules */
  CUSTOM = 'custom'
}

/**
 * Configuration for a validation rule
 */
export interface ValidationRuleConfig {
  /** Whether this rule is enabled */
  enabled: boolean;
  /** Severity level to assign to failures */
  severity: ValidationSeverity;
  /** Custom configuration for the rule */
  options?: Record<string, any>;
  /** Whether to stop validation on failure of this rule */
  haltOnFailure?: boolean;
  /** Timeout for asynchronous validation in milliseconds */
  timeout?: number;
}

/**
 * Definition of a validation rule
 */
export interface ValidationRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this rule validates */
  description: string;
  /** Category this rule belongs to */
  category: ValidationCategory;
  /** Default severity for failures */
  defaultSeverity: ValidationSeverity;
  /** Whether this rule supports async validation */
  supportsAsync: boolean;
  /** Dependencies - other rules that must pass first */
  dependencies?: string[];
  /** Configuration for this rule */
  config: ValidationRuleConfig;
}

/**
 * Context for validation execution
 */
export interface ValidationContext {
  /** The context being validated */
  context: UnifiedContext;
  /** Validation level being applied */
  level: ValidationLevel;
  /** Additional metadata for validation */
  metadata?: Record<string, any>;
  /** Previous validation results to consider */
  previousResults?: ValidationResult[];
  /** Whether to perform expensive validations */
  includeExpensive?: boolean;
}

/**
 * Schema definition for validation
 */
export interface ValidationSchema {
  /** Schema type (JSON Schema, Ajv, etc.) */
  type: string;
  /** The schema definition */
  schema: any;
  /** Version of the schema */
  version: string;
  /** Whether schema is strict (no additional properties) */
  strict?: boolean;
}

/**
 * Performance constraints for validation
 */
export interface ValidationPerformanceConstraints {
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;
  /** Maximum memory usage in bytes */
  maxMemoryUsage?: number;
  /** Maximum context size to validate */
  maxContextSize?: number;
  /** Maximum number of validation rules to execute */
  maxRules?: number;
}

/**
 * Aggregated validation results
 */
export interface ValidationReport {
  /** Overall validation status */
  isValid: boolean;
  /** Total number of validations performed */
  totalValidations: number;
  /** Number of passed validations */
  passed: number;
  /** Number of failed validations */
  failed: number;
  /** Number of warnings generated */
  warnings: number;
  /** Individual validation results */
  results: ValidationResult[];
  /** Performance summary */
  performance: {
    totalExecutionTime: number;
    averageExecutionTime: number;
    slowestValidation?: ValidationResult;
    fastestValidation?: ValidationResult;
  };
  /** Summary by category */
  categorySummary: Record<ValidationCategory, {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  }>;
  /** Timestamp of the validation report */
  timestamp: Date;
}

/**
 * Base interface for all context validators
 */
export interface ContextValidator {
  /** Unique identifier for this validator */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this validator does */
  description: string;
  /** Category of validation */
  category: ValidationCategory;
  /** Whether this validator supports async operations */
  supportsAsync: boolean;
  /** Performance constraints */
  constraints?: ValidationPerformanceConstraints;

  /**
   * Validate a context synchronously
   */
  validate(context: ValidationContext): ValidationResult[];

  /**
   * Validate a context asynchronously
   */
  validateAsync?(context: ValidationContext): Promise<ValidationResult[]>;

  /**
   * Check if this validator can handle the given context
   */
  canValidate(context: UnifiedContext): boolean;

  /**
   * Get the validation rules this validator implements
   */
  getRules(): ValidationRule[];

  /**
   * Configure the validator
   */
  configure(config: Record<string, any>): void;

  /**
   * Get validator configuration
   */
  getConfiguration(): Record<string, any>;
}

/**
 * Factory function type for creating validators
 */
export type ValidatorFactory<T extends ContextValidator = ContextValidator> = (
  config?: Record<string, any>
) => T;

/**
 * Registry for validation factories
 */
export interface ValidatorRegistry {
  /** Register a validator factory */
  register<T extends ContextValidator>(
    id: string,
    factory: ValidatorFactory<T>
  ): void;

  /** Get a validator factory */
  get<T extends ContextValidator>(id: string): ValidatorFactory<T> | undefined;

  /** Get all registered validator IDs */
  getRegisteredIds(): string[];

  /** Check if a validator is registered */
  isRegistered(id: string): boolean;

  /** Unregister a validator */
  unregister(id: string): boolean;
}

/**
 * Custom validation rule function
 */
export type CustomValidationRule = (
  context: UnifiedContext,
  config?: Record<string, any>
) => ValidationResult | Promise<ValidationResult>;

/**
 * Validation middleware for extending validation pipeline
 */
export interface ValidationMiddleware {
  /** Unique identifier */
  id: string;
  /** Process validation before main validation */
  preValidate?(context: ValidationContext): Promise<ValidationContext>;
  /** Process results after validation */
  postValidate?(
    context: ValidationContext,
    results: ValidationResult[]
  ): Promise<ValidationResult[]>;
}

/**
 * Configuration for the validation pipeline
 */
export interface ValidationPipelineConfig {
  /** Validation level to apply */
  level: ValidationLevel;
  /** Specific validators to include */
  validators?: string[];
  /** Specific validators to exclude */
  excludeValidators?: string[];
  /** Performance constraints */
  constraints?: ValidationPerformanceConstraints;
  /** Whether to stop on first critical error */
  haltOnCritical?: boolean;
  /** Whether to run validations in parallel */
  parallel?: boolean;
  /** Maximum number of parallel validations */
  maxParallel?: number;
  /** Middleware to apply */
  middleware?: ValidationMiddleware[];
  /** Custom validation rules */
  customRules?: Record<string, CustomValidationRule>;
}

/**
 * Event types for validation lifecycle
 */
export enum ValidationEventType {
  VALIDATION_STARTED = 'validation_started',
  VALIDATION_COMPLETED = 'validation_completed',
  VALIDATION_FAILED = 'validation_failed',
  RULE_EXECUTED = 'rule_executed',
  PERFORMANCE_WARNING = 'performance_warning'
}

/**
 * Validation event for monitoring and debugging
 */
export interface ValidationEvent {
  type: ValidationEventType;
  timestamp: Date;
  validatorId?: string;
  ruleId?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Validation event listener
 */
export type ValidationEventListener = (event: ValidationEvent) => void;

/**
 * Common validation error types
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationTimeoutError extends ValidationError {
  constructor(validatorId: string, timeout: number) {
    super(
      `Validation timeout: ${validatorId} exceeded ${timeout}ms`,
      'VALIDATION_TIMEOUT',
      { validatorId, timeout }
    );
    this.name = 'ValidationTimeoutError';
  }
}

export class ValidationSchemaError extends ValidationError {
  constructor(schemaError: string, path?: string) {
    super(
      `Schema validation failed: ${schemaError}`,
      'SCHEMA_VALIDATION_ERROR',
      { schemaError, path }
    );
    this.name = 'ValidationSchemaError';
  }
}