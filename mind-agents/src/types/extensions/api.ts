/**
 * API Extension Type Definitions
 * Provides strongly-typed interfaces for HTTP REST API and WebSocket functionality
 */

import type { Request, Response, NextFunction } from 'express';
import type { WebSocket } from 'ws';

import type { Agent, EmotionState } from '../agent';
import type { SkillParameters } from '../common';

/**
 * Generic API request wrapper with typed payload
 */
export interface APIRequest<T = any> {
  /** Unique request ID for tracking */
  id?: string;
  /** Request timestamp */
  timestamp?: string;
  /** Request payload data */
  data: T;
  /** Request metadata */
  metadata?: Record<string, any>;
  /** Authentication token if required */
  auth?: {
    type: 'bearer' | 'apikey' | 'basic';
    credentials: string;
  };
}

/**
 * Generic API response wrapper with typed payload
 */
export interface APIResponse<T = any> {
  /** Response success status */
  success: boolean;
  /** Response payload data */
  data?: T;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Response timestamp */
  timestamp: string;
  /** Response metadata */
  metadata?: {
    processingTime?: number;
    version?: string;
    requestId?: string;
  };
}

/**
 * WebSocket message structure for bidirectional communication
 */
export interface WebSocketMessage<T = any> {
  /** Message type identifier */
  type:
    | 'ping'
    | 'pong'
    | 'chat'
    | 'action'
    | 'event'
    | 'subscribe'
    | 'unsubscribe'
    | 'error';
  /** Message payload */
  data?: T;
  /** Alternative message field for compatibility */
  message?: string;
  /** Target agent ID for routing */
  agentId?: string;
  /** Event name for event messages */
  event?: string;
  /** Subscription topics */
  topics?: string[];
  /** Message ID for tracking */
  id?: string;
  /** Timestamp */
  timestamp?: string;
}

/**
 * Session data for maintaining state across requests
 */
export interface SessionData {
  /** Unique session ID */
  id: string;
  /** User ID associated with session */
  userId: string;
  /** Agent ID for the session */
  agentId?: string;
  /** Session creation time */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Session metadata */
  metadata: {
    /** Client IP address */
    ip?: string;
    /** User agent string */
    userAgent?: string;
    /** Session source */
    source: 'http' | 'websocket';
    /** Custom session data */
    custom?: Record<string, any>;
  };
  /** Session state data */
  state?: {
    /** Current conversation ID */
    conversationId?: string;
    /** Session preferences */
    preferences?: Record<string, any>;
    /** Session flags */
    flags?: string[];
  };
}

/**
 * Express middleware context with typed extensions
 */
export interface MiddlewareContext extends Request {
  /** Session data if authenticated */
  session?: SessionData;
  /** Authenticated user information */
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  /** Request context */
  context: {
    /** Request ID for tracking */
    requestId: string;
    /** Request start time */
    startTime: number;
    /** Client information */
    client: {
      ip: string;
      userAgent?: string;
    };
  };
  /** Agent instance if available */
  agent?: Agent;
}

/**
 * Express route handler with proper typing
 */
export type RouteHandler<TReq = any, TRes = any> = (
  req: MiddlewareContext & {
    body: TReq;
    params: Record<string, string>;
    query: Record<string, string>;
  },
  res: Response<APIResponse<TRes>>,
  next: NextFunction
) => Promise<void> | void;

/**
 * WebSocket connection handler
 */
export type WebSocketHandler = (
  ws: WebSocket,
  req: Request,
  connectionId: string
) => void;

/**
 * API endpoint configuration
 */
export interface APIEndpoint {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Endpoint path */
  path: string;
  /** Endpoint description */
  description?: string;
  /** Route handler */
  handler: RouteHandler;
  /** Middleware to apply */
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  /** Rate limiting config */
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  /** Authentication required */
  auth?: boolean;
  /** Required permissions */
  permissions?: string[];
}

/**
 * API error types
 */
export enum APIErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * API error class
 */
export class APIError extends Error {
  constructor(
    public code: APIErrorCode,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Chat request payload
 */
export interface ChatRequestPayload {
  /** Message content */
  message: string;
  /** Target agent ID */
  agentId?: string;
  /** Conversation context */
  context?: {
    conversationId?: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Chat response payload
 */
export interface ChatResponsePayload {
  /** Agent's response */
  response: string;
  /** Response timestamp */
  timestamp: string;
  /** Session ID if applicable */
  sessionId?: string;
  /** Response metadata */
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    memoryRetrieved?: boolean;
    emotionState?: EmotionState | string;
    confidence?: number;
  };
}

/**
 * Action execution request
 */
export interface ActionRequestPayload {
  /** Action name */
  action: string;
  /** Action parameters */
  parameters?: SkillParameters;
  /** Execute asynchronously */
  async?: boolean;
  /** Execution priority */
  priority?: number;
}

/**
 * Action execution response
 */
export interface ActionResponsePayload {
  /** Execution success */
  success: boolean;
  /** Action ID for tracking */
  actionId?: string;
  /** Execution result */
  result?: any;
  /** Error if failed */
  error?: string;
  /** Execution time in ms */
  executionTime: number;
}

/**
 * Agent status response
 */
export interface AgentStatusPayload {
  /** Agent ID */
  id: string;
  /** Agent name */
  name: string;
  /** Current status */
  status: string;
  /** Current emotion */
  emotion?: string | EmotionState;
  /** Last update timestamp */
  lastUpdate?: Date;
  /** Extension count */
  extensionCount?: number;
  /** Has portal configured */
  hasPortal?: boolean;
  /** Ethics enabled */
  ethicsEnabled?: boolean;
  /** Additional capabilities */
  capabilities?: string[];
  /** Personality type */
  personality?: string;
}

/**
 * System metrics response
 */
export interface SystemMetricsPayload {
  /** System uptime in ms */
  uptime: number;
  /** Memory usage */
  memory: {
    used: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  /** Active agents count */
  activeAgents: number;
  /** Total agents count */
  totalAgents: number;
  /** Commands processed */
  commandsProcessed: number;
  /** Portal requests made */
  portalRequests: number;
  /** Runtime information */
  runtime?: {
    isRunning: boolean;
    agents: number;
    autonomousAgents: number;
  };
}

/**
 * Multi-agent spawn request
 */
export interface SpawnAgentPayload {
  /** Character ID to spawn from */
  characterId: string;
  /** Instance name override */
  instanceName?: string;
  /** Agent configuration override */
  config?: Record<string, any>;
  /** Agent priority */
  priority?: number;
  /** Auto start agent */
  autoStart?: boolean;
}

/**
 * Multi-agent route request
 */
export interface RouteConversationPayload {
  /** Message to route */
  message?: string;
  /** Routing requirements */
  requirements?: {
    specialties?: string[];
    capabilities?: string[];
    personality?: string;
    loadThreshold?: number;
  };
  /** User ID */
  userId?: string;
  /** Existing conversation ID */
  conversationId?: string;
}

/**
 * Broadcast message request
 */
export interface BroadcastMessagePayload {
  /** Message to broadcast */
  message: string;
  /** Target agent IDs */
  agentIds: string[];
  /** User ID */
  userId?: string;
  /** Broadcast title */
  title?: string;
}

/**
 * Conversation transfer request
 */
export interface TransferConversationPayload {
  /** Transfer reason */
  reason?: string;
  /** User initiating transfer */
  userId?: string;
}

/**
 * Type guards for API payloads
 */
export const isAPIRequest = <T>(obj: any): obj is APIRequest<T> => {
  return obj && typeof obj === 'object' && 'data' in obj;
};

export const isWebSocketMessage = (obj: any): obj is WebSocketMessage => {
  return obj && typeof obj === 'object' && 'type' in obj;
};

export const isChatRequest = (obj: any): obj is ChatRequestPayload => {
  return obj && typeof obj === 'object' && typeof obj.message === 'string';
};

export const isActionRequest = (obj: any): obj is ActionRequestPayload => {
  return obj && typeof obj === 'object' && typeof obj.action === 'string';
};
