/**
 * Enhanced Runtime Client for SYMindX CLI
 * Provides direct runtime integration with API fallback
 */

import { SYMindXRuntime, RuntimeConfig } from '../../core/runtime';
import { Agent, AgentConfig } from '../../types/agent';
import { EventEmitter } from 'events';

export interface RuntimeClientConfig {
  mode: 'direct' | 'api' | 'hybrid';
  apiUrl?: string;
  runtimeConfig?: RuntimeConfig;
  autoConnect?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ConnectionStatus {
  mode: 'direct' | 'api' | 'offline';
  connected: boolean;
  latency: number;
  lastError?: Error;
  runtimeVersion?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type?: string;
  emotion?: string;
  memoryProvider?: string;
  extensions?: string[];
  uptime?: number;
  lastActivity?: Date;
}

export interface SystemMetrics {
  uptime: number;
  agents: AgentInfo[];
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  eventCount: number;
}

export class RuntimeClient extends EventEmitter {
  private runtime?: SYMindXRuntime;
  private config: RuntimeClientConfig;
  private connectionStatus: ConnectionStatus;
  private apiClient?: APIClient;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: RuntimeClientConfig) {
    super();
    this.config = {
      mode: 'hybrid',
      autoConnect: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
    
    this.connectionStatus = {
      mode: 'offline',
      connected: false,
      latency: 0,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  async connect(): Promise<boolean> {
    try {
      // Try direct runtime first
      if (this.config.mode === 'direct' || this.config.mode === 'hybrid') {
        const success = await this.initializeDirectRuntime();
        if (success) {
          this.connectionStatus.mode = 'direct';
          this.connectionStatus.connected = true;
          this.emit('connected', { mode: 'direct' });
          return true;
        }
      }

      // Fallback to API
      if (this.config.mode === 'api' || this.config.mode === 'hybrid') {
        const success = await this.initializeAPIClient();
        if (success) {
          this.connectionStatus.mode = 'api';
          this.connectionStatus.connected = true;
          this.emit('connected', { mode: 'api' });
          return true;
        }
      }

      this.connectionStatus.connected = false;
      this.emit('error', new Error('Failed to connect to runtime'));
      return false;
    } catch (error) {
      this.connectionStatus.lastError = error as Error;
      this.connectionStatus.connected = false;
      this.emit('error', error);
      return false;
    }
  }

  private async initializeDirectRuntime(): Promise<boolean> {
    try {
      if (!this.config.runtimeConfig) {
        throw new Error('Runtime config required for direct mode');
      }

      this.runtime = new SYMindXRuntime(this.config.runtimeConfig);
      await this.runtime.initialize();
      await this.runtime.start();

      // Set up event listeners
      this.runtime.eventBus.on('agent:started', (data) => {
        this.emit('agent:started', data);
      });

      this.runtime.eventBus.on('agent:stopped', (data) => {
        this.emit('agent:stopped', data);
      });

      this.runtime.eventBus.on('agent:error', (data) => {
        this.emit('agent:error', data);
      });

      return true;
    } catch (error) {
      console.warn('Direct runtime initialization failed:', error);
      return false;
    }
  }

  private async initializeAPIClient(): Promise<boolean> {
    try {
      if (!this.config.apiUrl) {
        throw new Error('API URL required for API mode');
      }

      this.apiClient = new APIClient(this.config.apiUrl);
      const isConnected = await this.apiClient.testConnection();
      
      if (isConnected) {
        // Set up WebSocket connection for real-time updates
        await this.apiClient.connectWebSocket();
        this.apiClient.on('agent:update', (data) => {
          this.emit('agent:update', data);
        });
      }

      return isConnected;
    } catch (error) {
      console.warn('API client initialization failed:', error);
      return false;
    }
  }

  // Agent Management
  async getAgents(): Promise<AgentInfo[]> {
    if (this.runtime) {
      return this.getAgentsFromRuntime();
    } else if (this.apiClient) {
      return this.apiClient.getAgents();
    }
    throw new Error('No runtime connection available');
  }

  private async getAgentsFromRuntime(): Promise<AgentInfo[]> {
    if (!this.runtime) throw new Error('Runtime not available');
    
    const agents: AgentInfo[] = [];
    
    // Get active agents
    for (const [id, agent] of this.runtime.agents) {
      agents.push({
        id,
        name: agent.config.name || id,
        status: agent.status,
        type: agent.config.type,
        emotion: agent.emotion?.currentEmotion,
        memoryProvider: agent.memory?.provider?.type,
        extensions: Array.from(agent.extensions.keys()),
        uptime: Date.now() - agent.startTime,
        lastActivity: agent.lastActivity,
      });
    }

    // Get lazy agents
    for (const [id, lazyAgent] of this.runtime.lazyAgents) {
      agents.push({
        id,
        name: lazyAgent.config.name || id,
        status: lazyAgent.status,
        type: lazyAgent.config.type,
        emotion: lazyAgent.emotion?.currentEmotion,
        memoryProvider: lazyAgent.memory?.provider?.type,
        extensions: Array.from(lazyAgent.extensions.keys()),
      });
    }

    return agents;
  }

  async startAgent(agentId: string): Promise<boolean> {
    if (this.runtime) {
      try {
        const agent = await this.runtime.activateAgent(agentId);
        return agent.status === 'active';
      } catch (error) {
        console.error('Failed to start agent via runtime:', error);
        return false;
      }
    } else if (this.apiClient) {
      return this.apiClient.startAgent(agentId);
    }
    return false;
  }

  async stopAgent(agentId: string): Promise<boolean> {
    if (this.runtime) {
      try {
        await this.runtime.deactivateAgent(agentId);
        return true;
      } catch (error) {
        console.error('Failed to stop agent via runtime:', error);
        return false;
      }
    } else if (this.apiClient) {
      return this.apiClient.stopAgent(agentId);
    }
    return false;
  }

  async createAgent(config: AgentConfig): Promise<string> {
    if (this.runtime) {
      try {
        const agentId = await this.runtime.createAgent(config);
        return agentId;
      } catch (error) {
        console.error('Failed to create agent via runtime:', error);
        throw error;
      }
    } else if (this.apiClient) {
      return this.apiClient.createAgent(config);
    }
    throw new Error('No runtime connection available');
  }

  async sendMessage(agentId: string, message: string): Promise<any> {
    if (this.runtime) {
      const agent = this.runtime.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Create a chat event
      const event = {
        type: 'chat',
        source: 'cli',
        data: { message, userId: 'cli-user' },
        timestamp: new Date(),
      };

      const result = await agent.processEvent(event);
      return result;
    } else if (this.apiClient) {
      return this.apiClient.sendMessage(agentId, message);
    }
    throw new Error('No runtime connection available');
  }

  // System Information
  async getSystemMetrics(): Promise<SystemMetrics> {
    if (this.runtime) {
      const stats = this.runtime.getStats();
      const agents = await this.getAgents();
      
      return {
        uptime: Date.now() - (this.runtime.startTime || Date.now()),
        agents,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0, // Would need to implement CPU monitoring
        activeConnections: this.runtime.agents.size,
        eventCount: stats.eventCount || 0,
      };
    } else if (this.apiClient) {
      return this.apiClient.getSystemMetrics();
    }
    throw new Error('No runtime connection available');
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.runtime) {
      await this.runtime.stop();
    }
    
    if (this.apiClient) {
      this.apiClient.disconnect();
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.connectionStatus.connected = false;
    this.emit('disconnected');
  }

  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

// API Client for HTTP-based communication
class APIClient extends EventEmitter {
  private baseUrl: string;
  private ws?: WebSocket;

  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async connectWebSocket(): Promise<void> {
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  }

  async getAgents(): Promise<AgentInfo[]> {
    const response = await fetch(`${this.baseUrl}/agents`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    const data = await response.json();
    return data.agents || [];
  }

  async startAgent(agentId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/start`, {
      method: 'POST',
    });
    return response.ok;
  }

  async stopAgent(agentId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/stop`, {
      method: 'POST',
    });
    return response.ok;
  }

  async createAgent(config: AgentConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) throw new Error('Failed to create agent');
    const data = await response.json();
    return data.agentId;
  }

  async sendMessage(agentId: string, message: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message }),
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await fetch(`${this.baseUrl}/api/metrics`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export function createRuntimeClient(config: RuntimeClientConfig): RuntimeClient {
  return new RuntimeClient(config);
}
