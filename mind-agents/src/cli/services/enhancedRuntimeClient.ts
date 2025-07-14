/**
 * Enhanced Runtime API Client
 *
 * Provides an improved client interface with better error handling,
 * connection monitoring, request/response interceptors, and caching.
 */

import { EventEmitter } from 'events';

import {
  RuntimeClientConfig,
  AgentInfo,
  SystemMetrics,
  RuntimeStatus,
  RuntimeCapabilities,
  ActivityEvent,
} from './runtimeClient.js';

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnectedAt: Date | null;
  lastError: Error | null;
  latency: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: any): any | Promise<any>;
}

export interface ErrorInterceptor {
  (error: Error): Error | Promise<Error>;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  skipCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface EnhancedClientConfig extends RuntimeClientConfig {
  maxRetries?: number;
  retryStrategy?: 'exponential' | 'linear' | 'fixed';
  cacheEnabled?: boolean;
  cacheTTL?: number;
  connectionCheckInterval?: number;
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedResponses: number;
  averageLatency: number;
  requestsPerMinute: number;
}

export class EnhancedRuntimeClient extends EventEmitter {
  public config: EnhancedClientConfig;
  private connectionStatus: ConnectionStatus;
  private cache: Map<string, CacheEntry<any>>;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorInterceptors: ErrorInterceptor[];
  private abortControllers: Map<string, AbortController>;
  private metrics: RequestMetrics;
  private connectionCheckTimer?: NodeJS.Timeout;
  private latencyHistory: number[];
  private requestTimestamps: number[];

  constructor(config: Partial<EnhancedClientConfig> = {}) {
    super();

    this.config = {
      apiUrl: process.env.SYMINDX_API_URL || 'http://localhost:8000',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetries: 5,
      retryStrategy: 'exponential',
      cacheEnabled: true,
      cacheTTL: 60000, // 1 minute default
      connectionCheckInterval: 10000, // 10 seconds
      enableMetrics: true,
      enableLogging: process.env.NODE_ENV !== 'production',
      ...config,
    };

    this.connectionStatus = {
      status: 'disconnected',
      lastConnectedAt: null,
      lastError: null,
      latency: 0,
      reconnectAttempts: 0,
      reconnectDelay: 1000,
    };

    this.cache = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    this.abortControllers = new Map();
    this.latencyHistory = [];
    this.requestTimestamps = [];

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      averageLatency: 0,
      requestsPerMinute: 0,
    };

    this.setupDefaultInterceptors();
    this.startConnectionMonitoring();
  }

  /**
   * Setup default interceptors
   */
  private setupDefaultInterceptors() {
    // Request logging interceptor
    if (this.config.enableLogging) {
      this.addRequestInterceptor((config) => {
        console.debug(`[API Request] ${config.method} ${config.url}`);
        return config;
      });
    }

    // Response latency tracking
    this.addResponseInterceptor((response) => {
      if (response._latency) {
        this.updateLatency(response._latency);
      }
      return response;
    });

    // Error logging interceptor
    if (this.config.enableLogging) {
      this.addErrorInterceptor((error) => {
        console.error(`[API Error] ${error.message}`);
        return error;
      });
    }
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring() {
    if (
      this.config.connectionCheckInterval &&
      this.config.connectionCheckInterval > 0
    ) {
      this.connectionCheckTimer = setInterval(() => {
        this.checkConnection();
      }, this.config.connectionCheckInterval);
    }

    // Initial connection check
    this.checkConnection();
  }

  /**
   * Stop connection monitoring
   */
  private stopConnectionMonitoring() {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
      delete this.connectionCheckTimer;
    }
  }

  /**
   * Check connection status
   */
  public async checkConnection() {
    const previousStatus = this.connectionStatus.status;

    try {
      const startTime = Date.now();
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/health`,
        method: 'GET',
        headers: {},
        timeout: 2000,
        retries: 0,
        skipCache: true,
      });

      const latency = Date.now() - startTime;

      if (response.status === 'healthy') {
        this.updateConnectionStatus({
          status: 'connected',
          lastConnectedAt: new Date(),
          lastError: null,
          latency,
          reconnectAttempts: 0,
          reconnectDelay: 1000,
        });

        if (previousStatus !== 'connected') {
          this.emit('connected', { latency });
        }
      } else {
        throw new Error('Unhealthy status');
      }
    } catch (error) {
      this.updateConnectionStatus({
        status: 'error',
        lastError: error as Error,
        reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
      });

      if (previousStatus === 'connected') {
        this.emit('disconnected', { error });
      }

      // Schedule reconnection
      this.scheduleReconnection();
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>) {
    this.connectionStatus = {
      ...this.connectionStatus,
      ...updates,
    };

    this.emit('statusChanged', this.connectionStatus);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection() {
    const { reconnectAttempts, reconnectDelay } = this.connectionStatus;

    if (reconnectAttempts >= this.config.maxRetries!) {
      this.updateConnectionStatus({ status: 'disconnected' });
      this.emit('maxRetriesReached', { attempts: reconnectAttempts });
      return;
    }

    let nextDelay = reconnectDelay;

    if (this.config.retryStrategy === 'exponential') {
      nextDelay = Math.min(reconnectDelay * 2, 30000); // Max 30 seconds
    } else if (this.config.retryStrategy === 'linear') {
      nextDelay = reconnectDelay + 1000;
    }

    this.updateConnectionStatus({
      status: 'connecting',
      reconnectDelay: nextDelay,
    });

    setTimeout(() => {
      this.checkConnection();
    }, nextDelay);
  }

  /**
   * Update latency metrics
   */
  private updateLatency(latency: number) {
    this.latencyHistory.push(latency);

    // Keep only last 100 latency measurements
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    const avgLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) /
      this.latencyHistory.length;
    this.metrics.averageLatency = Math.round(avgLatency);

    this.emit('latencyUpdate', { current: latency, average: avgLatency });
  }

  /**
   * Update request metrics
   */
  private updateRequestMetrics(success: boolean, cached: boolean = false) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (cached) {
      this.metrics.cachedResponses++;
    }

    // Track requests per minute
    const now = Date.now();
    this.requestTimestamps.push(now);

    // Remove timestamps older than 1 minute
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    );

    this.metrics.requestsPerMinute = this.requestTimestamps.length;

    this.emit('metricsUpdate', this.metrics);
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(config: RequestConfig): string {
    if (config.cacheKey) {
      return config.cacheKey;
    }

    const method = config.method || 'GET';
    const url = config.url;
    const body = config.body ? JSON.stringify(config.body) : '';

    return `${method}:${url}:${body}`;
  }

  /**
   * Get cached response
   */
  private getCachedResponse(key: string): any | null {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.updateRequestMetrics(true, true);
    return entry.data;
  }

  /**
   * Set cached response
   */
  private setCachedResponse(key: string, data: any, ttl?: number) {
    if (!this.config.cacheEnabled) {
      return;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL!,
    });

    // Cleanup old cache entries
    this.cleanupCache();
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache() {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Make HTTP request with enhanced features
   */
  private async makeRequest(config: RequestConfig): Promise<any> {
    // Apply request interceptors
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    // Check cache
    if (!finalConfig.skipCache && finalConfig.method === 'GET') {
      const cacheKey = this.getCacheKey(finalConfig);
      const cachedResponse = this.getCachedResponse(cacheKey);

      if (cachedResponse !== null) {
        return cachedResponse;
      }
    }

    // Create abort controller
    const abortController = new AbortController();
    const requestId = `${Date.now()}-${Math.random()}`;
    this.abortControllers.set(requestId, abortController);

    const startTime = Date.now();
    let retries = 0;
    const maxRetries = finalConfig.retries ?? this.config.retryAttempts;

    while (retries <= maxRetries) {
      try {
        const timeoutId = setTimeout(
          () => abortController.abort(),
          finalConfig.timeout || this.config.timeout
        );

        const fetchOptions: RequestInit = {
          method: finalConfig.method,
          headers: finalConfig.headers,
          signal: abortController.signal,
          ...(finalConfig.body && { body: JSON.stringify(finalConfig.body) }),
        };

        const response = await fetch(finalConfig.url, fetchOptions);

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data = await response.json();
        data._latency = latency;

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          data = await interceptor(data);
        }

        // Cache successful GET responses
        if (finalConfig.method === 'GET' && !finalConfig.skipCache) {
          const cacheKey = this.getCacheKey(finalConfig);
          this.setCachedResponse(cacheKey, data, finalConfig.cacheTTL);
        }

        this.updateRequestMetrics(true);
        this.abortControllers.delete(requestId);

        return data;
      } catch (error) {
        retries++;

        if (retries > maxRetries) {
          // Apply error interceptors
          let finalError = error as Error;
          for (const interceptor of this.errorInterceptors) {
            finalError = await interceptor(finalError);
          }

          this.updateRequestMetrics(false);
          this.abortControllers.delete(requestId);

          throw finalError;
        }

        // Calculate retry delay
        let delay = this.config.retryDelay;
        if (this.config.retryStrategy === 'exponential') {
          delay = delay * Math.pow(2, retries - 1);
        } else if (this.config.retryStrategy === 'linear') {
          delay = delay * retries;
        }

        if (this.config.enableLogging) {
          console.debug(
            `[Retry ${retries}/${maxRetries}] Waiting ${delay}ms...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Public API methods
   */
  async getAgents(): Promise<AgentInfo[]> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/agents`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: 'agents',
        cacheTTL: 5000, // 5 seconds cache
      });

      return response.agents || [];
    } catch (error) {
      this.emit('error', { operation: 'getAgents', error });
      return [];
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/api/metrics`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: 'metrics',
        cacheTTL: 2000, // 2 seconds cache
      });

      return response;
    } catch (error) {
      this.emit('error', { operation: 'getSystemMetrics', error });
      return {
        uptime: 0,
        memory: { heapUsed: 0, heapTotal: 0 },
        activeAgents: 0,
        totalAgents: 0,
        commandsProcessed: 0,
        portalRequests: 0,
      };
    }
  }

  async getRuntimeStatus(): Promise<RuntimeStatus> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/status`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: 'status',
        cacheTTL: 3000, // 3 seconds cache
      });

      return response;
    } catch (error) {
      this.emit('error', { operation: 'getRuntimeStatus', error });
      return {
        agent: { id: 'unknown', status: 'unknown', uptime: 0 },
        extensions: { loaded: 0, active: 0 },
        memory: { used: 0, total: 0 },
        runtime: { agents: 0, isRunning: false, eventBus: { events: 0 } },
      };
    }
  }

  async getRuntimeCapabilities(): Promise<RuntimeCapabilities | null> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/capabilities`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: 'capabilities',
        cacheTTL: 60000, // 1 minute cache
      });

      return response;
    } catch (error) {
      // Fallback to constructed response
      const status = await this.getRuntimeStatus();
      const agents = await this.getAgents();

      return {
        runtime: {
          version: '1.0.0',
          isRunning: status.runtime.isRunning,
          tickInterval: 1000,
        },
        agents: {
          active: agents.filter((a) => a.status === 'active').length,
          lazy: 0,
          total: agents.length,
          activeList: agents
            .filter((a) => a.status === 'active')
            .map((a) => a.id),
        },
        modules: {
          memory: { available: ['sqlite', 'postgres', 'supabase', 'neon'] },
          emotion: {
            available: [
              'composite',
              'happy',
              'sad',
              'angry',
              'anxious',
              'confident',
              'neutral',
            ],
          },
          cognition: { available: ['htn_planner', 'reactive', 'hybrid'] },
          portals: {
            available: [
              'openai',
              'anthropic',
              'groq',
              'xai',
              'google-generative',
              'ollama',
            ],
            factories: ['openai', 'anthropic', 'groq'],
          },
        },
        extensions: {
          loaded: ['api', 'telegram', 'slack'],
        },
      };
    }
  }

  async getRecentEvents(limit: number = 20): Promise<ActivityEvent[]> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/events?limit=${limit}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: `events-${limit}`,
        cacheTTL: 1000, // 1 second cache
      });

      return response.events || [];
    } catch (error) {
      // Fallback to simulated events
      const status = await this.getRuntimeStatus();
      const agents = await this.getAgents();

      const events: ActivityEvent[] = [];
      const now = new Date();

      agents.forEach((agent) => {
        if (agent.status === 'active') {
          events.push({
            timestamp: now.toLocaleTimeString(),
            type: 'agent_active',
            source: agent.id,
            data: { agentName: agent.name },
          });
        }
      });

      if (status.runtime.isRunning) {
        events.push({
          timestamp: now.toLocaleTimeString(),
          type: 'runtime_status',
          source: 'system',
          data: { status: 'running', agents: status.runtime.agents },
        });
      }

      return events.slice(0, limit);
    }
  }

  async getAgent(agentId: string): Promise<any> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/api/agent/${agentId}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cacheKey: `agent-${agentId}`,
        cacheTTL: 10000, // 10 seconds cache
      });

      return response;
    } catch (error) {
      this.emit('error', { operation: 'getAgent', error, agentId });
      return null;
    }
  }

  async startAgent(agentId: string): Promise<boolean> {
    try {
      await this.makeRequest({
        url: `${this.config.apiUrl}/api/agents/${agentId}/start`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        skipCache: true,
      });

      // Invalidate related caches
      this.invalidateCache(['agents', 'status', `agent-${agentId}`]);

      return true;
    } catch (error) {
      this.emit('error', { operation: 'startAgent', error, agentId });
      return false;
    }
  }

  async stopAgent(agentId: string): Promise<boolean> {
    try {
      await this.makeRequest({
        url: `${this.config.apiUrl}/api/agents/${agentId}/stop`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        skipCache: true,
      });

      // Invalidate related caches
      this.invalidateCache(['agents', 'status', `agent-${agentId}`]);

      return true;
    } catch (error) {
      this.emit('error', { operation: 'stopAgent', error, agentId });
      return false;
    }
  }

  async sendChatMessage(agentId: string, message: string): Promise<any> {
    try {
      const response = await this.makeRequest({
        url: `${this.config.apiUrl}/api/conversations`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          agentId,
          userId: 'cli_user',
          title: `CLI Chat`,
        },
        skipCache: true,
      });

      if (response.conversation) {
        const chatResponse = await this.makeRequest({
          url: `${this.config.apiUrl}/api/conversations/${response.conversation.id}/messages`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { message, userId: 'cli_user' },
          skipCache: true,
        });

        return chatResponse;
      }

      return null;
    } catch (error) {
      this.emit('error', { operation: 'sendChatMessage', error, agentId });
      return null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(keys?: string[]) {
    if (keys) {
      keys.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    for (const [_id, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Destroy client and cleanup resources
   */
  destroy() {
    this.stopConnectionMonitoring();
    this.cancelAllRequests();
    this.cache.clear();
    this.removeAllListeners();
  }
}

/**
 * Create enhanced runtime client instance
 */
export function createEnhancedRuntimeClient(
  config?: Partial<EnhancedClientConfig>
): EnhancedRuntimeClient {
  return new EnhancedRuntimeClient(config);
}

/**
 * Default enhanced runtime client instance
 */
export const enhancedRuntimeClient = createEnhancedRuntimeClient();
