/**
 * Environment Variable Configuration Manager
 * Provides secure configuration management using environment variables
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface SecurityConfig {
  enableAuth: boolean;
  enableHttps: boolean;
  jwtSecret: string;
  allowedOrigins: string[];
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, string> = new Map();

  private constructor() {
    this.loadEnvironmentVariables();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadEnvironmentVariables(): void {
    // Load from process.env
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.config.set(key, value);
      }
    }

    // Try to load from .env file if it exists
    try {
      const envPath = join(process.cwd(), '.env');
      const envContent = readFileSync(envPath, 'utf-8');
      
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            this.config.set(key.trim(), value);
          }
        }
      }
    } catch (error) {
      // .env file doesn't exist or can't be read, continue with process.env only
    }
  }

  public get(key: string, defaultValue?: string): string | undefined {
    return this.config.get(key) ?? defaultValue;
  }

  public getRequired(key: string): string {
    const value = this.config.get(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  public getBoolean(key: string, defaultValue = false): boolean {
    const value = this.config.get(key);
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  public getNumber(key: string, defaultValue?: number): number {
    const value = this.config.get(key);
    if (!value) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Environment variable ${key} is not set`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
    }
    return parsed;
  }

  public getArray(key: string, separator = ',', defaultValue: string[] = []): string[] {
    const value = this.config.get(key);
    if (!value) return defaultValue;
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }

  public getSecurityConfig(): SecurityConfig {
    return {
      enableAuth: this.getBoolean('ENABLE_AUTH', true),
      enableHttps: this.getBoolean('ENABLE_HTTPS', false),
      jwtSecret: this.get('JWT_SECRET') || this.generateJwtSecret(),
      allowedOrigins: this.getArray('ALLOWED_ORIGINS', ',', ['http://localhost:3000']),
      rateLimiting: {
        enabled: this.getBoolean('RATE_LIMITING_ENABLED', true),
        windowMs: this.getNumber('RATE_LIMITING_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
        maxRequests: this.getNumber('RATE_LIMITING_MAX_REQUESTS', 100),
      },
    };
  }

  private generateJwtSecret(): string {
    // Generate a random JWT secret if none is provided
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.warn('⚠️  No JWT_SECRET provided, using generated secret. Set JWT_SECRET environment variable for production.');
    return result;
  }

  public validateConfiguration(): void {
    const securityConfig = this.getSecurityConfig();
    
    if (securityConfig.enableAuth && securityConfig.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }

    if (securityConfig.rateLimiting.enabled) {
      if (securityConfig.rateLimiting.windowMs < 1000) {
        throw new Error('Rate limiting window must be at least 1000ms');
      }
      if (securityConfig.rateLimiting.maxRequests < 1) {
        throw new Error('Rate limiting max requests must be at least 1');
      }
    }
  }
}

export const configManager = ConfigManager.getInstance();