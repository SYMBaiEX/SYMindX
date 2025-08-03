/**
 * Input Validation and Sanitization
 * Provides security-focused input validation and sanitization
 */

import DOMPurify from 'isomorphic-dompurify';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid';
  allowedValues?: string[];
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: unknown;
}

export class InputValidator {
  private static instance: InputValidator;

  private constructor() {}

  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  public validate(value: unknown, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Check required
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push('Field is required');
      return { isValid: false, errors };
    }

    // Skip further validation if value is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors: [], sanitizedValue: value };
    }

    // Type validation and conversion
    if (rules.type) {
      const typeResult = this.validateType(value, rules.type);
      if (!typeResult.isValid) {
        errors.push(...typeResult.errors);
      } else {
        sanitizedValue = typeResult.sanitizedValue;
      }
    }

    // String-specific validations
    if (typeof sanitizedValue === 'string') {
      // Length validation
      if (rules.minLength !== undefined && sanitizedValue.length < rules.minLength) {
        errors.push(`Minimum length is ${rules.minLength}`);
      }
      if (rules.maxLength !== undefined && sanitizedValue.length > rules.maxLength) {
        errors.push(`Maximum length is ${rules.maxLength}`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        errors.push('Invalid format');
      }

      // Allowed values
      if (rules.allowedValues && !rules.allowedValues.includes(sanitizedValue)) {
        errors.push(`Value must be one of: ${rules.allowedValues.join(', ')}`);
      }

      // Sanitization
      if (rules.sanitize) {
        sanitizedValue = this.sanitizeString(sanitizedValue);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  public validateObject(obj: Record<string, unknown>, schema: Record<string, ValidationRule>): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedObject: Record<string, unknown>;
  } {
    const errors: Record<string, string[]> = {};
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, rules] of Object.entries(schema)) {
      const result = this.validate(obj[key], rules);
      if (!result.isValid) {
        errors[key] = result.errors;
      }
      sanitizedObject[key] = result.sanitizedValue;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedObject,
    };
  }

  private validateType(value: unknown, type: string): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          sanitizedValue = String(value);
        }
        break;

      case 'number':
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            errors.push('Must be a valid number');
          } else {
            sanitizedValue = parsed;
          }
        } else if (typeof value !== 'number') {
          errors.push('Must be a number');
        }
        break;

      case 'boolean':
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') {
            sanitizedValue = true;
          } else if (lower === 'false' || lower === '0') {
            sanitizedValue = false;
          } else {
            errors.push('Must be a valid boolean');
          }
        } else if (typeof value !== 'boolean') {
          errors.push('Must be a boolean');
        }
        break;

      case 'email':
        if (typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push('Must be a valid email address');
          }
        } else {
          errors.push('Must be a string');
        }
        break;

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            errors.push('Must be a valid URL');
          }
        } else {
          errors.push('Must be a string');
        }
        break;

      case 'uuid':
        if (typeof value === 'string') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            errors.push('Must be a valid UUID');
          }
        } else {
          errors.push('Must be a string');
        }
        break;

      default:
        errors.push(`Unknown type: ${type}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  public sanitizeString(input: string): string {
    // Remove potential XSS attacks
    let sanitized = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/['";\\]/g, '');

    // Remove potential command injection patterns
    sanitized = sanitized.replace(/[`$(){}[\]|&;]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  public sanitizeHtml(input: string, allowedTags: string[] = []): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'title', 'alt'],
    });
  }

  public isValidAgentId(id: string): boolean {
    // Agent IDs should be alphanumeric with hyphens and underscores
    const agentIdRegex = /^[a-zA-Z0-9_-]+$/;
    return agentIdRegex.test(id) && id.length >= 3 && id.length <= 50;
  }

  public isValidApiKey(key: string): boolean {
    // API keys should be at least 20 characters and contain only safe characters
    return key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key);
  }

  public preventPathTraversal(path: string): string {
    // Remove path traversal attempts
    return path.replace(/\.\./g, '').replace(/[/\\]/g, '');
  }
}

export const inputValidator = InputValidator.getInstance();