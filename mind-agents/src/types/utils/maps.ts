/**
 * Specific mapped type definitions to replace Record<string, any>
 * Provides type-safe alternatives for common object patterns
 */

/**
 * Map of emotion states to color values
 */
export type EmotionColorMap = Record<
  string,
  {
    hex: string;
    rgb: [number, number, number];
    name: string;
  }
>;

/**
 * Map of extension actions
 */
export type ExtensionActionMap = Record<
  string,
  {
    handler: (...args: unknown[]) => unknown | Promise<unknown>;
    description?: string;
    parameters?: Record<string, unknown>;
  }
>;

/**
 * Map of object attributes with mixed values
 */
export type AttributeMap = Record<string, string | number | boolean | null>;

/**
 * Map of model settings
 */
export type ModelSettingsMap = Record<
  string,
  {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    [key: string]: unknown;
  }
>;

/**
 * Map of AI SDK parameters
 */
export type AISDKParameterMap = Record<
  string,
  {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    value: unknown;
    required?: boolean;
    description?: string;
  }
>;

/**
 * Map of tool function properties
 */
export type ToolPropertiesMap = Record<
  string,
  {
    type: string;
    description?: string;
    required?: boolean;
    enum?: unknown[];
    default?: unknown;
  }
>;

/**
 * Map of function arguments
 */
export type FunctionArgsMap = Record<string, unknown>;

/**
 * Map of tool responses
 */
export type ToolResponseMap = Record<
  string,
  {
    success: boolean;
    result?: unknown;
    error?: string;
  }
>;

/**
 * Map of registry configurations
 */
export type RegistryConfigMap = Record<
  string,
  {
    enabled: boolean;
    provider: string;
    config?: Record<string, unknown>;
  }
>;

/**
 * Map of agent statistics
 */
export type AgentStatsMap = Record<
  string,
  {
    messagesProcessed?: number;
    activeTime?: number;
    lastActive?: Date;
    errors?: number;
    [metric: string]: number | Date | undefined;
  }
>;

/**
 * Map of action priorities
 */
export type ActionPriorityMap = Record<
  string,
  {
    priority: number;
    weight?: number;
    description?: string;
  }
>;

/**
 * Map of language model usage statistics
 */
export type UsageStatsMap = Record<
  string,
  | number
  | {
      count: number;
      total: number;
      average: number;
    }
>;

/**
 * Map of configuration options
 */
export type ConfigOptionsMap = Record<
  string,
  {
    value: unknown;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default?: unknown;
    required?: boolean;
    validation?: (value: unknown) => boolean;
  }
>;

/**
 * Generic typed map for unknown content
 * Use when the map value structure is not known at compile time
 */
export type TypedMap<T = unknown> = Record<string, T>;

/**
 * Map of JSON-serializable values
 */
export type JSONMap = Record<
  string,
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
>;
