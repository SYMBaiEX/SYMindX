/**
 * Runtime configuration types for better type safety
 */

/**
 * Configuration value that can be recursively processed
 */
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

/**
 * Processed environment variable replacement result
 */
export type ProcessedEnvironmentConfig = ConfigValue;

/**
 * Module configuration with better typing
 */
export interface ModuleConfig {
  memory?: {
    provider?: string;
    config?: Record<string, ConfigValue>;
  };
  emotion?: {
    type?: string;
    config?: Record<string, ConfigValue>;
  };
  cognition?: {
    type?: string;
    config?: Record<string, ConfigValue>;
  };
  portal?: {
    type?: string;
    config?: Record<string, ConfigValue>;
  };
  tools?: Record<string, ConfigValue>;
  [key: string]: ConfigValue;
}

/**
 * Character configuration with proper module typing
 */
export interface CharacterConfigWithModules {
  modules?: {
    tools?: Record<string, ConfigValue>;
    [key: string]: ConfigValue;
  };
  portals?: Array<{
    config?: Record<string, ConfigValue>;
    [key: string]: ConfigValue;
  }>;
  [key: string]: ConfigValue;
}
