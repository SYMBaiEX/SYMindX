/**
 * Specific array type definitions to replace any[]
 * Provides type-safe alternatives for common array patterns
 */

/**
 * Array of extension configurations
 */
export type ExtensionConfigArray = Array<{
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}>;

/**
 * Array of portal configurations
 */
export type PortalConfigArray = Array<{
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  config?: Record<string, unknown>;
}>;

/**
 * Array of agent status information
 */
export type AgentStatusArray = Array<{
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastActive?: Date;
  metrics?: Record<string, number>;
}>;

/**
 * Array of decision criteria
 */
export type DecisionCriteriaArray = Array<{
  id: string;
  type: string;
  weight: number;
  evaluate: (context: unknown) => number;
}>;

/**
 * Array of decision options
 */
export type DecisionOptionsArray = Array<{
  id: string;
  label: string;
  value: unknown;
  metadata?: Record<string, unknown>;
}>;

/**
 * Array of enumeration values
 */
export type EnumValueArray = Array<string | number | boolean>;

/**
 * Array of content blocks for multimodal messages
 */
export type ContentBlockArray = Array<{
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  url?: string;
  mimeType?: string;
  data?: string | Buffer;
  metadata?: Record<string, unknown>;
}>;

/**
 * Array of memory records
 */
export type MemoryRecordArray = Array<{
  id: string;
  timestamp: Date;
  type: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}>;

/**
 * Array of validation examples
 */
export type ValidationExampleArray = Array<{
  input: unknown;
  expected: unknown;
  description?: string;
}>;

/**
 * Array of skill examples
 */
export type SkillExampleArray = Array<{
  query: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  description?: string;
}>;

/**
 * Array of permission entries
 */
export type PermissionArray = Array<{
  resource: string;
  action: string;
  allowed: boolean;
}>;

/**
 * Array of choice options
 */
export type ChoiceArray = Array<{
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}>;

/**
 * Generic typed array for unknown content
 * Use when the array content structure is not known at compile time
 */
export type TypedArray<T = unknown> = Array<T>;

/**
 * Array of mixed primitive values
 */
export type PrimitiveArray = Array<string | number | boolean | null>;

/**
 * Array of JSON-serializable values
 */
export type JSONArray = Array<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
>;
