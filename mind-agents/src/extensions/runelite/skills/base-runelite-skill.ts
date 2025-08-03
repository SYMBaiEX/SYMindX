/**
 * Base class for all RuneLite skills
 * Provides a common interface for skill registration and management
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';

export interface RuneLiteSkillConfig {
  name: string;
  description: string;
  enabled?: boolean;
}

export abstract class BaseRuneLiteSkill {
  protected agent: Agent | undefined;
  protected enabled: boolean = true;
  
  constructor(protected config: RuneLiteSkillConfig) {
    this.enabled = config.enabled ?? true;
  }

  /**
   * Get the skill name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get the skill description
   */
  getDescription(): string {
    return this.config.description;
  }

  /**
   * Check if skill is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Initialize the skill with an agent
   */
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent;
    runtimeLogger.info(`✅ Initialized RuneLite skill: ${this.getName()}`);
  }

  /**
   * Clean up skill resources
   */
  async cleanup(): Promise<void> {
    this.agent = undefined;
    runtimeLogger.info(`🧹 Cleaned up RuneLite skill: ${this.getName()}`);
  }

  /**
   * Get actions provided by this skill
   * Skills should override this to provide their actions
   */
  abstract getActions(): ExtensionAction[];

  /**
   * Handle game events specific to this skill
   * Skills can override this to handle events
   */
  async handleGameEvent(eventType: string, eventData: any): Promise<void> {
    // Default implementation - skills can override
    void eventType;
    void eventData;
  }

  /**
   * Update skill configuration
   */
  updateConfig(updates: Partial<RuneLiteSkillConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.enabled !== undefined) {
      this.enabled = updates.enabled;
    }
  }

  /**
   * Helper to create an extension action
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
      execute: handler
    };
  }
}