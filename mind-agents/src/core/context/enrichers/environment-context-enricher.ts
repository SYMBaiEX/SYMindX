/**
 * Environment Context Enricher for SYMindX
 * 
 * This enricher adds system environment information, runtime metrics,
 * and agent status data to provide contextual awareness of the execution
 * environment and system state.
 */

import { BaseContextEnricher } from './base-enricher';
import {
  EnrichmentRequest,
  EnvironmentEnrichmentData,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import { Agent } from '../../../types/agent';
import { OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Configuration specific to environment enrichment
 */
export interface EnvironmentEnricherConfig {
  includeSystemMetrics: boolean;
  includeProcessInfo: boolean;
  includeAgentStatus: boolean;
  includeRuntimeStats: boolean;
  metricsCacheMs: number; // Cache metrics for this duration
}

/**
 * Environment Context Enricher
 * 
 * Enriches context with system and runtime environment information,
 * providing agents with awareness of their execution context.
 */
export class EnvironmentContextEnricher extends BaseContextEnricher {
  private enricherConfig: EnvironmentEnricherConfig;
  private agentProvider: () => Agent | null;
  private metricsCache: {
    data: EnvironmentEnrichmentData | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  constructor(
    agentProvider: () => Agent | null,
    config: Partial<EnvironmentEnricherConfig> = {}
  ) {
    super(
      'environment-context-enricher',
      'Environment Context Enricher',
      '1.0.0',
      {
        enabled: true,
        priority: EnrichmentPriority.MEDIUM,
        stage: EnrichmentStage.PRE_PROCESSING,
        timeout: 1000,
        maxRetries: 2,
        cacheEnabled: true,
        cacheTtl: 60, // 1 minute cache for environment data
        dependsOn: [],
      }
    );

    this.agentProvider = agentProvider;
    
    // Default environment enricher configuration
    this.enricherConfig = {
      includeSystemMetrics: true,
      includeProcessInfo: true,
      includeAgentStatus: true,
      includeRuntimeStats: true,
      metricsCacheMs: 30000, // 30 seconds
      ...config,
    };
  }

  /**
   * Get the keys this enricher provides
   */
  getProvidedKeys(): string[] {
    return [
      'environmentContext',
      'systemInfo',
      'agentInfo',
      'runtimeInfo',
      'performanceMetrics',
    ];
  }

  /**
   * Get the keys this enricher requires
   */
  getRequiredKeys(): string[] {
    return []; // Environment enricher doesn't depend on other enrichers
  }

  /**
   * Perform environment enricher initialization
   */
  protected async doInitialize(): Promise<OperationResult> {
    try {
      // Test agent provider
      const agent = this.agentProvider();
      
      this.log('info', 'Environment context enricher initialized', {
        agentAvailable: agent !== null,
        configuration: this.enricherConfig,
      });

      return {
        success: true,
        message: 'Environment context enricher initialized successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform environment-based context enrichment
   */
  protected async doEnrich(request: EnrichmentRequest): Promise<Record<string, unknown>> {
    // Check if we can use cached metrics
    const now = Date.now();
    if (
      this.metricsCache.data &&
      (now - this.metricsCache.timestamp) < this.enricherConfig.metricsCacheMs
    ) {
      return {
        environmentContext: this.metricsCache.data,
        ...this.flattenEnvironmentData(this.metricsCache.data),
      };
    }

    // Gather fresh environment data
    const environmentData = await this.gatherEnvironmentData(request.agentId);
    
    // Update cache
    this.metricsCache = {
      data: environmentData,
      timestamp: now,
    };

    return {
      environmentContext: environmentData,
      ...this.flattenEnvironmentData(environmentData),
    };
  }

  /**
   * Check if this enricher can process the given context
   */
  protected doCanEnrich(context: Context): boolean {
    // Environment enricher can work with any context
    return true;
  }

  /**
   * Perform environment enricher health check
   */
  protected async doHealthCheck(): Promise<OperationResult> {
    try {
      // Test system metrics collection
      const systemInfo = this.collectSystemInfo();
      const hasSystemInfo = Object.keys(systemInfo).length > 0;

      // Test agent provider
      const agent = this.agentProvider();
      
      return {
        success: true,
        message: 'Environment context enricher is healthy',
        metadata: {
          systemInfoAvailable: hasSystemInfo,
          agentProviderWorking: agent !== null,
          cacheStatus: {
            hasCache: this.metricsCache.data !== null,
            cacheAge: Date.now() - this.metricsCache.timestamp,
          },
          configuration: this.enricherConfig,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clean up environment enricher resources
   */
  protected async doDispose(): Promise<OperationResult> {
    try {
      // Clear metrics cache
      this.metricsCache = { data: null, timestamp: 0 };
      
      return {
        success: true,
        message: 'Environment context enricher disposed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Private helper methods

  /**
   * Gather comprehensive environment data
   */
  private async gatherEnvironmentData(agentId: string): Promise<EnvironmentEnrichmentData> {
    const environmentData: EnvironmentEnrichmentData = {
      systemInfo: {
        platform: '',
        nodeVersion: '',
        memoryUsage: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
        uptime: 0,
      },
      agentInfo: {
        id: agentId,
        status: 'unknown',
        lastActivity: new Date(),
        activeModules: [],
      },
      runtimeInfo: {
        timestamp: new Date(),
        sessionId: this.generateSessionId(),
        requestId: this.generateRequestId(),
      },
    };

    // Collect system information
    if (this.enricherConfig.includeSystemMetrics) {
      environmentData.systemInfo = this.collectSystemInfo();
    }

    // Collect agent information
    if (this.enricherConfig.includeAgentStatus) {
      environmentData.agentInfo = await this.collectAgentInfo(agentId);
    }

    // Collect runtime information
    if (this.enricherConfig.includeRuntimeStats) {
      environmentData.runtimeInfo = this.collectRuntimeInfo();
    }

    return environmentData;
  }

  /**
   * Collect system information and metrics
   */
  private collectSystemInfo(): EnvironmentEnrichmentData['systemInfo'] {
    try {
      const memoryUsage = process.memoryUsage();
      
      return {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers || 0,
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      this.log('warn', 'Failed to collect system info', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        platform: 'unknown',
        nodeVersion: 'unknown',
        memoryUsage: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
        uptime: 0,
      };
    }
  }

  /**
   * Collect agent-specific information
   */
  private async collectAgentInfo(agentId: string): Promise<EnvironmentEnrichmentData['agentInfo']> {
    try {
      const agent = this.agentProvider();
      
      if (!agent) {
        return {
          id: agentId,
          status: 'not_found',
          lastActivity: new Date(),
          activeModules: [],
        };
      }

      // Extract agent status and activity information
      const agentInfo: EnvironmentEnrichmentData['agentInfo'] = {
        id: agent.id,
        status: this.getAgentStatusString(agent),
        lastActivity: this.getLastActivity(agent),
        activeModules: this.getActiveModules(agent),
      };

      return agentInfo;
    } catch (error) {
      this.log('warn', 'Failed to collect agent info', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        id: agentId,
        status: 'error',
        lastActivity: new Date(),
        activeModules: [],
      };
    }
  }

  /**
   * Collect runtime information
   */
  private collectRuntimeInfo(): EnvironmentEnrichmentData['runtimeInfo'] {
    return {
      timestamp: new Date(),
      sessionId: this.generateSessionId(),
      requestId: this.generateRequestId(),
    };
  }

  /**
   * Get agent status as string
   */
  private getAgentStatusString(agent: Agent): string {
    // This would depend on your agent status enum/type
    // Adapting to match the expected agent structure
    if ('status' in agent && typeof agent.status === 'string') {
      return agent.status;
    }
    
    if ('state' in agent && typeof agent.state === 'object' && agent.state !== null) {
      return 'active'; // Assume active if state exists
    }
    
    return 'unknown';
  }

  /**
   * Get last activity timestamp from agent
   */
  private getLastActivity(agent: Agent): Date {
    // Try to extract last activity from agent metadata or state
    if ('lastActivity' in agent && agent.lastActivity instanceof Date) {
      return agent.lastActivity;
    }
    
    if ('state' in agent && typeof agent.state === 'object' && agent.state !== null) {
      const state = agent.state as any;
      if (state.lastActivity instanceof Date) {
        return state.lastActivity;
      }
      if (state.timestamp instanceof Date) {
        return state.timestamp;
      }
    }
    
    // Default to current time if no last activity found
    return new Date();
  }

  /**
   * Get active modules from agent
   */
  private getActiveModules(agent: Agent): string[] {
    const modules: string[] = [];
    
    try {
      // Check for various module types that might be active
      if ('extensions' in agent && Array.isArray(agent.extensions)) {
        modules.push(...agent.extensions.map(ext => `extension:${ext.id || 'unknown'}`));
      }
      
      if ('memory' in agent && agent.memory) {
        modules.push('memory');
      }
      
      if ('emotion' in agent && agent.emotion) {
        modules.push('emotion');
      }
      
      if ('cognition' in agent && agent.cognition) {
        modules.push('cognition');
      }
      
      if ('portals' in agent && agent.portals) {
        modules.push('portals');
      }
    } catch (error) {
      this.log('debug', 'Error extracting active modules', {
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    return modules;
  }

  /**
   * Generate a session ID for the current runtime session
   */
  private generateSessionId(): string {
    // In a real implementation, this might be managed by the runtime
    // For now, generate a simple session ID based on process start time
    const startTime = Date.now() - (process.uptime() * 1000);
    return `session_${Math.floor(startTime / 1000)}`;
  }

  /**
   * Generate a request ID for this specific enrichment request
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flatten environment data for direct context access
   */
  private flattenEnvironmentData(data: EnvironmentEnrichmentData): Record<string, unknown> {
    return {
      systemInfo: data.systemInfo,
      agentInfo: data.agentInfo,
      runtimeInfo: data.runtimeInfo,
      performanceMetrics: {
        memoryUsage: data.systemInfo.memoryUsage,
        uptime: data.systemInfo.uptime,
        platform: data.systemInfo.platform,
      },
    };
  }

  /**
   * Calculate confidence score for environment enrichment
   */
  protected calculateConfidence(context: Context, enrichedData: Record<string, unknown>): number {
    const environmentData = enrichedData.environmentContext as EnvironmentEnrichmentData;
    
    if (!environmentData) {
      return 0.1;
    }

    let confidenceScore = 0.5; // Base confidence
    
    // Increase confidence based on data availability
    if (environmentData.systemInfo.platform !== 'unknown') {
      confidenceScore += 0.2;
    }
    
    if (environmentData.agentInfo.status !== 'unknown' && 
        environmentData.agentInfo.status !== 'not_found') {
      confidenceScore += 0.2;
    }
    
    if (environmentData.agentInfo.activeModules.length > 0) {
      confidenceScore += 0.1;
    }
    
    return Math.min(0.95, confidenceScore);
  }
}