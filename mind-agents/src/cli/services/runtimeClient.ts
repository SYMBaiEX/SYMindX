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

  constructor(config: Partial<RuntimeClientConfig> = {}) {
    this.config = {
      apiUrl: process.env.SYMINDX_API_URL || 'http://localhost:8000',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Check if the runtime is available
   */
  async isRuntimeAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health');
      this.isConnected = response.status === 'healthy';
      this.lastError = null;
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Get all agents
   */
  async getAgents(): Promise<AgentInfo[]> {
    try {
      const response = await this.makeRequest('/agents');
      return response.agents || [];
    } catch (error) {
      console.warn('Failed to fetch agents:', error);
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
        portalRequests: 0
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
        runtime: { agents: 0, isRunning: false, eventBus: { events: 0 } }
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
          tickInterval: 1000
        },
        agents: {
          active: agents.filter(a => a.status === 'active').length,
          lazy: 0,
          total: agents.length,
          activeList: agents.filter(a => a.status === 'active').map(a => a.id)
        },
        modules: {
          memory: { available: ['sqlite', 'postgres', 'supabase', 'neon'] },
          emotion: { available: ['composite', 'happy', 'sad', 'angry', 'anxious', 'confident', 'neutral'] },
          cognition: { available: ['htn_planner', 'reactive', 'hybrid'] },
          portals: {
            available: ['openai', 'anthropic', 'groq', 'xai', 'google-generative', 'ollama'],
            factories: ['openai', 'anthropic', 'groq']
          }
        },
        extensions: {
          loaded: ['api', 'telegram', 'slack']
        }
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
      agents.forEach(agent => {
        if (agent.status === 'active') {
          events.push({
            timestamp: new Date().toLocaleTimeString(),
            type: 'agent_active',
            source: agent.id,
            data: { agentName: agent.name }
          });
        }
      });
      
      // Add system events
      if (status.runtime.isRunning) {
        events.push({
          timestamp: new Date().toLocaleTimeString(),
          type: 'runtime_status',
          source: 'system',
          data: { status: 'running', agents: status.runtime.agents }
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
        title: `CLI Chat`
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
      error: this.lastError
    };
  }

  /**
   * Make an HTTP request to the runtime API
   */
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SYMindX-CLI/1.0.0'
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.isConnected = true;
        this.lastError = null;
        return data;
        
      } catch (error) {
        this.isConnected = false;
        
        if (attempt === this.config.retryAttempts) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              this.lastError = `Request timeout (${this.config.timeout}ms)`;
              throw new Error(this.lastError);
            }
            this.lastError = error.message;
            throw error;
          }
          this.lastError = 'Unknown error';
          throw new Error(this.lastError);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }
  }
}

/**
 * Create a default runtime client instance
 */
export function createRuntimeClient(config?: Partial<RuntimeClientConfig>): RuntimeClient {
  return new RuntimeClient(config);
}

/**
 * Global runtime client instance
 */
export const runtimeClient = createRuntimeClient();