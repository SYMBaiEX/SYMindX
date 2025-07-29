/**
 * ConfigurationManager.ts - Configuration loading and validation
 * 
 * This module handles:
 * - Configuration file loading
 * - Environment variable processing
 * - Configuration validation
 * - API key management
 * - Character configuration loading
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  RuntimeConfig,
  AgentConfig,
  ModuleConfig,
  ExtensionConfig,
  PortalConfig,
} from '../../types/index';
import { CharacterConfig } from '../../types/character';
import {
  ConfigValue,
  ProcessedEnvironmentConfig,
  CharacterConfigWithModules,
} from '../../types/runtime-config';
import { configResolver } from '../../utils/config-resolver';
import { createConfigurationError } from '../../utils/standard-errors';
import { standardLoggers } from '../../utils/standard-logging';

export class ConfigurationManager {
  private logger = standardLoggers.runtime;
  private config: RuntimeConfig;
  private apiKeys: Record<string, string> = {};
  private characterApiKeys: Record<string, string> = {};

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  /**
   * Load all configuration files and API keys
   */
  async loadConfiguration(): Promise<void> {
    this.logger.start('Loading configuration...');

    try {
      // Load API keys
      await this.loadApiKeys();
      await this.loadCharacterApiKeys();

      // Process environment variables in config
      this.processConfigEnvironmentVariables();

      this.logger.info('Configuration loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load configuration', { error });
      throw error;
    }
  }

  /**
   * Load character configurations
   */
  async loadCharacters(): Promise<CharacterConfig[]> {
    const characters: CharacterConfig[] = [];
    
    if (!this.config.charactersPath) {
      this.logger.warn('No characters path configured');
      return characters;
    }

    this.logger.start('Loading character configurations...');

    try {
      const charactersPath = path.resolve(this.config.charactersPath);
      const files = await fs.readdir(charactersPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(charactersPath, file);
        const characterConfig = await this.loadCharacterFile(filePath);
        
        if (characterConfig) {
          characters.push(characterConfig);
        }
      }

      this.logger.info(`Loaded ${characters.length} character configurations`);
      return characters;
    } catch (error) {
      this.logger.error('Error loading characters', { error });
      return characters;
    }
  }

  /**
   * Load a single character configuration file
   */
  async loadCharacterFile(filePath: string): Promise<CharacterConfig | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as CharacterConfig;

      // Validate character config
      if (!config.id || !config.name) {
        this.logger.warn(`Invalid character config in ${filePath}: missing id or name`);
        return null;
      }

      // Process environment variables in character config
      this.processCharacterEnvironmentVariables(config);

      this.logger.debug(`Loaded character: ${config.name} (${config.id})`);
      return config;
    } catch (error) {
      this.logger.error(`Failed to load character file: ${filePath}`, { error });
      return null;
    }
  }

  /**
   * Get processed configuration
   */
  getConfig(): RuntimeConfig {
    return this.config;
  }

  /**
   * Get API keys
   */
  getApiKeys(): Record<string, string> {
    return { ...this.apiKeys };
  }

  /**
   * Get character-specific API keys
   */
  getCharacterApiKeys(): Record<string, string> {
    return { ...this.characterApiKeys };
  }

  /**
   * Validate module configuration
   */
  validateModuleConfig(moduleType: string, config: ModuleConfig): boolean {
    try {
      switch (moduleType) {
        case 'memory':
          return this.validateMemoryConfig(config);
        case 'emotion':
          return this.validateEmotionConfig(config);
        case 'cognition':
          return this.validateCognitionConfig(config);
        default:
          this.logger.warn(`Unknown module type for validation: ${moduleType}`);
          return true;
      }
    } catch (error) {
      this.logger.error(`Module config validation failed for ${moduleType}`, { error });
      return false;
    }
  }

  /**
   * Process environment variables in configuration
   */
  private processConfigEnvironmentVariables(): void {
    // Process main config
    this.config = this.processEnvironmentVariables(this.config) as RuntimeConfig;

    // Process extensions config
    if (this.config.extensions) {
      for (const [key, value] of Object.entries(this.config.extensions)) {
        this.config.extensions[key] = this.processEnvironmentVariables(value) as ExtensionConfig;
      }
    }

    // Process portals config
    if (this.config.portals) {
      for (const [key, value] of Object.entries(this.config.portals)) {
        this.config.portals[key] = this.processEnvironmentVariables(value) as PortalConfig;
      }
    }
  }

  /**
   * Process environment variables in character configuration
   */
  private processCharacterEnvironmentVariables(config: CharacterConfig): void {
    // Process portal API keys
    if (config.portals) {
      for (const portal of config.portals) {
        if (portal.apiKey && portal.apiKey.startsWith('${') && portal.apiKey.endsWith('}')) {
          const envVar = portal.apiKey.slice(2, -1);
          portal.apiKey = process.env[envVar] || portal.apiKey;
        }
      }
    }

    // Process extension configurations
    if (config.extensions) {
      Object.keys(config.extensions).forEach(key => {
        config.extensions[key] = this.processEnvironmentVariables(
          config.extensions[key]
        ) as ProcessedEnvironmentConfig;
      });
    }
  }

  /**
   * Process environment variables in any configuration object
   */
  private processEnvironmentVariables(obj: ConfigValue): ProcessedEnvironmentConfig {
    if (typeof obj === 'string') {
      // Check if string is an environment variable reference
      if (obj.startsWith('${') && obj.endsWith('}')) {
        const envVar = obj.slice(2, -1);
        return process.env[envVar] || obj;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processEnvironmentVariables(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const processed: Record<string, ProcessedEnvironmentConfig> = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processEnvironmentVariables(value);
      }
      return processed;
    }

    return obj;
  }

  /**
   * Load API keys from environment
   */
  private async loadApiKeys(): Promise<void> {
    const apiKeyPatterns = [
      'GROQ_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'XAI_API_KEY',
      'GOOGLE_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_ENDPOINT',
      'VERTEX_AI_PROJECT',
      'VERTEX_AI_LOCATION',
    ];

    for (const key of apiKeyPatterns) {
      if (process.env[key]) {
        this.apiKeys[key] = process.env[key]!;
      }
    }

    this.logger.debug(`Loaded ${Object.keys(this.apiKeys).length} API keys from environment`);
  }

  /**
   * Load character-specific API keys
   */
  private async loadCharacterApiKeys(): Promise<void> {
    // Look for character-specific API keys in environment
    // Format: CHARACTER_[ID]_[PROVIDER]_API_KEY
    const env = process.env;
    const characterKeyPattern = /^CHARACTER_(.+)_(.+)_API_KEY$/;

    for (const [key, value] of Object.entries(env)) {
      const match = key.match(characterKeyPattern);
      if (match && value) {
        const [, characterId, provider] = match;
        const keyName = `${characterId}_${provider}`;
        this.characterApiKeys[keyName] = value;
      }
    }

    if (Object.keys(this.characterApiKeys).length > 0) {
      this.logger.debug(
        `Loaded ${Object.keys(this.characterApiKeys).length} character-specific API keys`
      );
    }
  }

  /**
   * Validate memory configuration
   */
  private validateMemoryConfig(config: ModuleConfig): boolean {
    if (!config.provider) {
      this.logger.error('Memory config missing provider');
      return false;
    }

    // Validate provider-specific settings
    switch (config.provider) {
      case 'sqlite':
        if (!config.settings?.dbPath) {
          this.logger.error('SQLite memory config missing dbPath');
          return false;
        }
        break;
      case 'postgres':
      case 'neon':
        if (!config.settings?.connectionString) {
          this.logger.error(`${config.provider} memory config missing connectionString`);
          return false;
        }
        break;
      case 'supabase':
        if (!config.settings?.url || !config.settings?.anonKey) {
          this.logger.error('Supabase memory config missing url or anonKey');
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Validate emotion configuration
   */
  private validateEmotionConfig(config: ModuleConfig): boolean {
    if (!config.type) {
      this.logger.error('Emotion config missing type');
      return false;
    }

    // Composite emotion should have enabled emotions list
    if (config.type === 'composite' && !config.settings?.enabledEmotions) {
      this.logger.warn('Composite emotion config missing enabledEmotions, using defaults');
    }

    return true;
  }

  /**
   * Validate cognition configuration
   */
  private validateCognitionConfig(config: ModuleConfig): boolean {
    if (!config.type) {
      this.logger.error('Cognition config missing type');
      return false;
    }

    // Validate specific cognition types
    switch (config.type) {
      case 'htn_planner':
        // HTN planner specific validation
        break;
      case 'reactive':
        // Reactive cognition specific validation
        break;
      case 'hybrid':
        // Hybrid cognition specific validation
        break;
    }

    return true;
  }

  /**
   * Check if a character configuration is clean (no user-specific data)
   */
  isCleanCharacterConfig(config: Record<string, unknown>): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /token/i,
      /password/i,
      /credential/i,
      /private/i,
    ];

    const checkValue = (value: unknown): boolean => {
      if (typeof value === 'string') {
        // Check if it's an environment variable reference (which is OK)
        if (value.startsWith('${') && value.endsWith('}')) {
          return true;
        }
        // Check if it contains actual sensitive data
        return !sensitivePatterns.some(pattern => pattern.test(value));
      }

      if (Array.isArray(value)) {
        return value.every(item => checkValue(item));
      }

      if (typeof value === 'object' && value !== null) {
        return Object.entries(value).every(([key, val]) => {
          // Check key name
          if (sensitivePatterns.some(pattern => pattern.test(key))) {
            // If the value is an env var reference, it's OK
            if (typeof val === 'string' && val.startsWith('${') && val.endsWith('}')) {
              return true;
            }
            return false;
          }
          // Recursively check value
          return checkValue(val);
        });
      }

      return true;
    };

    return checkValue(config);
  }
}