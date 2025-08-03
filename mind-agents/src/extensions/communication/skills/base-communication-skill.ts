/**
 * Base class for all Communication skills
 * Provides common functionality and structure for communication-related skills
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';

export interface CommunicationSkillConfig {
  name: string;
  description: string;
  enabled?: boolean;
}

export abstract class BaseCommunicationSkill {
  protected agent?: Agent;
  protected config: CommunicationSkillConfig;

  constructor(config: CommunicationSkillConfig) {
    this.config = {
      enabled: true,
      ...config
    };
  }

  /**
   * Initialize the skill with an agent
   */
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent;
    runtimeLogger.info(`🎯 Initialized ${this.config.name} skill`);
  }

  /**
   * Get all actions provided by this skill
   */
  abstract getActions(): ExtensionAction[];

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    runtimeLogger.info(`🧹 Cleaned up ${this.config.name} skill`);
  }

  /**
   * Helper method to create standardized actions
   */
  protected createAction(
    name: string,
    description: string,
    category: ActionCategory,
    parameters: Record<string, any>,
    handler: (agent: Agent, params: any) => Promise<any>
  ): ExtensionAction {
    return {
      name,
      description,
      category,
      parameters,
      execute: async (agent: Agent, params: any) => {
        try {
          const result = await handler(agent, params);
          return {
            success: true,
            type: 'success' as const,
            result,
            timestamp: new Date()
          };
        } catch (error) {
          runtimeLogger.error(`❌ Error in ${name} action:`, error);
          return {
            success: false,
            type: 'error' as const,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          };
        }
      }
    };
  }

  /**
   * Check if skill is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  /**
   * Update skill configuration
   */
  updateConfig(updates: Partial<CommunicationSkillConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}