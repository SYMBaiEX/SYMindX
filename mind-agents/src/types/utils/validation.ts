/**
 * Validation type definitions for SYMindX
 * Provides type-safe validation rules and error handling
 */

/**
 * Validation rule interface with generic type support
 */
export interface ValidationRule<T = unknown> {
  /** Rule name for identification */
  name: string;
  /** Rule description for documentation */
  description?: string;
  /** Validation function that returns true if valid */
  validate(value: T, context?: ValidationContext): boolean | Promise<boolean>;
  /** Custom error message or message function */
  message?: string | ((value: T, context?: ValidationContext) => string);
  /** Rule severity (error, warning, info) */
  severity?: 'error' | 'warning' | 'info';
  /** Skip rule if condition is met */
  skipIf?: (value: T, context?: ValidationContext) => boolean;
}

/**
 * Validation context providing additional information
 */
export interface ValidationContext {
  /** Current field path (e.g., "user.email") */
  path: string;
  /** Current value being validated */
  value: unknown;
  /** Parent object containing the field */
  parent?: Record<string, unknown>;
  /** Root object being validated */
  root?: Record<string, unknown>;
  /** Additional context data */
  data?: Record<string, unknown>;
  /** Previous validation errors */
  errors?: ValidationError[];
  /** Field dependencies */
  dependencies?: string[];
}

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  /** Field path where error occurred */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Actual value that failed validation */
  value?: unknown;
  /** Expected value or constraint */
  expected?: unknown;
  /** Rule that failed */
  rule?: string;
  /** Error severity */
  severity?: 'error' | 'warning' | 'info';
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Schema definition for configuration validation
 */
export interface SchemaDefinition {
  /** Schema type identifier */
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'any';
  /** Field is required */
  required?: boolean;
  /** Default value if not provided */
  default?: unknown;
  /** Field description */
  description?: string;
  /** Validation rules to apply */
  rules?: ValidationRule[];
  /** Nested properties for object type */
  properties?: Record<string, SchemaDefinition>;
  /** Array item schema */
  items?: SchemaDefinition;
  /** Allowed values (enum) */
  enum?: unknown[];
  /** Minimum value/length */
  min?: number;
  /** Maximum value/length */
  max?: number;
  /** Regular expression pattern for strings */
  pattern?: string | RegExp;
  /** Custom validation function */
  validate?: (
    value: unknown,
    context?: ValidationContext
  ) => boolean | ValidationError | ValidationError[];
  /** Transform value before validation */
  transform?: (value: unknown) => unknown;
  /** Conditional schema based on other fields */
  when?: {
    field: string;
    is: unknown;
    then: Partial<SchemaDefinition>;
    otherwise?: Partial<SchemaDefinition>;
  };
}

/**
 * Schema validation result with errors and warnings
 */
export interface SchemaValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings: ValidationError[];
  /** Validated and transformed data */
  data?: unknown;
  /** Validation duration in milliseconds */
  duration?: number;
}

/**
 * Validator interface for schema validation
 */
export interface IValidator {
  /** Validate data against schema */
  validate(
    data: unknown,
    schema: SchemaDefinition,
    context?: ValidationContext
  ): SchemaValidationResult;
  /** Validate async with promises */
  validateAsync(
    data: unknown,
    schema: SchemaDefinition,
    context?: ValidationContext
  ): Promise<SchemaValidationResult>;
  /** Add custom validation rule */
  addRule(rule: ValidationRule): void;
  /** Remove validation rule */
  removeRule(name: string): void;
  /** Get all registered rules */
  getRules(): ValidationRule[];
}

/**
 * Built-in validation rule types
 */
export interface ValidationRules {
  /** String validation rules */
  string: {
    minLength(min: number): ValidationRule<string>;
    maxLength(max: number): ValidationRule<string>;
    pattern(pattern: string | RegExp): ValidationRule<string>;
    email(): ValidationRule<string>;
    url(): ValidationRule<string>;
    uuid(): ValidationRule<string>;
    alphanumeric(): ValidationRule<string>;
  };
  /** Number validation rules */
  number: {
    min(min: number): ValidationRule<number>;
    max(max: number): ValidationRule<number>;
    integer(): ValidationRule<number>;
    positive(): ValidationRule<number>;
    negative(): ValidationRule<number>;
    between(min: number, max: number): ValidationRule<number>;
  };
  /** Array validation rules */
  array: {
    minLength(min: number): ValidationRule<unknown[]>;
    maxLength(max: number): ValidationRule<unknown[]>;
    unique(): ValidationRule<unknown[]>;
    contains(value: unknown): ValidationRule<unknown[]>;
  };
  /** Object validation rules */
  object: {
    hasKeys(keys: string[]): ValidationRule<Record<string, unknown>>;
    shape(
      shape: Record<string, SchemaDefinition>
    ): ValidationRule<Record<string, unknown>>;
  };
  /** Common validation rules */
  common: {
    required(): ValidationRule;
    oneOf(values: unknown[]): ValidationRule;
    custom(fn: (value: unknown) => boolean): ValidationRule;
  };
}

/**
 * Configuration validator options
 */
export interface ConfigValidatorOptions {
  /** Allow unknown properties */
  allowUnknown?: boolean;
  /** Strip unknown properties */
  stripUnknown?: boolean;
  /** Abort on first error */
  abortEarly?: boolean;
  /** Convert types automatically */
  convert?: boolean;
  /** Custom error messages */
  messages?: Record<string, string>;
  /** Default values for missing fields */
  defaults?: Record<string, unknown>;
}

/**
 * Field validator builder interface
 */
export interface FieldValidator<T = unknown> {
  /** Make field required */
  required(message?: string): FieldValidator<T>;
  /** Make field optional */
  optional(): FieldValidator<T>;
  /** Set default value */
  default(value: T): FieldValidator<T>;
  /** Add validation rule */
  rule(rule: ValidationRule<T>): FieldValidator<T>;
  /** Add custom validation */
  custom(fn: (value: T) => boolean, message?: string): FieldValidator<T>;
  /** Transform value */
  transform(fn: (value: unknown) => T): FieldValidator<T>;
  /** Build schema definition */
  build(): SchemaDefinition;
}

/**
 * Schema builder interface for fluent API
 */
export interface SchemaBuilder {
  /** Define string field */
  string(name: string): FieldValidator<string>;
  /** Define number field */
  number(name: string): FieldValidator<number>;
  /** Define boolean field */
  boolean(name: string): FieldValidator<boolean>;
  /** Define array field */
  array(name: string): FieldValidator<unknown[]>;
  /** Define object field */
  object(name: string): FieldValidator<Record<string, unknown>>;
  /** Define any field */
  any(name: string): FieldValidator<unknown>;
  /** Build complete schema */
  build(): Record<string, SchemaDefinition>;
}

/**
 * Validation middleware for request handling
 */
export interface ValidationMiddleware {
  /** Validate request body */
  body(
    schema: SchemaDefinition
  ): (req: unknown, res: unknown, next: () => void) => void;
  /** Validate query parameters */
  query(
    schema: SchemaDefinition
  ): (req: unknown, res: unknown, next: () => void) => void;
  /** Validate route parameters */
  params(
    schema: SchemaDefinition
  ): (req: unknown, res: unknown, next: () => void) => void;
}
