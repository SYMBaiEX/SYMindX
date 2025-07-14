/**
 * Runtime API Client
 *
 * Provides a client interface to communicate with the SYMindX runtime system.
 * Handles API calls, error handling, and connection management.
 */

export interface RuntimeClientConfig {
  apiUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  emotion?: string;
  lastUpdate?: string;
  extensionCount: number;
  hasPortal: boolean;
  ethicsEnabled: boolean;
}

export interface SystemMetrics {
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
  };
  activeAgents: number;
  totalAgents: number;
  commandsProcessed: number;
  portalRequests: number;
  runtime?: any;
}

export interface RuntimeStatus {
  agent: {
    id: string;
    status: string;
    uptime: number;
  };
  extensions: {
    loaded: number;
    active: number;
  };
  memory: {
    used: number;
    total: number;
  };
  runtime: {
    agents: number;
    isRunning: boolean;
    eventBus: { events: number };
  };
}

export interface RuntimeCapabilities {
  runtime: {
    version: string;
    isRunning: boolean;
    tickInterval: number;
  };
  agents: {
    active: number;
    lazy: number;
    total: number;
    activeList: string[];
  };
  modules: {
    memory: { available: string[] };
    emotion: { available: string[] };
    cognition: { available: string[] };
    portals: {
      available: string[];
      factories: string[];
    };
  };
  extensions: {
    loaded: string[];
  };
}

export interface ActivityEvent {
  timestamp: string;
  type: string;
  source?: string;
  data?: any;
}

export class RuntimeClient {
  private config: RuntimeClientConfig;
  private isConnected: boolean = false;
  private lastError: string | null = null;
  private connectionAttempts: number = 0;
  private lastHealthCheck: Date | null = null;
  private healthCheckCache: boolean | null = null;
  private healthCheckCacheDuration: number = 5000; // 5 seconds
  private requestsInFlight: Map<string, AbortController> = new Map();
  private retryBackoff: Map<string, number> = new Map();

  constructor(config: Partial<RuntimeClientConfig> = {}) {
    this.config = {
      apiUrl: process.env.SYMINDX_API_URL || 'http://localhost:8000',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Check if the runtime is available with caching
   */
  async isRuntimeAvailable(forceCheck: boolean = false): Promise<boolean> {
    // Use cached result if available and not forcing
    if (!forceCheck && this.lastHealthCheck && this.healthCheckCache !== null) {
      const elapsed = Date.now() - this.lastHealthCheck.getTime();
      if (elapsed < this.healthCheckCacheDuration) {
        return this.healthCheckCache;
      }
    }

    try {
      const response = await this.makeRequest('/health', 'GET', undefined, {
        skipRetry: true, // Health checks should be fast
        timeout: 2000, // Shorter timeout for health checks
      });
      this.isConnected = response.status === 'healthy';
      this.lastError = null;
      this.connectionAttempts = 0;
      this.healthCheckCache = this.isConnected;
      this.lastHealthCheck = new Date();
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.connectionAttempts++;
      this.healthCheckCache = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  /**
   * Get all agents with enhanced error handling
   */
  async getAgents(): Promise<AgentInfo[]> {
    try {
      const response = await this.makeRequest('/agents');
      return response.agents || [];
    } catch (error) {
      // Log detailed error for debugging
      if (this.connectionAttempts > 2) {
        console.error('Failed to fetch agents after multiple attempts:', error);
      } else {
        console.warn('Failed to fetch agents:', error);
      }

      // Return empty array to prevent UI crashes
      return [];
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await this.makeRequest('/api/metrics');
      return response;
    } catch (error) {
      console.warn('Failed to fetch system metrics:', error);
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

  /**
   * Get runtime status
   */
  async getRuntimeStatus(): Promise<RuntimeStatus> {
    try {
      const response = await this.makeRequest('/status');
      return response;
    } catch (error) {
      console.warn('Failed to fetch runtime status:', error);
      return {
        agent: { id: 'unknown', status: 'unknown', uptime: 0 },
        extensions: { loaded: 0, active: 0 },
        memory: { used: 0, total: 0 },
        runtime: { agents: 0, isRunning: false, eventBus: { events: 0 } },
      };
    }
  }

  /**
   * Get runtime capabilities (from the actual runtime, not the API extension)
   */
  async getRuntimeCapabilities(): Promise<RuntimeCapabilities | null> {
    try {
      // This would need to be implemented in the runtime to expose capabilities
      // For now, we'll attempt to get basic info and construct a response
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
    } catch (error) {
      console.warn('Failed to fetch runtime capabilities:', error);
      return null;
    }
  }

  /**
   * Get recent events/activity
   */
  async getRecentEvents(limit: number = 20): Promise<ActivityEvent[]> {
    try {
      // For now, we'll simulate some events since the runtime doesn't expose this directly
      // In a real implementation, this would come from the runtime's event system
      const status = await this.getRuntimeStatus();
      const agents = await this.getAgents();

      const events: ActivityEvent[] = [];

      // Add agent status events
      agents.forEach((agent) => {
        if (agent.status === 'active') {
          events.push({
            timestamp: new Date().toLocaleTimeString(),
            type: 'agent_active',
            source: agent.id,
            data: { agentName: agent.name },
          });
        }
      });

      // Add system events
      if (status.runtime.isRunning) {
        events.push({
          timestamp: new Date().toLocaleTimeString(),
          type: 'runtime_status',
          source: 'system',
          data: { status: 'running', agents: status.runtime.agents },
        });
      }

      return events.slice(0, limit);
    } catch (error) {
      console.warn('Failed to fetch recent events:', error);
      return [];
    }
  }

  /**
   * Get individual agent details
   */
  async getAgent(agentId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/api/agent/${agentId}`);
      return response;
    } catch (error) {
      console.warn(`Failed to fetch agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed agent information (alias for getAgent)
   */
  async getAgentDetail(agentId: string): Promise<any> {
    return this.getAgent(agentId);
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/agents/${agentId}/start`, 'POST');
      return true;
    } catch (error) {
      console.warn(`Failed to start agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/agents/${agentId}/stop`, 'POST');
      return true;
    } catch (error) {
      console.warn(`Failed to stop agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Send a chat message to an agent
   */
  async sendChatMessage(agentId: string, message: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/api/conversations`, 'POST', {
        agentId,
        userId: 'cli_user',
        title: `CLI Chat`,
      });

      if (response.conversation) {
        const chatResponse = await this.makeRequest(
          `/api/conversations/${response.conversation.id}/messages`,
          'POST',
          { message, userId: 'cli_user' }
        );
        return chatResponse;
      }

      return null;
    } catch (error) {
      console.warn(`Failed to send message to agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; error: string | null } {
    return {
      connected: this.isConnected,
      error: this.lastError,
    };
  }

  /**
   * Make an HTTP request to the runtime API with enhanced retry and error handling
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    options?: {
      skipRetry?: boolean;
      timeout?: number;
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const requestKey = `${method}:${endpoint}`;
    const timeout = options?.timeout || this.config.timeout;
    const maxAttempts = options?.skipRetry ? 1 : this.config.retryAttempts;

    // Cancel any existing request to the same endpoint
    const existingController = this.requestsInFlight.get(requestKey);
    if (existingController) {
      existingController.abort();
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      this.requestsInFlight.set(requestKey, controller);

      try {
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SYMindX-CLI/1.0.0',
            'X-Request-Priority': options?.priority || 'normal',
            'X-Request-ID': this.generateRequestId(),
          },
          ...(body && { body: JSON.stringify(body) }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        this.requestsInFlight.delete(requestKey);

        // Handle different response codes
        if (!response.ok) {
          const errorBody = await this.parseErrorResponse(response);
          const error = new Error(
            `HTTP ${response.status}: ${errorBody.message || response.statusText}`
          );
          (error as any).status = response.status;
          (error as any).details = errorBody;

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            this.lastError = error.message;
            throw error;
          }

          // Server error - will retry
          throw error;
        }

        const data = await response.json();
        this.isConnected = true;
        this.lastError = null;
        this.resetRetryBackoff(requestKey);
        return data;
      } catch (error) {
        this.requestsInFlight.delete(requestKey);
        this.isConnected = false;

        // Check if this is the last attempt
        if (attempt === maxAttempts) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              this.lastError = `Request timeout after ${timeout}ms (${endpoint})`;
              const timeoutError = new Error(this.lastError);
              (timeoutError as any).code = 'ETIMEDOUT';
              throw timeoutError;
            }

            // Check for network errors
            if (error.message.includes('fetch')) {
              this.lastError = `Network error: Unable to connect to ${this.config.apiUrl}`;
              const networkError = new Error(this.lastError);
              (networkError as any).code = 'ENETWORK';
              throw networkError;
            }

            this.lastError = error.message;
            throw error;
          }
          this.lastError = 'Unknown error occurred';
          throw new Error(this.lastError);
        }

        // Calculate retry delay with exponential backoff
        const baseDelay = this.config.retryDelay;
        const backoffMultiplier = this.getRetryBackoff(requestKey);
        const jitter = Math.random() * 200; // 0-200ms jitter
        const delay = Math.min(baseDelay * backoffMultiplier + jitter, 10000); // Max 10s

        console.debug(
          `Retrying ${requestKey} in ${Math.round(delay)}ms (attempt ${attempt}/${maxAttempts})`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.incrementRetryBackoff(requestKey);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Parse error response body safely
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      const text = await response.text();
      return { message: text || response.statusText };
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get retry backoff multiplier for exponential backoff
   */
  private getRetryBackoff(key: string): number {
    return this.retryBackoff.get(key) || 1;
  }

  /**
   * Increment retry backoff for a request
   */
  private incrementRetryBackoff(key: string): void {
    const current = this.retryBackoff.get(key) || 1;
    this.retryBackoff.set(key, Math.min(current * 2, 8)); // Max 8x backoff
  }

  /**
   * Reset retry backoff on successful request
   */
  private resetRetryBackoff(key: string): void {
    this.retryBackoff.delete(key);
  }

  /**
   * Cancel all in-flight requests
   */
  public cancelAllRequests(): void {
    for (const [_key, controller] of this.requestsInFlight) {
      controller.abort();
    }
    this.requestsInFlight.clear();
  }

  /**
   * Get runtime statistics with caching
   */
  public getStats(): {
    isConnected: boolean;
    lastError: string | null;
    connectionAttempts: number;
    requestsInFlight: number;
    lastHealthCheck: Date | null;
  } {
    return {
      isConnected: this.isConnected,
      lastError: this.lastError,
      connectionAttempts: this.connectionAttempts,
      requestsInFlight: this.requestsInFlight.size,
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}

/**
 * Create a default runtime client instance
 */
export function createRuntimeClient(
  config?: Partial<RuntimeClientConfig>
): RuntimeClient {
  return new RuntimeClient(config);
}

/**
 * Global runtime client instance
 */
export const runtimeClient = createRuntimeClient();
