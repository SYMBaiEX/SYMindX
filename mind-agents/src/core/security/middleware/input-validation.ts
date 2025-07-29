/**
 * Input Validation Middleware
 * Comprehensive input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import sqlstring from 'sqlstring';

export interface ValidationConfig {
  stripUnknown: boolean;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
  sanitizeHtml: boolean;
  preventSqlInjection: boolean;
  customSanitizers: Record<string, (value: any) => any>;
}

export interface ValidationRule {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

export class InputValidator {
  private readonly config: ValidationConfig;
  private readonly commonPatterns = {
    sqlInjection: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)\b)/gi,
    xss: /<script[^>]*>.*?<\/script>/gi,
    pathTraversal: /\.\.[\/\\]/g,
    nullByte: /\0/g
  };

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      stripUnknown: config.stripUnknown !== false,
      maxStringLength: config.maxStringLength || 10000,
      maxArrayLength: config.maxArrayLength || 1000,
      maxObjectDepth: config.maxObjectDepth || 10,
      sanitizeHtml: config.sanitizeHtml !== false,
      preventSqlInjection: config.preventSqlInjection !== false,
      customSanitizers: config.customSanitizers || {}
    };
  }

  /**
   * Create validation middleware
   */
  validate(rules: ValidationRule) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate each part of the request
        if (rules.body) {
          req.body = await this.validateAndSanitize(req.body, rules.body, 'body');
        }

        if (rules.query) {
          req.query = await this.validateAndSanitize(req.query, rules.query, 'query');
        }

        if (rules.params) {
          req.params = await this.validateAndSanitize(req.params, rules.params, 'params');
        }

        if (rules.headers) {
          const validatedHeaders = await this.validateAndSanitize(
            req.headers,
            rules.headers,
            'headers'
          );
          // Only update validated headers
          Object.assign(req.headers, validatedHeaders);
        }

        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: this.formatZodError(error)
          });
        }

        console.error('Validation error:', error);
        res.status(500).json({
          error: 'Internal validation error',
          code: 'VALIDATION_INTERNAL_ERROR'
        });
      }
    };
  }

  /**
   * Validate and sanitize data
   */
  private async validateAndSanitize(
    data: any,
    schema: ZodSchema,
    location: string
  ): Promise<any> {
    // Deep sanitize before validation
    const sanitized = this.deepSanitize(data);

    // Validate with Zod
    const validated = await schema.parseAsync(sanitized);

    // Additional security checks
    this.performSecurityChecks(validated, location);

    return validated;
  }

  /**
   * Deep sanitize object
   */
  private deepSanitize(obj: any, depth: number = 0): any {
    if (depth > this.config.maxObjectDepth) {
      throw new Error('Maximum object depth exceeded');
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitives
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj);
    }

    if (typeof obj === 'boolean') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length > this.config.maxArrayLength) {
        throw new Error(`Array length exceeds maximum of ${this.config.maxArrayLength}`);
      }
      return obj.map(item => this.deepSanitize(item, depth + 1));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.deepSanitize(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return String(str);
    }

    // Length check
    if (str.length > this.config.maxStringLength) {
      str = str.substring(0, this.config.maxStringLength);
    }

    // Remove null bytes
    str = str.replace(this.commonPatterns.nullByte, '');

    // Sanitize HTML if enabled
    if (this.config.sanitizeHtml) {
      str = DOMPurify.sanitize(str, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }

    // Basic XSS prevention
    str = str.replace(/[<>]/g, (match) => {
      return match === '<' ? '&lt;' : '&gt;';
    });

    return str.trim();
  }

  /**
   * Sanitize number value
   */
  private sanitizeNumber(num: number): number {
    if (!Number.isFinite(num)) {
      throw new Error('Invalid number: must be finite');
    }

    // Prevent extremely large numbers
    const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;
    const MIN_SAFE_NUMBER = Number.MIN_SAFE_INTEGER;

    if (num > MAX_SAFE_NUMBER || num < MIN_SAFE_NUMBER) {
      throw new Error('Number out of safe range');
    }

    return num;
  }

  /**
   * Perform additional security checks
   */
  private performSecurityChecks(data: any, location: string): void {
    const stringData = JSON.stringify(data);

    // Check for SQL injection patterns
    if (this.config.preventSqlInjection && this.commonPatterns.sqlInjection.test(stringData)) {
      // Log potential SQL injection attempt
      console.warn(`Potential SQL injection attempt in ${location}:`, data);
      
      // Don't reject, but escape SQL strings
      this.escapeSqlStrings(data);
    }

    // Check for path traversal
    if (this.commonPatterns.pathTraversal.test(stringData)) {
      throw new Error('Path traversal attempt detected');
    }
  }

  /**
   * Escape SQL strings recursively
   */
  private escapeSqlStrings(obj: any): any {
    if (typeof obj === 'string') {
      return sqlstring.escape(obj).slice(1, -1); // Remove quotes added by sqlstring
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.escapeSqlStrings(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.escapeSqlStrings(value);
      }
    }

    return obj;
  }

  /**
   * Format Zod error for response
   */
  private formatZodError(error: ZodError): any[] {
    return error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    // ID validation
    id: z.string().uuid(),
    
    // Email validation
    email: z.string().email().max(255),
    
    // Username validation
    username: z.string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    
    // Password validation
    password: z.string()
      .min(8)
      .max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'Password must contain uppercase, lowercase, number, and special character'),
    
    // Pagination
    pagination: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('asc')
    }),
    
    // Date range
    dateRange: z.object({
      from: z.coerce.date(),
      to: z.coerce.date()
    }).refine(data => data.from <= data.to, {
      message: 'From date must be before or equal to date'
    }),
    
    // Safe filename
    filename: z.string()
      .max(255)
      .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid filename characters'),
    
    // URL validation
    url: z.string().url().max(2048),
    
    // JSON validation
    json: z.string().transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid JSON'
        });
        return z.NEVER;
      }
    })
  };
}