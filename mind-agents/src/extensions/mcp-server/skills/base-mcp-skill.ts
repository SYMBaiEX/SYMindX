/**
 * Base MCP Skill
 * 
 * Abstract base class for all MCP server skills
 */

import { BaseSkill, MCPServerTool, MCPServerResource, MCPServerPrompt } from '../types.js';
import { Agent } from '../../../types/agent.js';
import { runtimeLogger } from '../../../utils/logger.js';

export abstract class BaseMCPSkill implements BaseSkill {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly version: string;
  public abstract readonly category: 'communication' | 'memory' | 'emotion' | 'cognition' | 'administration' | 'diagnostics';
  
  public enabled = true;
  public dependencies?: string[] = [];
  protected agent?: Agent;
  
  constructor(public readonly config: Record<string, unknown> = {}) {}
  
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent;
    runtimeLogger.debug(`Initializing MCP skill: ${this.name}`, {
      metadata: {
        skillId: this.id,
        agentId: agent.id
      }
    });
    
    await this.onInitialize(agent);
  }
  
  async cleanup(): Promise<void> {
    runtimeLogger.debug(`Cleaning up MCP skill: ${this.name}`, {
      metadata: {
        skillId: this.id
      }
    });
    
    await this.onCleanup();
    delete this.agent;
  }
  
  async isHealthy(): Promise<boolean> {
    return this.enabled && !!this.agent;
  }
  
  // Skills can override these to provide their functionality
  async getTools(): Promise<MCPServerTool[]> {
    return [];
  }
  
  async getResources(): Promise<MCPServerResource[]> {
    return [];
  }
  
  async getPrompts(): Promise<MCPServerPrompt[]> {
    return [];
  }
  
  // Abstract methods for subclasses to implement
  protected abstract onInitialize(agent: Agent): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  
  // Helper method to ensure agent is available
  protected ensureAgent(): Agent {
    if (!this.agent) {
      throw new Error(`${this.name} skill not initialized`);
    }
    return this.agent;
  }
}