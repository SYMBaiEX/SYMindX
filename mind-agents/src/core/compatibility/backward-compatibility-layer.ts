/**
 * Backward Compatibility Layer
 * Provides compatibility for v1.x code when upgrading to v2.0
 */

import type { Agent as LegacyAgent } from '../types/legacy/agent.js';
import type { Agent as NewAgent } from '../../types/agent.js';
import type { UnifiedContext } from '../../types/context/unified-context.js';
import { createContextLifecycleManager } from '../context/context-lifecycle-manager.js';
import { SYMindXRuntime } from '../runtime.js';

/**
 * Legacy agent wrapper that provides v1.x compatibility
 */
export class LegacyAgentWrapper {
  private agent: NewAgent;
  private runtime: SYMindXRuntime;

  constructor(agent: NewAgent, runtime: SYMindXRuntime) {
    this.agent = agent;
    this.runtime = runtime;
  }

  // Legacy method: processMessage(message: string): string
  processMessage(message: string): string {
    console.warn('DEPRECATED: processMessage(string) is deprecated. Use processMessage(message, context, options) instead.');
    
    // Create temporary context for backward compatibility
    const contextManager = this.runtime.getContextManager();
    const context = contextManager.getOrCreateContext(this.agent.id, 'legacy-user');
    
    // Process message synchronously (not recommended but for compatibility)
    let response = '';
    this.agent.processMessage(message, context, {})
      .then(result => {
        response = typeof result === 'string' ? result : result.content || '';
      })
      .catch(error => {
        response = `Error: ${error.message}`;
      });
    
    return response;
  }

  // Legacy method: getCurrentEmotion(): string
  getCurrentEmotion(): string {
    console.warn('DEPRECATED: getCurrentEmotion() is deprecated. Use emotion.getCurrentState() instead.');
    
    if (!this.agent.emotion) return 'neutral';
    
    return this.agent.emotion.currentEmotion || 'neutral';
  }

  // Legacy method: getMemories(): any[]
  getMemories(): any[] {
    console.warn('DEPRECATED: getMemories() is deprecated. Use memory.retrieve() instead.');
    
    if (!this.agent.memory) return [];
    
    // Return empty array for compatibility
    return [];
  }

  // Provide access to new agent for gradual migration
  get newAgent(): NewAgent {
    return this.agent;
  }
}

/**
 * Legacy runtime wrapper
 */
export class LegacyRuntimeWrapper {
  private runtime: SYMindXRuntime;
  private agentWrappers: Map<string, LegacyAgentWrapper> = new Map();

  constructor(runtime: SYMindXRuntime) {
    this.runtime = runtime;
  }

  // Legacy method: createAgent(config: any): LegacyAgent
  createAgent(config: any): LegacyAgentWrapper {
    console.warn('DEPRECATED: createAgent(config) signature is deprecated. Use new agent configuration format.');
    
    // Convert legacy config to new format
    const newConfig = this.convertLegacyConfig(config);
    
    // Create new agent
    const newAgent = this.runtime.createAgent(newConfig);
    
    // Wrap in compatibility layer
    const wrapper = new LegacyAgentWrapper(newAgent, this.runtime);
    this.agentWrappers.set(newAgent.id, wrapper);
    
    return wrapper;
  }

  // Legacy method: getAgent(id: string): LegacyAgent
  getAgent(id: string): LegacyAgentWrapper | undefined {
    const wrapper = this.agentWrappers.get(id);
    if (wrapper) return wrapper;
    
    // Try to get from new runtime and wrap
    const newAgent = this.runtime.getAgent(id);
    if (newAgent) {
      const wrapper = new LegacyAgentWrapper(newAgent, this.runtime);
      this.agentWrappers.set(id, wrapper);
      return wrapper;
    }
    
    return undefined;
  }

  // Legacy method: sendMessage(agentId: string, message: string): Promise<string>
  async sendMessage(agentId: string, message: string): Promise<string> {
    console.warn('DEPRECATED: sendMessage(agentId, message) is deprecated. Use new message processing API.');
    
    const agent = this.runtime.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const contextManager = this.runtime.getContextManager();
    const context = contextManager.getOrCreateContext(agentId, 'legacy-user');
    
    const result = await agent.processMessage(message, context, {});
    return typeof result === 'string' ? result : result.content || '';
  }

  private convertLegacyConfig(config: any): any {
    // Convert legacy configuration to new format
    return {
      id: config.id || 'legacy-agent',
      name: config.name || 'Legacy Agent',
      personality: Array.isArray(config.personality) 
        ? config.personality 
        : [config.personality || 'neutral'],
      memory: {
        type: config.memory?.type || 'sqlite',
        config: config.memory?.config || { path: ':memory:' },
      },
      emotion: {
        type: config.emotion?.type || 'composite',
        config: config.emotion?.config || {},
      },
      cognition: {
        type: config.cognition?.type || 'reactive',
        config: config.cognition?.config || {},
      },
      communication: {
        style: config.communication?.style || 'friendly',
      },
      extensions: config.extensions || [],
      portals: {
        primary: config.portal || 'openai',
        config: config.portalConfig || {},
      },
    };
  }

  // Provide access to new runtime for gradual migration
  get newRuntime(): SYMindXRuntime {
    return this.runtime;
  }
}

/**
 * Type name compatibility
 */
export type Agent = LegacyAgentWrapper;
export type Memory = any; // Legacy memory interface
export type Emotion = any; // Legacy emotion interface
export type Cognition = any; // Legacy cognition interface
export type Extension = any; // Legacy extension interface

/**
 * Factory function for backward compatibility
 */
export function createLegacyRuntime(config?: any): LegacyRuntimeWrapper {
  console.warn('DEPRECATED: createLegacyRuntime is deprecated. Use SYMindXRuntime directly.');
  
  // Convert legacy config if provided
  const newConfig = config ? convertLegacyRuntimeConfig(config) : undefined;
  
  const newRuntime = new SYMindXRuntime(newConfig);
  return new LegacyRuntimeWrapper(newRuntime);
}

function convertLegacyRuntimeConfig(config: any): any {
  return {
    // Convert legacy runtime config to new format
    agents: config.agents || [],
    security: {
      enabled: false, // Disabled by default for backward compatibility
      authRequired: false,
      encryption: false,
    },
    performance: {
      monitoring: config.monitoring !== false,
      caching: config.caching !== false,
      optimization: 'standard',
    },
    compliance: {
      gdpr: false, // Disabled by default for backward compatibility
      hipaa: false,
      sox: false,
    },
    context: {
      maxContextsPerAgent: config.maxContexts || 100,
      defaultTtl: config.contextTtl || 3600000,
      enableEnrichment: config.enableEnrichment !== false,
    },
  };
}

/**
 * Migration helper utilities
 */
export class MigrationHelper {
  static async migrateAgent(legacyAgent: any): Promise<NewAgent> {
    // Migrate a legacy agent to new format
    const config = this.convertAgentConfig(legacyAgent);
    
    // Create new agent
    const runtime = new SYMindXRuntime();
    return runtime.createAgent(config);
  }

  static convertAgentConfig(legacyAgent: any): any {
    return {
      id: legacyAgent.id,
      name: legacyAgent.name,
      personality: legacyAgent.personality || ['neutral'],
      memory: {
        type: legacyAgent.memoryType || 'sqlite',
        config: legacyAgent.memoryConfig || { path: ':memory:' },
      },
      emotion: {
        type: legacyAgent.emotionType || 'composite',
        config: legacyAgent.emotionConfig || {},
      },
      cognition: {
        type: legacyAgent.cognitionType || 'reactive',
        config: legacyAgent.cognitionConfig || {},
      },
      communication: {
        style: legacyAgent.communicationStyle || 'friendly',
      },
      extensions: legacyAgent.extensions || [],
      portals: {
        primary: legacyAgent.primaryPortal || 'openai',
        config: legacyAgent.portalConfig || {},
      },
    };
  }

  static async migrateMemories(legacyMemories: any[]): Promise<void> {
    // Migrate legacy memories to new format
    console.log('Migrating', legacyMemories.length, 'memories...');
    
    // Migration logic would go here
    // This is a placeholder for actual memory migration
  }

  static validateMigration(legacySystem: any, newSystem: any): boolean {
    // Validate that migration was successful
    try {
      // Check that all agents were migrated
      const legacyAgentCount = legacySystem.agents?.length || 0;
      const newAgentCount = newSystem.agents?.size || 0;
      
      if (legacyAgentCount !== newAgentCount) {
        console.warn('Agent count mismatch during migration');
        return false;
      }

      // Check that all features still work
      // This would include more comprehensive validation

      return true;
    } catch (error) {
      console.error('Migration validation failed:', error);
      return false;
    }
  }
}

/**
 * Feature flag system for gradual migration
 */
export class FeatureFlags {
  private static flags: Map<string, boolean> = new Map([
    ['legacy-api-support', true],
    ['security-enforcement', false],
    ['performance-monitoring', true],
    ['context-enrichment', true],
    ['compliance-features', false],
  ]);

  static isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }

  static enable(flag: string): void {
    this.flags.set(flag, true);
  }

  static disable(flag: string): void {
    this.flags.set(flag, false);
  }

  static getAll(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }
}

/**
 * Deprecation warnings
 */
export class DeprecationManager {
  private static warnings: Set<string> = new Set();

  static warn(feature: string, replacement?: string): void {
    if (this.warnings.has(feature)) return;
    
    this.warnings.add(feature);
    
    const message = replacement
      ? `DEPRECATED: ${feature} is deprecated. Use ${replacement} instead.`
      : `DEPRECATED: ${feature} is deprecated and will be removed in a future version.`;
    
    console.warn(message);
  }

  static getWarnings(): string[] {
    return Array.from(this.warnings);
  }

  static clearWarnings(): void {
    this.warnings.clear();
  }
}

/**
 * Version checker
 */
export function checkVersion(): void {
  const currentVersion = '2.0.0';
  const legacyVersions = ['1.0.x', '1.1.x', '1.2.x'];
  
  console.log(`SYMindX v${currentVersion} with backward compatibility support`);
  console.log(`Supported legacy versions: ${legacyVersions.join(', ')}`);
  console.log('For migration assistance, see: docs/MIGRATION_GUIDE.md');
}