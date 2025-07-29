/**
 * API Versioning Types
 * 
 * Provides type-safe API versioning support with backward compatibility
 */

export type APIVersion = 'v1' | 'v2' | 'v3';

export interface APIVersionInfo {
  version: APIVersion;
  deprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  releaseDate: Date;
  supportedUntil?: Date;
  migrationGuide?: string;
  changelog?: string;
}

export interface VersionedAPIEndpoint<V extends APIVersion = 'v1'> {
  version: V;
  path: string;
  method: HTTPMethod;
  requestSchema?: APISchema;
  responseSchema?: APISchema;
  deprecated?: boolean;
  replacedBy?: {
    version: APIVersion;
    path: string;
  };
  description?: string;
  tags?: string[];
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface APISchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, APISchema>;
  items?: APISchema;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  example?: unknown;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  documentation?: string;
  version: APIVersion;
}

export interface APIResponse<T = unknown, V extends APIVersion = 'v1'> {
  version: V;
  data?: T;
  error?: APIError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
    version: V;
    deprecationWarning?: string;
  };
}

export interface APIRequest<T = unknown, V extends APIVersion = 'v1'> {
  version: V;
  data: T;
  metadata?: {
    clientVersion?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

// Version-specific types
export interface V1AgentData {
  id: string;
  name: string;
  status: string;
  lastUpdate: Date;
}

export interface V2AgentData {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'disabled';
  lastUpdate: Date;
  metrics?: {
    responseTime?: number;
    requestCount?: number;
    errorCount?: number;
  };
}

export interface V3AgentData {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'thinking' | 'paused' | 'error' | 'disabled';
  lastUpdate: Date;
  metrics: {
    responseTime: number;
    requestCount: number;
    errorCount: number;
    uptime: number;
  };
  capabilities?: string[];
  configuration?: {
    memory?: string;
    emotion?: string;
    cognition?: string;
  };
}

// Type helpers for version selection
export type AgentDataForVersion<V extends APIVersion> = 
  V extends 'v1' ? V1AgentData :
  V extends 'v2' ? V2AgentData :
  V extends 'v3' ? V3AgentData :
  never;

export type ResponseForVersion<T, V extends APIVersion> = APIResponse<T, V>;

// Migration utilities
export interface APIMigrationRule<From extends APIVersion, To extends APIVersion> {
  from: From;
  to: To;
  transform: (data: AgentDataForVersion<From>) => AgentDataForVersion<To>;
  reversible?: boolean;
  reverseTransform?: (data: AgentDataForVersion<To>) => AgentDataForVersion<From>;
}

// Compatibility matrix
export interface APICompatibilityMatrix {
  supportedVersions: APIVersion[];
  defaultVersion: APIVersion;
  migrations: {
    [K in APIVersion]?: {
      [T in APIVersion]?: APIMigrationRule<K, T>;
    };
  };
}

// Runtime version detection
export function isAPIVersion(version: string): version is APIVersion {
  return ['v1', 'v2', 'v3'].includes(version);
}

export function getLatestVersion(): APIVersion {
  return 'v3';
}

export function isVersionSupported(version: APIVersion): boolean {
  const supportedVersions: APIVersion[] = ['v1', 'v2', 'v3'];
  return supportedVersions.includes(version);
}

export function isVersionDeprecated(version: APIVersion): boolean {
  const deprecatedVersions: APIVersion[] = [];
  return deprecatedVersions.includes(version);
}

// Type guards for version-specific data
export function isV1AgentData(data: unknown): data is V1AgentData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'status' in data &&
    'lastUpdate' in data &&
    !('metrics' in data)
  );
}

export function isV2AgentData(data: unknown): data is V2AgentData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'status' in data &&
    'lastUpdate' in data &&
    ('metrics' in data || true) && // metrics is optional in v2
    !('capabilities' in data)
  );
}

export function isV3AgentData(data: unknown): data is V3AgentData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'status' in data &&
    'lastUpdate' in data &&
    'metrics' in data &&
    typeof (data as any).metrics === 'object'
  );
}