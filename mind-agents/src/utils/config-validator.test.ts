/**
 * @module config-validator.test
 * @description Configuration Validator Tests - Comprehensive test suite for the configuration validation system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { ConfigValidator } from './config-validator.js';

describe('ConfigValidator', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear all relevant environment variables
    const keysToDelete = [
      'GROQ_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'OLLAMA_BASE_URL',
      'ENABLE_OPENAI_EMBEDDINGS',
      'EMBEDDING_PROVIDER',
      'EMBEDDING_DIMENSIONS',
      'GROQ_ENABLED',
      'OPENAI_ENABLED',
      'ANTHROPIC_ENABLED',
      'OLLAMA_ENABLED',
    ];

    keysToDelete.forEach((key) => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironmentConfig', () => {
    it('should create valid configuration with defaults when no environment variables are set', () => {
      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(false); // Should be false because no AI providers are configured
      expect(result.config.OLLAMA_BASE_URL).toBe('http://localhost:11434');
      expect(result.config.ENABLE_OPENAI_EMBEDDINGS).toBe(true);
      expect(result.config.EMBEDDING_PROVIDER).toBe('openai');
      expect(result.config.EMBEDDING_DIMENSIONS).toBe(3072);
    });

    it('should include valid API keys when provided', () => {
      process.env.GROQ_API_KEY =
        'gsk_test_key_1234567890123456789012345678901234';
      process.env.OPENAI_API_KEY =
        'sk-test_key_1234567890123456789012345678901234';
      process.env.GROQ_ENABLED = 'true';
      process.env.OPENAI_ENABLED = 'true';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(true);
      expect(result.config.apiKeys.GROQ_API_KEY).toBe(
        'gsk_test_key_1234567890123456789012345678901234'
      );
      expect(result.config.apiKeys.OPENAI_API_KEY).toBe(
        'sk-test_key_1234567890123456789012345678901234'
      );
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid API key formats', () => {
      process.env.GROQ_API_KEY = 'invalid_key';
      process.env.OPENAI_API_KEY = 'also_invalid';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.warnings).toContain('Invalid format for GROQ_API_KEY');
      expect(result.warnings).toContain('Invalid format for OPENAI_API_KEY');
      expect(result.config.apiKeys.GROQ_API_KEY).toBeUndefined();
      expect(result.config.apiKeys.OPENAI_API_KEY).toBeUndefined();
    });

    it('should handle boolean environment variables correctly', () => {
      process.env.ENABLE_OPENAI_EMBEDDINGS = 'false';
      process.env.GROQ_ENABLED = 'true';
      process.env.OPENAI_ENABLED = '1';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.ENABLE_OPENAI_EMBEDDINGS).toBe(false);
      expect(result.config.portalSettings.GROQ_ENABLED).toBe(true);
      expect(result.config.portalSettings.OPENAI_ENABLED).toBe(true);
    });

    it('should validate positive integer values', () => {
      process.env.EMBEDDING_DIMENSIONS = '1536';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.EMBEDDING_DIMENSIONS).toBe(1536);
    });

    it('should handle invalid integer values gracefully', () => {
      process.env.EMBEDDING_DIMENSIONS = '-100';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.EMBEDDING_DIMENSIONS).toBe(3072); // Should use default
    });

    it('should validate embedding provider values', () => {
      process.env.EMBEDDING_PROVIDER = 'ollama';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.EMBEDDING_PROVIDER).toBe('ollama');
    });

    it('should handle invalid embedding provider values', () => {
      process.env.EMBEDDING_PROVIDER = 'invalid_provider';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.EMBEDDING_PROVIDER).toBe('openai'); // Should use default
    });

    it('should validate Ollama URL format', () => {
      process.env.OLLAMA_BASE_URL = 'not_a_url';
      process.env.OLLAMA_ENABLED = 'true';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Ollama base URL format');
    });

    it('should validate telegram bot token format', () => {
      process.env.TELEGRAM_BOT_TOKEN =
        '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghX';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.apiKeys.TELEGRAM_BOT_TOKEN).toBe(
        '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghX'
      );
    });

    it('should reject invalid telegram bot token format', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'invalid_token_format';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.warnings).toContain(
        'Invalid format for TELEGRAM_BOT_TOKEN'
      );
      expect(result.config.apiKeys.TELEGRAM_BOT_TOKEN).toBeUndefined();
    });

    it('should require at least one AI provider', () => {
      // No AI providers configured
      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'At least one AI provider must be configured with valid API key'
      );
    });

    it('should pass validation with Ollama enabled', () => {
      process.env.OLLAMA_ENABLED = 'true';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(true);
      expect(result.config.portalSettings.OLLAMA_ENABLED).toBe(true);
    });

    it('should validate OpenAI embeddings configuration', () => {
      process.env.ENABLE_OPENAI_EMBEDDINGS = 'true';
      process.env.EMBEDDING_PROVIDER = 'openai';
      // Missing OPENAI_API_KEY

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'OpenAI API key required when using OpenAI embeddings'
      );
    });

    it('should handle portal capability settings correctly', () => {
      process.env.GROQ_API_KEY =
        'gsk_test_key_1234567890123456789012345678901234';
      process.env.GROQ_ENABLED = 'true';
      process.env.GROQ_CHAT_ENABLED = 'true';
      process.env.GROQ_EMBEDDING_ENABLED = 'false';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.portalSettings.GROQ_ENABLED).toBe(true);
      expect(result.config.portalSettings.GROQ_CHAT_ENABLED).toBe(true);
      expect(result.config.portalSettings.GROQ_EMBEDDING_ENABLED).toBe(false);
    });

    it('should include portal models when configured', () => {
      process.env.GROQ_CHAT_MODEL = 'llama-3.1-70b-versatile';
      process.env.OPENAI_CHAT_MODEL = 'gpt-4.1-mini';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.config.portalModels.GROQ_CHAT_MODEL).toBe(
        'llama-3.1-70b-versatile'
      );
      expect(result.config.portalModels.OPENAI_CHAT_MODEL).toBe('gpt-4.1-mini');
    });

    it('should provide comprehensive error and warning information', () => {
      process.env.GROQ_API_KEY = 'invalid';
      process.env.OLLAMA_BASE_URL = 'not_a_url';
      process.env.ENABLE_OPENAI_EMBEDDINGS = 'true';
      process.env.EMBEDDING_PROVIDER = 'openai';
      process.env.OLLAMA_ENABLED = 'true';

      const result = ConfigValidator.validateEnvironmentConfig();

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
