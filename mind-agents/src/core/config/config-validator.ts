/**
 * Configuration Validator
 *
 * Provides comprehensive validation for configuration schemas with
 * built-in rules, custom validation functions, and detailed error reporting.
 */

import {
  ValidationRule,
  ValidationContext,
  ValidationError,
  SchemaDefinition,
  SchemaValidationResult,
  IValidator,
  ConfigValidatorOptions,
  ValidationRules,
} from '../../types/utils/validation.js';
import { standardLoggers } from '../../utils/standard-logging.js';

/**
 * Built-in validation rules
 */
export class BuiltInRules implements ValidationRules {
  string = {
    minLength: (min: number): ValidationRule<string> => ({
      name: 'minLength',
      description: `String must be at least ${min} characters long`,
      validate: (value: string) => value.length >= min,
      message: `Must be at least ${min} characters long`,
      severity: 'error' as const,
    }),

    maxLength: (max: number): ValidationRule<string> => ({
      name: 'maxLength',
      description: `String must be at most ${max} characters long`,
      validate: (value: string) => value.length <= max,
      message: `Must be at most ${max} characters long`,
      severity: 'error' as const,
    }),

    pattern: (pattern: string | RegExp): ValidationRule<string> => ({
      name: 'pattern',
      description: `String must match pattern: ${pattern}`,
      validate: (value: string) => {
        const regex =
          typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        return regex.test(value);
      },
      message: `Must match pattern: ${pattern}`,
      severity: 'error' as const,
    }),

    email: (): ValidationRule<string> => ({
      name: 'email',
      description: 'Must be a valid email address',
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Must be a valid email address',
      severity: 'error' as const,
    }),

    url: (): ValidationRule<string> => ({
      name: 'url',
      description: 'Must be a valid URL',
      validate: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Must be a valid URL',
      severity: 'error' as const,
    }),

    uuid: (): ValidationRule<string> => ({
      name: 'uuid',
      description: 'Must be a valid UUID',
      validate: (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        ),
      message: 'Must be a valid UUID',
      severity: 'error' as const,
    }),

    alphanumeric: (): ValidationRule<string> => ({
      name: 'alphanumeric',
      description: 'Must contain only letters and numbers',
      validate: (value: string) => /^[a-zA-Z0-9]+$/.test(value),
      message: 'Must contain only letters and numbers',
      severity: 'error' as const,
    }),
  };

  number = {
    min: (min: number): ValidationRule<number> => ({
      name: 'min',
      description: `Number must be at least ${min}`,
      validate: (value: number) => value >= min,
      message: `Must be at least ${min}`,
      severity: 'error' as const,
    }),

    max: (max: number): ValidationRule<number> => ({
      name: 'max',
      description: `Number must be at most ${max}`,
      validate: (value: number) => value <= max,
      message: `Must be at most ${max}`,
      severity: 'error' as const,
    }),

    integer: (): ValidationRule<number> => ({
      name: 'integer',
      description: 'Must be an integer',
      validate: (value: number) => Number.isInteger(value),
      message: 'Must be an integer',
      severity: 'error' as const,
    }),

    positive: (): ValidationRule<number> => ({
      name: 'positive',
      description: 'Must be a positive number',
      validate: (value: number) => value > 0,
      message: 'Must be a positive number',
      severity: 'error' as const,
    }),

    negative: (): ValidationRule<number> => ({
      name: 'negative',
      description: 'Must be a negative number',
      validate: (value: number) => value < 0,
      message: 'Must be a negative number',
      severity: 'error' as const,
    }),

    between: (min: number, max: number): ValidationRule<number> => ({
      name: 'between',
      description: `Must be between ${min} and ${max}`,
      validate: (value: number) => value >= min && value <= max,
      message: `Must be between ${min} and ${max}`,
      severity: 'error' as const,
    }),
  };

  array = {
    minLength: (min: number): ValidationRule<unknown[]> => ({
      name: 'minLength',
      description: `Array must have at least ${min} items`,
      validate: (value: unknown[]) => value.length >= min,
      message: `Must have at least ${min} items`,
      severity: 'error' as const,
    }),

    maxLength: (max: number): ValidationRule<unknown[]> => ({
      name: 'maxLength',
      description: `Array must have at most ${max} items`,
      validate: (value: unknown[]) => value.length <= max,
      message: `Must have at most ${max} items`,
      severity: 'error' as const,
    }),

    unique: (): ValidationRule<unknown[]> => ({
      name: 'unique',
      description: 'Array items must be unique',
      validate: (value: unknown[]) => {
        const seen = new Set();
        for (const item of value) {
          const key = typeof item === 'object' ? JSON.stringify(item) : item;
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      },
      message: 'Array items must be unique',
      severity: 'error' as const,
    }),

    contains: (searchValue: unknown): ValidationRule<unknown[]> => ({
      name: 'contains',
      description: `Array must contain ${searchValue}`,
      validate: (value: unknown[]) => value.includes(searchValue),
      message: `Must contain ${searchValue}`,
      severity: 'error' as const,
    }),
  };

  object = {
    hasKeys: (keys: string[]): ValidationRule<Record<string, unknown>> => ({
      name: 'hasKeys',
      description: `Object must have keys: ${keys.join(', ')}`,
      validate: (value: Record<string, unknown>) =>
        keys.every((key) => key in value),
      message: `Must have keys: ${keys.join(', ')}`,
      severity: 'error' as const,
    }),

    shape: (
      shape: Record<string, SchemaDefinition>
    ): ValidationRule<Record<string, unknown>> => ({
      name: 'shape',
      description: 'Object must match expected shape',
      validate: async (
        value: Record<string, unknown>,
        context?: ValidationContext
      ) => {
        const validator = new ConfigValidator();
        const result = await validator.validate(value, {
          type: 'object',
          properties: shape,
        });
        return result.valid;
      },
      message: 'Object shape validation failed',
      severity: 'error' as const,
    }),
  };

  common = {
    required: (): ValidationRule => ({
      name: 'required',
      description: 'Field is required',
      validate: (value: unknown) =>
        value !== undefined && value !== null && value !== '',
      message: 'Field is required',
      severity: 'error' as const,
    }),

    oneOf: (values: unknown[]): ValidationRule => ({
      name: 'oneOf',
      description: `Must be one of: ${values.join(', ')}`,
      validate: (value: unknown) => values.includes(value),
      message: `Must be one of: ${values.join(', ')}`,
      severity: 'error' as const,
    }),

    custom: (fn: (value: unknown) => boolean): ValidationRule => ({
      name: 'custom',
      description: 'Custom validation rule',
      validate: fn,
      message: 'Custom validation failed',
      severity: 'error' as const,
    }),
  };
}

/**
 * Configuration Validator
 *
 * Implements comprehensive validation with built-in rules,
 * custom validation functions, and detailed error reporting.
 */
export class ConfigValidator implements IValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private builtInRules: BuiltInRules;
  private logger = standardLoggers.config;

  constructor() {
    this.builtInRules = new BuiltInRules();
    this.registerBuiltInRules();
  }

  /**
   * Validate data against schema
   */
  public validate(
    data: unknown,
    schema: SchemaDefinition,
    context?: ValidationContext
  ): SchemaValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      this.validateValue(
        data,
        schema,
        context || { path: 'root', value: data },
        errors,
        warnings
      );

      const duration = Date.now() - startTime;
      const result: SchemaValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        data: this.transformValue(data, schema),
        duration,
      };

      this.logger.debug('Validation completed', {
        valid: result.valid,
        errors: errors.length,
        warnings: warnings.length,
        duration,
      });

      return result;
    } catch (error) {
      this.logger.error('Validation error', error);
      return {
        valid: false,
        errors: [
          {
            field: context?.path || 'root',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
            code: 'VALIDATION_ERROR',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate async with promises
   */
  public async validateAsync(
    data: unknown,
    schema: SchemaDefinition,
    context?: ValidationContext
  ): Promise<SchemaValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      await this.validateValueAsync(
        data,
        schema,
        context || { path: 'root', value: data },
        errors,
        warnings
      );

      const duration = Date.now() - startTime;
      const result: SchemaValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        data: this.transformValue(data, schema),
        duration,
      };

      return result;
    } catch (error) {
      this.logger.error('Async validation error', error);
      return {
        valid: false,
        errors: [
          {
            field: context?.path || 'root',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
            code: 'ASYNC_VALIDATION_ERROR',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Add custom validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
    this.logger.debug('Custom validation rule added', { name: rule.name });
  }

  /**
   * Remove validation rule
   */
  public removeRule(name: string): void {
    this.rules.delete(name);
    this.logger.debug('Validation rule removed', { name });
  }

  /**
   * Get all registered rules
   */
  public getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get built-in validation rules
   */
  public getBuiltInRules(): BuiltInRules {
    return this.builtInRules;
  }

  // Private validation methods

  private validateValue(
    value: unknown,
    schema: SchemaDefinition,
    context: ValidationContext,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Apply transformation if specified
    const transformedValue = this.transformValue(value, schema);

    // Check required field
    if (
      schema.required &&
      (transformedValue === undefined || transformedValue === null)
    ) {
      errors.push({
        field: context.path,
        message: 'Field is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: transformedValue,
      });
      return;
    }

    // Skip validation if value is undefined/null and not required
    if (transformedValue === undefined || transformedValue === null) {
      return;
    }

    // Type validation
    if (!this.validateType(transformedValue, schema.type)) {
      errors.push({
        field: context.path,
        message: `Expected type ${schema.type}, got ${typeof transformedValue}`,
        code: 'INVALID_TYPE',
        severity: 'error',
        value: transformedValue,
        expected: schema.type,
      });
      return;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(transformedValue)) {
      errors.push({
        field: context.path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        severity: 'error',
        value: transformedValue,
        expected: schema.enum,
      });
    }

    // Range validation for numbers
    if (typeof transformedValue === 'number') {
      if (schema.min !== undefined && transformedValue < schema.min) {
        errors.push({
          field: context.path,
          message: `Value must be at least ${schema.min}`,
          code: 'MIN_VALUE',
          severity: 'error',
          value: transformedValue,
          expected: `>= ${schema.min}`,
        });
      }

      if (schema.max !== undefined && transformedValue > schema.max) {
        errors.push({
          field: context.path,
          message: `Value must be at most ${schema.max}`,
          code: 'MAX_VALUE',
          severity: 'error',
          value: transformedValue,
          expected: `<= ${schema.max}`,
        });
      }
    }

    // String validation
    if (typeof transformedValue === 'string') {
      if (schema.min !== undefined && transformedValue.length < schema.min) {
        errors.push({
          field: context.path,
          message: `String must be at least ${schema.min} characters long`,
          code: 'MIN_LENGTH',
          severity: 'error',
          value: transformedValue,
        });
      }

      if (schema.max !== undefined && transformedValue.length > schema.max) {
        errors.push({
          field: context.path,
          message: `String must be at most ${schema.max} characters long`,
          code: 'MAX_LENGTH',
          severity: 'error',
          value: transformedValue,
        });
      }

      if (schema.pattern) {
        const regex =
          typeof schema.pattern === 'string'
            ? new RegExp(schema.pattern)
            : schema.pattern;
        if (!regex.test(transformedValue)) {
          errors.push({
            field: context.path,
            message: `String must match pattern: ${schema.pattern}`,
            code: 'PATTERN_MISMATCH',
            severity: 'error',
            value: transformedValue,
            expected: schema.pattern,
          });
        }
      }
    }

    // Array validation
    if (Array.isArray(transformedValue)) {
      if (schema.min !== undefined && transformedValue.length < schema.min) {
        errors.push({
          field: context.path,
          message: `Array must have at least ${schema.min} items`,
          code: 'MIN_ITEMS',
          severity: 'error',
          value: transformedValue.length,
        });
      }

      if (schema.max !== undefined && transformedValue.length > schema.max) {
        errors.push({
          field: context.path,
          message: `Array must have at most ${schema.max} items`,
          code: 'MAX_ITEMS',
          severity: 'error',
          value: transformedValue.length,
        });
      }

      // Validate array items
      if (schema.items) {
        transformedValue.forEach((item, index) => {
          const itemContext: ValidationContext = {
            ...context,
            path: `${context.path}[${index}]`,
            value: item,
            parent: transformedValue,
          };
          this.validateValue(
            item,
            schema.items!,
            itemContext,
            errors,
            warnings
          );
        });
      }
    }

    // Object validation
    if (
      typeof transformedValue === 'object' &&
      transformedValue !== null &&
      !Array.isArray(transformedValue)
    ) {
      if (schema.properties) {
        const obj = transformedValue as Record<string, unknown>;

        // Validate properties
        for (const [propName, propSchema] of Object.entries(
          schema.properties
        )) {
          const propValue = obj[propName];
          const propContext: ValidationContext = {
            ...context,
            path: `${context.path}.${propName}`,
            value: propValue,
            parent: obj,
            root: context.root || obj,
          };
          this.validateValue(
            propValue,
            propSchema,
            propContext,
            errors,
            warnings
          );
        }
      }
    }

    // Custom validation
    if (schema.validate) {
      const customResult = schema.validate(transformedValue, context);
      if (!customResult) {
        errors.push({
          field: context.path,
          message: 'Custom validation failed',
          code: 'CUSTOM_VALIDATION',
          severity: 'error',
          value: transformedValue,
        });
      } else if (Array.isArray(customResult)) {
        errors.push(...customResult);
      } else if (
        typeof customResult === 'object' &&
        'message' in customResult
      ) {
        errors.push(customResult);
      }
    }

    // Apply validation rules
    if (schema.rules) {
      for (const rule of schema.rules) {
        if (rule.skipIf && rule.skipIf(transformedValue, context)) {
          continue;
        }

        const isValid = rule.validate(transformedValue, context);
        if (!isValid) {
          const message =
            typeof rule.message === 'function'
              ? rule.message(transformedValue, context)
              : rule.message || `Validation rule '${rule.name}' failed`;

          const error: ValidationError = {
            field: context.path,
            message,
            code: rule.name.toUpperCase(),
            severity: rule.severity || 'error',
            value: transformedValue,
            rule: rule.name,
          };

          if (rule.severity === 'warning') {
            warnings.push(error);
          } else {
            errors.push(error);
          }
        }
      }
    }
  }

  private async validateValueAsync(
    value: unknown,
    schema: SchemaDefinition,
    context: ValidationContext,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<void> {
    // First run synchronous validation
    this.validateValue(value, schema, context, errors, warnings);

    // Then run async rules
    if (schema.rules) {
      for (const rule of schema.rules) {
        if (rule.skipIf && rule.skipIf(value, context)) {
          continue;
        }

        const isValid = await rule.validate(value, context);
        if (!isValid) {
          const message =
            typeof rule.message === 'function'
              ? rule.message(value, context)
              : rule.message || `Async validation rule '${rule.name}' failed`;

          const error: ValidationError = {
            field: context.path,
            message,
            code: rule.name.toUpperCase(),
            severity: rule.severity || 'error',
            value,
            rule: rule.name,
          };

          if (rule.severity === 'warning') {
            warnings.push(error);
          } else {
            errors.push(error);
          }
        }
      }
    }
  }

  private validateType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      case 'null':
        return value === null;
      case 'any':
        return true;
      default:
        return false;
    }
  }

  private transformValue(value: unknown, schema: SchemaDefinition): unknown {
    // Apply default value if value is undefined
    if (value === undefined && schema.default !== undefined) {
      return schema.default;
    }

    // Apply transformation function
    if (schema.transform) {
      return schema.transform(value);
    }

    return value;
  }

  private registerBuiltInRules(): void {
    // Register all built-in rules
    const ruleCategories = [
      this.builtInRules.string,
      this.builtInRules.number,
      this.builtInRules.array,
      this.builtInRules.object,
      this.builtInRules.common,
    ];

    for (const category of ruleCategories) {
      for (const ruleName of Object.keys(category)) {
        const ruleFactory = (category as any)[ruleName];
        if (typeof ruleFactory === 'function') {
          // Create a wrapper rule that applies the factory
          this.rules.set(ruleName, {
            name: ruleName,
            validate: () => true, // Placeholder
            message: `Built-in rule: ${ruleName}`,
          });
        }
      }
    }
  }
}
